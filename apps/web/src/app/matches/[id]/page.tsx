import { getMatchAnalysis } from "@degenerate-gpt/db";
import { ArrowLeft, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { analyzeMatchAction } from "@/app/actions";
import { AgentReportCard } from "@/components/agent-report-card";
import { PredictionPanel } from "@/components/prediction-panel";
import { TriggerButton } from "@/components/trigger-button";
import { Badge } from "@/components/ui/badge";

function formatKickoff(date: Date | null): string {
  if (!date) return "Kickoff TBD";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let analysis;
  try {
    analysis = await getMatchAnalysis(id);
  } catch (e){
    console.log("error", e);
    notFound();
  }

  const { match, reports, prediction } = analysis;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All matches
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {match.teamA} <span className="text-muted-foreground">vs</span>{" "}
              {match.teamB}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formatKickoff(match.kickoffTime)} (UTC)
            </p>
          </div>
          <TriggerButton
            action={analyzeMatchAction.bind(null, match.id)}
            pendingLabel="Queuing…"
            variant={prediction ? "outline" : "default"}
          >
            <PlayCircle />
            {prediction ? "Re-run analysis" : "Analyze match"}
          </TriggerButton>
        </div>
      </div>

      {prediction ? (
        <PredictionPanel prediction={prediction} matchId={match.id} />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Badge variant="secondary" className="mb-2">
            not analyzed
          </Badge>
          <p>
            No prediction yet. Run the analysis to let the bots weigh in — refresh
            once the run finishes.
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            What the bots found
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {reports.map((report) => (
              <AgentReportCard key={report.agent} report={report} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
