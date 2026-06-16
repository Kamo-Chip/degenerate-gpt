import { openai } from "@ai-sdk/openai";
import {
  type AgentReport,
  DEFAULT_DECIDER_MODEL,
  type Decision,
  DecisionSchema,
  type Match,
  MAX_STAKE,
  MIN_STAKE,
  PAPER_BANKROLL,
} from "@degenerate-gpt/shared";
import { generateObject } from "ai";

/** Count how many source agents share the most common pick (agreement hint). */
function agreementSummary(reports: AgentReport[]): string {
  const tally = new Map<string, number>();
  for (const r of reports) {
    tally.set(r.pick, (tally.get(r.pick) ?? 0) + 1);
  }
  const lines = [...tally.entries()]
    .map(([pick, n]) => `${pick}: ${n}/${reports.length} agents`)
    .join("; ");
  return lines || "no reports";
}

function formatReport(r: AgentReport): string {
  const raw = r.raw ? ` raw=${JSON.stringify(r.raw)}` : "";
  return [
    `- ${r.agent.toUpperCase()} agent picks ${r.pick} (confidence ${r.confidence}).`,
    `  summary: ${r.summary}`,
    `  evidence: ${r.evidence.join(" | ")}${raw}`,
  ].join("\n");
}

function buildDeciderPrompt(match: Match, reports: AgentReport[]): string {
  return [
    `Match: ${match.teamA} vs ${match.teamB}.`,
    `Valid picks are exactly "${match.teamA}" or "${match.teamB}".`,
    "",
    "Source agent reports:",
    reports.map(formatReport).join("\n"),
    "",
    `Agreement snapshot: ${agreementSummary(reports)}.`,
    "",
    "Weigh agreement and disagreement across the agents. Produce a final pick,",
    "an overall confidence (0-1), a short rationale, a disagreementScore",
    "(low/medium/high), a simulatedStake, and a stakeReason.",
    `Stake is paper-only against a ${PAPER_BANKROLL} bankroll and must be`,
    `between ${MIN_STAKE} and ${MAX_STAKE}. Stake larger when agents agree and`,
    "confidence is high; smaller when they disagree or the signal is weak.",
  ].join("\n");
}

/**
 * Decider Agent — the actual (paper-trading) gambling bot. Unlike the source
 * agents this makes a real OpenAI call to weigh the reports and decide.
 */
export async function runDecider(
  match: Match,
  reports: AgentReport[],
): Promise<Decision> {
  if (reports.length === 0) {
    throw new Error("Decider received no agent reports.");
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_DECIDER_MODEL;

  const { object } = await generateObject({
    model: openai(model),
    schema: DecisionSchema,
    system:
      "You are a paper-trading World Cup match prediction bot. " +
      "This is PAPER ONLY — you never place real bets. " +
      "Pick exactly one of the two teams provided.",
    prompt: buildDeciderPrompt(match, reports),
  });

  // Clamp the stake defensively in case the model drifts out of bounds.
  const simulatedStake = Math.max(
    MIN_STAKE,
    Math.min(MAX_STAKE, object.simulatedStake),
  );

  return DecisionSchema.parse({ ...object, simulatedStake });
}
