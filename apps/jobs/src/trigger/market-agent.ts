import { schemaTask } from "@trigger.dev/sdk";
import { runMarketAgent } from "@degenerate-gpt/agents";
import { getMatch } from "@degenerate-gpt/db";
import { AgentPayloadSchema } from "@degenerate-gpt/shared";

export const marketAgent = schemaTask({
  id: "market-agent",
  schema: AgentPayloadSchema,
  run: async ({ matchId }) => {
    const match = await getMatch(matchId);
    return runMarketAgent(match);
  },
});
