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
  hasPrediction,
}: {
  matchId: string;
  hasPrediction: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<{ runId: string; accessToken: string } | null>(
    null,
  );

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
    startTransition(async () => {
      const { runId, accessToken } = await analyzeMatchAction(matchId);
      setActive({ runId, accessToken });
    });
  }

  const running = isPending || Boolean(active);
  const steps = (run?.metadata?.steps ?? {}) as Record<string, StepStatus>;

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onClick}
          disabled={running}
          variant={hasPrediction ? "outline" : "default"}
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
              <span aria-hidden>{hasPrediction ? "🔁" : "▶️"}</span>
              {hasPrediction ? "Re-run analysis" : "Analyze match"}
            </>
          )}
        </Button>
      </div>

      {running && <AnalysisFlow steps={steps} hasRun={Boolean(run)} />}

      {error && (
        <p className="text-sm font-bold text-destructive">
          😬 Something went wrong — try again.
        </p>
      )}
    </div>
  );
}
