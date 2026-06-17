"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { analyzeMatchAction } from "@/app/actions";
import { AnalysisFlow, type StepStatus } from "@/components/analysis-flow";
import { Button } from "@/components/ui/button";

/**
 * Fires the analyze server action and subscribes to the Trigger.dev run with
 * useRealtimeRun, rendering a live agent-flow DAG driven by run metadata. When
 * the run completes it refreshes the page so the prediction renders.
 */
export function AnalyzeRunner({
  matchId,
  hasRuns,
  atCap = false,
  isRunning = false,
  activeRunId = null,
  accessToken = null,
}: {
  matchId: string;
  /** Whether any analysis runs already exist (controls the button label). */
  hasRuns: boolean;
  /** True once the user has used all their free predictions. */
  atCap?: boolean;
  /** Server-known: an analysis for this match is currently in flight. */
  isRunning?: boolean;
  /** Run id + token to re-subscribe to that in-flight run, from the server. */
  activeRunId?: string | null;
  accessToken?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Seed from the server's running state so the live DAG resumes on load.
  const [active, setActive] = useState<{ runId: string; accessToken: string } | null>(
    isRunning && activeRunId && accessToken
      ? { runId: activeRunId, accessToken }
      : null,
  );
  const [capError, setCapError] = useState<string | null>(null);

  const { run, error } = useRealtimeRun(active?.runId, {
    accessToken: active?.accessToken,
    enabled: Boolean(active),
    onComplete: (completedRun) => {
      // Pull in the freshly-saved prediction, then drop the live UI.
      if (completedRun.status === "COMPLETED") {
        router.refresh();
      }
      setActive(null);
    },
  });

  function onClick() {
    setCapError(null);
    startTransition(async () => {
      const result = await analyzeMatchAction(matchId);
      if (result.ok) {
        setActive({ runId: result.runId, accessToken: result.accessToken });
      } else {
        setCapError(result.error);
      }
    });
  }

  const running = isPending || Boolean(active);
  const steps = (run?.metadata?.steps ?? {}) as Record<string, StepStatus>;

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onClick}
          disabled={running || atCap}
          variant={hasRuns ? "outline" : "default"}
        >
          {running ? (
            <>
              <span aria-hidden className="inline-block animate-spin">
                ⚽
              </span>
              Analyzing…
            </>
          ) : (
            <>
              <span aria-hidden>{hasRuns ? "🔁" : "▶️"}</span>
              {hasRuns ? "Re-run analysis" : "Analyze match"}
            </>
          )}
        </Button>
      </div>

      {running && <AnalysisFlow steps={steps} hasRun={Boolean(run)} />}

      {capError && (
        <p className="text-sm font-bold text-destructive">🚫 {capError}</p>
      )}

      {error && (
        <p className="text-sm font-bold text-destructive">
          😬 Something went wrong — try again.
        </p>
      )}
    </div>
  );
}
