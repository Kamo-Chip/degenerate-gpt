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

/**
 * Note where the agents diverge — framed as a prompt to scrutinise, NOT a
 * majority tally to follow. (Agents agreeing doesn't make them right; three
 * agents echoing the same favourite is weak, correlated evidence.)
 */
function divergenceNote(reports: AgentReport[]): string {
  const picks = new Set(reports.map((r) => r.pick));
  if (picks.size <= 1) {
    return "All agents landed on the same team — treat this as correlated, not confirmed; scrutinise the counter-case before trusting it.";
  }
  return `The agents are split (${[...picks].join(" vs ")}) — weigh whose evidence is actually stronger rather than counting votes.`;
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
  // Randomise listed order so prompt position can't prime the favourite.
  const [first, second] =
    Math.random() < 0.5 ? [match.teamA, match.teamB] : [match.teamB, match.teamA];
  return [
    `Match: ${first} vs ${second}.`,
    `Valid picks are exactly "${match.teamA}" or "${match.teamB}".`,
    "",
    "Source agent reports (each includes a case for both teams in its summary/raw):",
    reports.map(formatReport).join("\n"),
    "",
    divergenceNote(reports),
    "",
    "Decide for yourself. Build the strongest case for EACH team from the evidence, then pick the",
    "side the evidence genuinely favours. Do NOT back a team just because it's the favourite or",
    "because the agents agree — name the strongest counter-case and the upset scenario in your rationale.",
    "Produce a final pick, an overall confidence (0-1), a short rationale, a disagreementScore",
    "(low/medium/high), a simulatedStake, and a stakeReason.",
    `Stake is paper-only against a ${PAPER_BANKROLL} bankroll and must be`,
    `between ${MIN_STAKE} and ${MAX_STAKE}. Size the stake on your genuine, calibrated edge after`,
    "weighing both sides — larger only when truly convinced, smaller when it's close or the signal is weak.",
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
      "Pick exactly one of the two teams provided. Be balanced and calibrated: " +
      "weigh the case for both teams, resist favourite/consensus bias, and only show " +
      "high confidence when the evidence clearly warrants it.",
    prompt: buildDeciderPrompt(match, reports),
  });

  // Clamp the stake defensively in case the model drifts out of bounds.
  const simulatedStake = Math.max(
    MIN_STAKE,
    Math.min(MAX_STAKE, object.simulatedStake),
  );

  return DecisionSchema.parse({ ...object, simulatedStake });
}
