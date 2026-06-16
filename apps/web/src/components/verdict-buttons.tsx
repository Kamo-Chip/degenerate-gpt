"use client";

import type { Verdict } from "@degenerate-gpt/shared";
import { useTransition } from "react";

import { markPredictionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Fun, lightweight grading: thumbs up = the bot called it right, thumbs down =
 * wrong. Clicking the active choice again clears it. Optimistic via transition.
 */
export function VerdictButtons({
  predictionId,
  matchId,
  verdict,
}: {
  predictionId: string;
  matchId: string;
  verdict: Verdict | null;
}) {
  const [isPending, startTransition] = useTransition();

  function set(next: Verdict) {
    const value = verdict === next ? null : next;
    startTransition(async () => {
      await markPredictionAction(predictionId, matchId, value);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Nailed it?</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isPending}
        aria-pressed={verdict === "correct"}
        aria-label="Mark prediction correct"
        onClick={() => set("correct")}
        className={cn(
          verdict === "correct" &&
            "border-success bg-success/15 text-success hover:bg-success/25",
        )}
      >
        <span aria-hidden>👍</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isPending}
        aria-pressed={verdict === "wrong"}
        aria-label="Mark prediction wrong"
        onClick={() => set("wrong")}
        className={cn(
          verdict === "wrong" &&
            "border-destructive bg-destructive/15 text-destructive hover:bg-destructive/25",
        )}
      >
        <span aria-hidden>👎</span>
      </Button>
    </div>
  );
}
