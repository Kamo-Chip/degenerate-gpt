import type { AgentReport, Match } from "@degenerate-gpt/shared";
import { runResearchAgent } from "./research.js";
import { socialTools } from "./tools/index.js";

/**
 * Social Agent — "reads the internet". An agentic deep-research agent: it uses
 * web search and news tools to gauge fan sentiment, momentum and injury/lineup
 * buzz, then synthesizes a structured opinion.
 */
export function runSocialAgent(match: Match): Promise<AgentReport> {
  return runResearchAgent({
    agent: "social",
    match,
    tools: socialTools,
    researchSystem: [
      "You are the Social agent for a World Cup match-prediction bot — you read the internet's mood.",
      "Use webSearch and newsSearch to gather recent fan sentiment, discussion, and injury/lineup/morale news",
      "about both teams. Make several focused tool calls, varying queries per team and topic;",
      "include terms like 'fan reaction', 'forum', or 'reddit' in web queries to surface community discussion.",
      "You only read public information; you never post or act.",
    ].join(" "),
    synthesisSystem:
      "You are the Social agent. Turn the gathered chatter into a calibrated, evidence-backed read on which team the internet favours. Social signal is noisy — be conservative with confidence.",
    task: [
      "Investigate online sentiment and momentum for both teams ahead of this match:",
      "- fan confidence and mood (community/forum discussion),",
      "- injury, suspension and lineup news,",
      "- any notable narratives or momentum shifts.",
      "Search per team and combine what you find.",
    ].join("\n"),
  });
}
