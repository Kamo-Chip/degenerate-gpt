import { getMatchAnalysis } from "@degenerate-gpt/db";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentReportCard } from "@/components/agent-report-card";
import { AnalyzeRunner } from "@/components/analyze-runner";
import { PredictionPanel } from "@/components/prediction-panel";
import { Badge } from "@/components/ui/badge";

function formatKickoff(date: Date | null): string {
  if (!date) return "Kickoff TBD";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
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
          <span aria-hidden>⬅️</span>
          All matches
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {match.teamA} <span className="text-muted-foreground">vs</span>{" "}
            {match.teamB}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {formatKickoff(match.kickoffTime)} (UTC)
          </p>
        </div>
      </div>

      <AnalyzeRunner matchId={match.id} hasPrediction={Boolean(prediction)} />

      {prediction ? (
        <PredictionPanel prediction={prediction} matchId={match.id} />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-foreground p-8 text-center text-sm text-muted-foreground">
          <Badge variant="secondary" className="mb-2">
            not analyzed
          </Badge>
          <p>
            No prediction yet. Hit <span className="font-bold">Analyze match</span>{" "}
            to let the bots weigh in — the page updates live as they work. ⚽
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
