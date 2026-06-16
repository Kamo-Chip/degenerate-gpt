import type { PredictionRow } from "@degenerate-gpt/db";
import type { DisagreementScore } from "@degenerate-gpt/shared";

import { ConfidenceBar } from "@/components/confidence-bar";
import { VerdictButtons } from "@/components/verdict-buttons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DISAGREEMENT_VARIANT: Record<
  DisagreementScore,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  low: "success",
  medium: "secondary",
  high: "destructive",
};

/**
 * The Decider's final call. Deliberately money-free: we show pick, confidence,
 * rationale, and how much the source agents disagreed — never any stake or bet.
 */
export function PredictionPanel({
  prediction,
  matchId,
}: {
  prediction: PredictionRow;
  matchId: string;
}) {
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            🤖 The call:{" "}
            <span className="text-primary">{prediction.pick}</span>
          </CardTitle>
          <Badge variant={DISAGREEMENT_VARIANT[prediction.disagreementScore]}>
            {prediction.disagreementScore} disagreement
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfidenceBar value={prediction.confidence} />
        <p className="text-sm text-muted-foreground">{prediction.rationale}</p>
        <Separator />
        <VerdictButtons
          predictionId={prediction.id}
          matchId={matchId}
          verdict={prediction.verdict}
        />
      </CardContent>
    </Card>
  );
}
