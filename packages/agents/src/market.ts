import type { AgentReport, Match } from "@degenerate-gpt/shared";
import { runResearchAgent } from "./research.js";
import { marketTools } from "./tools/index.js";

/**
 * Market Agent — "reads the money". An agentic deep-research agent: it reads
 * Polymarket implied probabilities plus betting/market news to judge where the
 * money leans. READ-ONLY signal — this is paper trading and never places bets.
 */
export function runMarketAgent(match: Match): Promise<AgentReport> {
  return runResearchAgent({
    agent: "market",
    match,
    tools: marketTools,
    researchSystem: [
      "You are the Market agent for a World Cup match-prediction bot — you read the money.",
      "Use the Polymarket tool to read prediction-market implied probabilities, and web/news search",
      "for odds movement and betting context. Make several focused tool calls.",
      "IMPORTANT: this is PAPER TRADING. Market data is read-only signal only — never place or imply real bets.",
    ].join(" "),
    synthesisSystem:
      "You are the Market agent. Turn implied probabilities and market context into a calibrated, evidence-backed read on which team the money favours. Prefer markets that mention both teams; tournament-level markets are weaker, indirect signal. This is paper-only.",
    task: [
      "Investigate where the market leans for this match:",
      "- prediction-market implied probabilities for each team (Polymarket),",
      "- any odds movement or betting-related news,",
      "- how confident the market appears.",
      "Note when no direct per-match market exists and fall back to weaker signals.",
    ].join("\n"),
  });
}
