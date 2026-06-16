import { tasks } from "@trigger.dev/sdk";

/**
 * Thin, typed wrappers around the Trigger.dev tasks defined in apps/jobs. We
 * reference them by their string id (`discover-matches` / `analyze-match`) so
 * the web app doesn't take a build dependency on apps/jobs. Payloads are shaped
 * by the schemas in @degenerate-gpt/shared.
 *
 * Requires TRIGGER_SECRET_KEY in the environment (loaded from the repo-root .env
 * via next.config.ts).
 */

export async function triggerDiscoverMatches(competition = "WC") {
  return tasks.trigger("discover-matches", { competition });
}

export async function triggerAnalyzeMatch(matchId: string) {
  return tasks.trigger("analyze-match", { matchId });
}
