import { openai } from "@ai-sdk/openai";
import {
  type AgentName,
  type AgentReport,
  AgentReportSchema,
  DEFAULT_DECIDER_MODEL,
  type Match,
  RESEARCH_MAX_STEPS,
} from "@degenerate-gpt/shared";
import { type ResearchResult, tavily } from "@degenerate-gpt/sources";
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

/**
 * Shared anti-bias guidance appended to every research + synthesis prompt. The
 * agents kept converging on the obvious favourite; this forces them to build
 * (and weigh) the case for *both* teams and to dig past popular results.
 */
const BALANCE_GUIDANCE = [
  "Be deliberately balanced. Research and build the strongest case FOR and AGAINST each team —",
  "not just whoever looks favoured. Actively seek disconfirming evidence, contrarian/minority views",
  "and primary sources; do not anchor on the first or most popular result. Explicitly consider how",
  "the underdog could win (upsets happen). Only express high confidence when the balance of evidence",
  "genuinely warrants it; for a true coin-flip, keep confidence near 0.5.",
].join(" ");

/**
 * Mandatory deep-research pass (Tavily /research). Runs on every Social/Market
 * analysis and is awaited to completion. Resilient: on failure/timeout it logs
 * and returns null so the agent still produces a report from its loop findings.
 */
async function runDeepResearch(
  match: Match,
  focus: string,
): Promise<ResearchResult | null> {
  const question = `Deeply research ${match.teamA} vs ${match.teamB}: ${focus}. Build the strongest evidence-backed case for BOTH teams, including how the underdog could win.`;
  try {
    return await tavily.research(question);
  } catch (err) {
    console.warn(
      `Deep research failed for ${match.teamA} vs ${match.teamB}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Format a deep-research report (report + sources) for inclusion in a prompt. */
function formatDeepResearch(report: ResearchResult): string {
  const sources = report.sources
    .slice(0, 10)
    .map((s) => `- ${s.title} (${s.url})`)
    .join("\n");
  return [
    "Deep research report:",
    report.content,
    sources ? `\nSources:\n${sources}` : "",
  ].join("\n");
}

/** Internal synthesis shape; mapped onto the shared AgentReport afterwards. */
const SynthesisSchema = z.object({
  caseForA: z
    .string()
    .describe("The strongest evidence-backed case for the FIRST team (teamA) winning."),
  caseForB: z
    .string()
    .describe("The strongest evidence-backed case for the SECOND team (teamB) winning."),
  pick: z
    .string()
    .describe("Exactly one of the two team names provided, chosen only after weighing both cases."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0.5 means a genuine toss-up; higher means the evidence clearly favours the pick over the counter-case.",
    ),
  summary: z.string().describe("One or two sentences."),
  evidence: z
    .array(z.string())
    .describe(
      "2-4 concrete findings drawn from the research; include at least one point that cuts against the pick.",
    ),
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
  /**
   * Short domain angle for the mandatory deep-research pass (e.g. "fan
   * sentiment, injuries and momentum"). The full balanced question is composed
   * in runResearchAgent from the match + this focus.
   */
  researchFocus: string;
}

export async function runResearchAgent(spec: ResearchSpec): Promise<AgentReport> {
  const { agent, match, tools } = spec;
  // Randomise which team is named first so prompt position can't prime the pick.
  // The valid-picks list always names both, so the choice is still unambiguous.
  const [first, second] =
    Math.random() < 0.5 ? [match.teamA, match.teamB] : [match.teamB, match.teamA];
  const matchup = `Match: ${first} vs ${second}. Valid picks are exactly "${match.teamA}" or "${match.teamB}".`;

  // Mandatory deep-research pass — awaited before the loop so its findings seed
  // every subsequent step. Resilient: null if Tavily fails/times out.
  const deep = await runDeepResearch(match, spec.researchFocus);
  const deepBlock = deep ? formatDeepResearch(deep) : "";

  // Phase 1 — agentic research loop (seeded with the deep-research report).
  const research = await generateText({
    model: model(),
    system: [spec.researchSystem, BALANCE_GUIDANCE].join(" "),
    prompt: [
      matchup,
      "",
      spec.task,
      ...(deepBlock
        ? ["", "Start from this deep-research report, then verify and extend it with your tools:", deepBlock]
        : []),
    ].join("\n"),
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

  const loopFindings = research.text.trim();

  // No evidence gathered at all (deep research failed AND the loop turned up
  // nothing) -> neutral report (orchestration still proceeds).
  if (!deep && totalToolCalls === 0 && loopFindings.length === 0) {
    return AgentReportSchema.parse({
      agent,
      pick: match.teamA,
      confidence: 0.5,
      summary: `No ${agent} signal could be gathered for ${match.teamA} vs ${match.teamB}.`,
      evidence: ["Research tools returned nothing usable."],
      raw: { toolUsage, totalToolCalls, deepResearchUsed: false },
    });
  }

  // Combine the deep-research report with the loop's findings for synthesis.
  const findings = [deepBlock, loopFindings].filter(Boolean).join("\n\n");

  // Phase 2 — synthesis into a structured report.
  const { object } = await generateObject({
    model: model(),
    schema: SynthesisSchema,
    system: [spec.synthesisSystem, BALANCE_GUIDANCE].join(" "),
    prompt: [
      `Match: ${match.teamA} vs ${match.teamB}. Valid picks are exactly "${match.teamA}" or "${match.teamB}".`,
      "",
      "Research findings to base your report on:",
      findings || "(the research loop gathered tool results but produced no summary)",
      "",
      `First build caseForA (the strongest case for ${match.teamA}) and caseForB (the strongest`,
      `case for ${match.teamB}). Only then pick one team, set a calibrated confidence, write a short`,
      "summary, and give 2-4 concrete evidence bullets (at least one cutting against your pick).",
      "If the two cases are genuinely close, keep confidence near 0.5.",
    ].join("\n"),
  });

  // Surface the both-sides reasoning in the report: summary leads with the pick
  // rationale, and the steelmanned cases are preserved in `raw` for the Decider.
  const summary = `${object.summary} | Case for ${match.teamA}: ${object.caseForA} | Case for ${match.teamB}: ${object.caseForB}`;

  return AgentReportSchema.parse({
    agent,
    pick: object.pick,
    confidence: object.confidence,
    summary,
    evidence: object.evidence,
    raw: {
      toolUsage,
      totalToolCalls,
      deepResearchUsed: deep !== null,
      deepResearchSources: deep?.sources ?? [],
      caseForA: object.caseForA,
      caseForB: object.caseForB,
      findings: findings.slice(0, 2000),
    },
  });
}
