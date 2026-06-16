import { openai } from "@ai-sdk/openai";
import {
  type AgentName,
  type AgentReport,
  AgentReportSchema,
  DEFAULT_DECIDER_MODEL,
  type Match,
  RESEARCH_MAX_STEPS,
} from "@degenerate-gpt/shared";
import { generateObject, generateText, stepCountIs, type ToolSet } from "ai";
import { z } from "zod";

/**
 * Shared "deep research" loop for the agentic source agents (Social, Market).
 * Phase 1: an LLM tool-loop gathers evidence from the agent's domain tools.
 * Phase 2: a structured synthesis turns the findings into an AgentReport.
 *
 * The model only ever reads data — these agents never act on anything.
 */

function model() {
  return openai(process.env.OPENAI_MODEL ?? DEFAULT_DECIDER_MODEL);
}

/** Internal synthesis shape; mapped onto the shared AgentReport afterwards. */
const SynthesisSchema = z.object({
  pick: z.string().describe("Exactly one of the two team names provided."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0.5 means no real signal; higher means stronger evidence for the pick."),
  summary: z.string().describe("One or two sentences."),
  evidence: z
    .array(z.string())
    .describe("2-4 concrete findings drawn from the research, each citing what was observed."),
});

export interface ResearchSpec {
  agent: Extract<AgentName, "social" | "market">;
  match: Match;
  tools: ToolSet;
  /** Domain persona + guardrails for the research phase. */
  researchSystem: string;
  /** Domain persona for the synthesis phase. */
  synthesisSystem: string;
  /** What the agent should investigate (appended after the match line). */
  task: string;
}

export async function runResearchAgent(spec: ResearchSpec): Promise<AgentReport> {
  const { agent, match, tools } = spec;
  const matchup = `Match: ${match.teamA} vs ${match.teamB}. Valid picks are exactly "${match.teamA}" or "${match.teamB}".`;

  // Phase 1 — agentic research loop.
  const research = await generateText({
    model: model(),
    system: spec.researchSystem,
    prompt: [matchup, "", spec.task].join("\n"),
    tools,
    stopWhen: stepCountIs(RESEARCH_MAX_STEPS),
  });

  // Tally tool usage for transparency / verification in `raw`.
  const toolUsage: Record<string, number> = {};
  for (const step of research.steps) {
    for (const call of step.toolCalls) {
      toolUsage[call.toolName] = (toolUsage[call.toolName] ?? 0) + 1;
    }
  }
  const totalToolCalls = Object.values(toolUsage).reduce((a, b) => a + b, 0);

  const findings = research.text.trim();

  // No evidence gathered at all -> neutral report (orchestration still proceeds).
  if (totalToolCalls === 0 && findings.length === 0) {
    return AgentReportSchema.parse({
      agent,
      pick: match.teamA,
      confidence: 0.5,
      summary: `No ${agent} signal could be gathered for ${match.teamA} vs ${match.teamB}.`,
      evidence: ["Research tools returned nothing usable."],
      raw: { toolUsage, totalToolCalls },
    });
  }

  // Phase 2 — synthesis into a structured report.
  const { object } = await generateObject({
    model: model(),
    schema: SynthesisSchema,
    system: spec.synthesisSystem,
    prompt: [
      matchup,
      "",
      "Research findings to base your report on:",
      findings || "(the research loop gathered tool results but produced no summary)",
      "",
      "Produce a pick (one of the two teams), a calibrated confidence, a short summary,",
      "and 2-4 concrete evidence bullets. If the evidence is weak or mixed, keep confidence near 0.5.",
    ].join("\n"),
  });

  return AgentReportSchema.parse({
    agent,
    pick: object.pick,
    confidence: object.confidence,
    summary: object.summary,
    evidence: object.evidence,
    raw: {
      toolUsage,
      totalToolCalls,
      findings: findings.slice(0, 2000),
    },
  });
}
