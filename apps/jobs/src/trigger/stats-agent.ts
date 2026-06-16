import { schemaTask } from "@trigger.dev/sdk";
import { runStatsAgent } from "@degenerate-gpt/agents";
import { getMatch } from "@degenerate-gpt/db";
import { AgentPayloadSchema } from "@degenerate-gpt/shared";

export const statsAgent = schemaTask({
  id: "stats-agent",
  schema: AgentPayloadSchema,
  run: async ({ matchId }) => {
    const match = await getMatch(matchId);
    return runStatsAgent(match);
  },
});
