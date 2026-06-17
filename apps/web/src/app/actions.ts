"use server";

import {
  getAnalysisState,
  getUserUsage,
  setPredictionVerdict,
  upsertAnalysis,
} from "@degenerate-gpt/db";
import { type Verdict, VerdictSchema } from "@degenerate-gpt/shared";
import { revalidatePath } from "next/cache";

import { MAX_PREDICTIONS } from "@/lib/limits";
import { requireUser } from "@/lib/session";
import { triggerAnalyzeMatch } from "@/lib/trigger";

/** Result of attempting to start an analysis. */
export type AnalyzeResult =
  | { ok: true; runId: string; accessToken: string }
  | { ok: false; error: string };

/**
 * Kick off analysis for one match, scoped to the signed-in user. Enforces the
 * per-user prediction cap *before* spending a Trigger run. On success returns the
 * run id + a public access token so the client can subscribe with useRealtimeRun.
 */
export async function analyzeMatchAction(matchId: string): Promise<AnalyzeResult> {
  const user = await requireUser();

  // Spam lock: refuse if an analysis for this match is already in flight.
  const state = await getAnalysisState(user.id, matchId);
  if (state?.status === "running") {
    return { ok: false, error: "An analysis is already running for this match." };
  }

  const { used, unlimited } = await getUserUsage(user.id);
  if (!unlimited && used >= MAX_PREDICTIONS) {
    return {
      ok: false,
      error: `You've used your ${MAX_PREDICTIONS} free predictions. Clone the repo and run it with your own keys to keep going.`,
    };
  }

  const handle = await triggerAnalyzeMatch(matchId, user.id);
  // Persist the running state immediately (before the task starts) so the UI
  // reflects it even if the user navigates away right after triggering.
  await upsertAnalysis(user.id, matchId, "running", handle.id);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  return { ok: true, runId: handle.id, accessToken: handle.publicAccessToken };
}

/**
 * Hand-grade the user's own prediction. Passing null clears the verdict (toggle
 * off). The matchId is only used to revalidate the right detail page.
 */
export async function markPredictionAction(
  predictionId: string,
  matchId: string,
  verdict: Verdict | null,
) {
  const user = await requireUser();
  const parsed = verdict === null ? null : VerdictSchema.parse(verdict);
  await setPredictionVerdict(predictionId, user.id, parsed);
  revalidatePath(`/matches/${matchId}`);
}
