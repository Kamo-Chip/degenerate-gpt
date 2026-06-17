import { getMatchAnalysis, getUserUsage } from "@degenerate-gpt/db";
import { notFound } from "next/navigation";

import { AgentReportCard } from "@/components/agent-report-card";
import { AnalyzeRunner } from "@/components/analyze-runner";
import { LocalTime } from "@/components/local-time";
import { PredictionPanel } from "@/components/prediction-panel";
import { Badge } from "@/components/ui/badge";
import { MAX_PREDICTIONS } from "@/lib/limits";
import { requireUser } from "@/lib/session";
import { createRunToken } from "@/lib/trigger";

/**
 * Async server component holding the match-detail data fetches. Rendered inside a
 * <Suspense> boundary so the page shell (back link) flushes immediately while the
 * analysis streams in. Reading cookies in requireUser keeps the route dynamic.
 */
export async function MatchDetailBody({ id }: { id: string }) {
  const user = await requireUser();

  let analysis;
  try {
    analysis = await getMatchAnalysis(id, user.id);
  } catch {
    notFound();
  }

  const { match, runs, status, activeRunId } = analysis;
  const { used, unlimited } = await getUserUsage(user.id);
  const atCap = !unlimited && used >= MAX_PREDICTIONS;

  // Re-subscribe to an in-flight run after navigation/refresh: mint a fresh
  // read token for it so the client's useRealtimeRun can resume the live DAG.
  const isRunning = status === "running";
  const accessToken =
    isRunning && activeRunId ? await createRunToken(activeRunId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          {match.teamA} <span className="text-muted-foreground">vs</span>{" "}
          {match.teamB}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          <LocalTime
            date={match.kickoffTime}
            fallback="Kickoff TBD"
            options={{
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }}
          />
        </p>
      </div>

      <AnalyzeRunner
        matchId={match.id}
        hasRuns={runs.length > 0}
        atCap={atCap}
        isRunning={isRunning}
        activeRunId={activeRunId}
        accessToken={accessToken}
      />

      {runs.length === 0 && !isRunning && (
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

      {runs.map((run, i) => {
        const isLatest = i === runs.length - 1;
        return (
          <section
            key={run.runId ?? `legacy-${i}`}
            className="space-y-4 border-t-4 border-foreground pt-6 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">Analysis {i + 1}</h2>
              <span className="text-xs text-muted-foreground">
                <LocalTime
                  date={run.createdAt}
                  options={{
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }}
                />
              </span>
              {isLatest && <Badge variant="success">latest</Badge>}
            </div>

            {run.prediction && (
              <PredictionPanel prediction={run.prediction} matchId={match.id} />
            )}

            {run.reports.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                {run.reports.map((report) => (
                  <AgentReportCard key={report.agent} report={report} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
