import { schemaTask } from "@trigger.dev/sdk";
import { runDecider } from "@degenerate-gpt/agents";
import { getMatch } from "@degenerate-gpt/db";
import { DeciderPayloadSchema } from "@degenerate-gpt/shared";

export const deciderAgent = schemaTask({
  id: "decider-agent",
  schema: DeciderPayloadSchema,
  run: async ({ matchId, reports }) => {
    const match = await getMatch(matchId);
    return runDecider(match, reports);
  },
});
