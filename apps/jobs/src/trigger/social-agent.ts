import { schemaTask } from "@trigger.dev/sdk";
import { runSocialAgent } from "@degenerate-gpt/agents";
import { getMatch } from "@degenerate-gpt/db";
import { AgentPayloadSchema } from "@degenerate-gpt/shared";

export const socialAgent = schemaTask({
  id: "social-agent",
  schema: AgentPayloadSchema,
  run: async ({ matchId }) => {
    const match = await getMatch(matchId);
    return runSocialAgent(match);
  },
});
