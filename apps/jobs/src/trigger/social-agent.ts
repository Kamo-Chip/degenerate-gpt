import { metadata, schemaTask } from "@trigger.dev/sdk";
import { runSocialAgent } from "@degenerate-gpt/agents";
import { getMatch } from "@degenerate-gpt/db";
import { AgentPayloadSchema } from "@degenerate-gpt/shared";

export const socialAgent = schemaTask({
  id: "social-agent",
  schema: AgentPayloadSchema,
  run: async ({ matchId }) => {
    const match = await getMatch(matchId);
    const report = await runSocialAgent(match);
    // Live progress: mark this step done on the parent (analyze-match) run.
    metadata.parent.set("$.steps.social", "done");
    return report;
  },
});
