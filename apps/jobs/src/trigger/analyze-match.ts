import { batch, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import {
  saveAgentReports,
  savePrediction,
  setAnalysisStatus,
  upsertAnalysis,
} from "@degenerate-gpt/db";
import {
  type AgentReport,
  AgentReportSchema,
  AnalyzeMatchPayloadSchema,
} from "@degenerate-gpt/shared";
import { marketAgent } from "./market-agent.js";
import { socialAgent } from "./social-agent.js";
import { statsAgent } from "./stats-agent.js";
import { deciderAgent } from "./decider-agent.js";

/**
 * Orchestrator. Receives a matchId (it does NOT discover matches itself), runs
 * the three source agents in parallel, persists their reports, then asks the
 * Decider for a final paper-trading verdict and persists that.
 */
export const analyzeMatch = schemaTask({
  id: "analyze-match",
  schema: AnalyzeMatchPayloadSchema,
  run: async ({ matchId, userId }, { ctx }) => {
    // This run's id groups the reports/prediction it produces and lets the web
    // UI re-subscribe to the live run after a navigation/refresh.
    const runId = ctx.run.id;

    // Per-user run status (matches are shared; analyses are private). Flip to
    // "failed" if anything below throws, "complete" once the prediction saves.
    await upsertAnalysis(userId, matchId, "running", runId);

    try {
      // Progress steps surfaced to the UI via Trigger.dev realtime metadata.
      // Each source agent flips its own key to "done" on this (parent) run as it
      // finishes — see stats/social/market-agent.ts — so the UI updates live.
      metadata.set("steps", {
        stats: "running",
        social: "running",
        market: "running",
        decide: "pending",
      });

      // 1. Run the three source agents in parallel.
      const results = await batch.triggerByTaskAndWait([
        { task: statsAgent, payload: { matchId } },
        { task: socialAgent, payload: { matchId } },
        { task: marketAgent, payload: { matchId } },
      ]);

      // Backstop the per-agent updates: mark any step that didn't report itself
      // (e.g. a failed run) based on the batch outcome.
      const sourceKeys = ["stats", "social", "market"] as const;
      results.runs.forEach((run, i) => {
        metadata.set(`$.steps.${sourceKeys[i]}`, run.ok ? "done" : "failed");
      });

      const reports: AgentReport[] = results.runs
        .filter((run) => run.ok)
        .map((run) => AgentReportSchema.parse(run.output));

      if (reports.length === 0) {
        throw new Error(`No agent reports succeeded for match ${matchId}.`);
      }
      if (reports.length < results.runs.length) {
        logger.warn(
          "Some source agents failed; proceeding with partial reports",
          { matchId, succeeded: reports.length, total: results.runs.length },
        );
      }

      // 2. Save the source reports (owned by this user, tagged with this run).
      await saveAgentReports(matchId, userId, reports, runId);

      // 3. Ask the Decider for a final verdict.
      metadata.set("$.steps.decide", "running");
      const decision = await deciderAgent.triggerAndWait({ matchId, reports });
      if (!decision.ok) {
        metadata.set("$.steps.decide", "failed");
        throw new Error(`Decider failed for match ${matchId}.`);
      }

      // 4. Save the prediction and mark the analysis complete.
      await savePrediction(matchId, userId, decision.output, runId);
      metadata.set("$.steps.decide", "done");
      await setAnalysisStatus(userId, matchId, "complete");

      logger.info("Analysis complete", {
        matchId,
        userId,
        pick: decision.output.pick,
        confidence: decision.output.confidence,
      });

      return { matchId, reports, decision: decision.output };
    } catch (err) {
      await setAnalysisStatus(userId, matchId, "failed");
      throw err;
    }
  },
});
