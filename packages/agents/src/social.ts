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
    researchFocus:
      "fan sentiment and confidence, injury/suspension/lineup news, team morale and momentum, and the case for an upset",
    researchSystem: [
      "You are the Social agent for a World Cup match-prediction bot — you read the internet's mood.",
      "A deep-research report is provided to start from; verify and extend it with webSearch and newsSearch",
      "to gather recent fan sentiment, discussion, and injury/lineup/morale news for BOTH teams. Make several",
      "focused tool calls, varying queries per team and topic; include terms like 'fan reaction', 'forum',",
      "or 'reddit' to surface community discussion. Don't just chase the popular narrative — also search for",
      "the underdog's case and for doubts about the favourite (e.g. 'why <favourite> could struggle',",
      "'<underdog> upset'). You only read public information; you never post or act.",
    ].join(" "),
    synthesisSystem:
      "You are the Social agent. Turn the gathered chatter into a calibrated, evidence-backed read on which team the internet favours. Social signal is noisy and crowds chase favourites — weigh the minority view too and be conservative with confidence.",
    task: [
      "Investigate online sentiment and momentum for BOTH teams ahead of this match:",
      "- fan confidence and mood (community/forum discussion), including the underdog's supporters,",
      "- injury, suspension and lineup news,",
      "- any notable narratives or momentum shifts, and any reasons the favourite might underperform.",
      "Search per team, seek out contrarian takes, and combine what you find into a balanced read.",
    ].join("\n"),
  });
}
