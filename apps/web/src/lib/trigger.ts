import { auth, tasks } from "@trigger.dev/sdk";

/**
 * Thin, typed wrappers around the Trigger.dev tasks defined in apps/jobs. We
 * reference them by their string id (`discover-matches` / `analyze-match`) so
 * the web app doesn't take a build dependency on apps/jobs. Payloads are shaped
 * by the schemas in @degenerate-gpt/shared.
 *
 * Requires TRIGGER_SECRET_KEY in the environment (loaded from the repo-root .env
 * via next.config.ts).
 */

export async function triggerAnalyzeMatch(matchId: string, userId: string) {
  return tasks.trigger("analyze-match", { matchId, userId });
}

/**
 * Mint a fresh public access token scoped to read a single run, so the client
 * can re-subscribe (useRealtimeRun) to an analysis that's still running after a
 * navigation or refresh. The token from the original trigger() is short-lived.
 */
export async function createRunToken(runId: string) {
  return auth.createPublicToken({
    scopes: { read: { runs: runId } },
    expirationTime: "1h",
  });
}
