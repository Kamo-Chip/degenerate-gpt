"use server";

import { setPredictionVerdict } from "@degenerate-gpt/db";
import { type Verdict, VerdictSchema } from "@degenerate-gpt/shared";
import { revalidatePath } from "next/cache";
import {
  triggerAnalyzeMatch,
  triggerDiscoverMatches,
} from "@/lib/trigger";

/** Kick off fixture discovery, then refresh the dashboard list. */
export async function discoverMatchesAction() {
  const handle = await triggerDiscoverMatches();
  revalidatePath("/");
  return { runId: handle.id };
}

/**
 * Kick off analysis for one match. Returns the run id plus a public access
 * token scoped to that run so the client can subscribe with useRealtimeRun.
 */
export async function analyzeMatchAction(matchId: string) {
  const handle = await triggerAnalyzeMatch(matchId);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  return { runId: handle.id, accessToken: handle.publicAccessToken };
}

/**
 * Hand-grade a prediction. Passing null clears the verdict (toggle off). The
 * matchId is only used to revalidate the right detail page.
 */
export async function markPredictionAction(
  predictionId: string,
  matchId: string,
  verdict: Verdict | null,
) {
  const parsed = verdict === null ? null : VerdictSchema.parse(verdict);
  await setPredictionVerdict(predictionId, parsed);
  revalidatePath(`/matches/${matchId}`);
}
