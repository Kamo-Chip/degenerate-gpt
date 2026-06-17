import type {
  AgentReport,
  Decision,
  Match,
  Verdict,
} from "@degenerate-gpt/shared";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  agentReports,
  analyses,
  matches,
  predictions,
  users,
} from "./schema.js";

/** Load a match by id, mapped to the shared `Match` shape. Throws if missing. */
export async function getMatch(matchId: string): Promise<Match> {
  const [row] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row) {
    throw new Error(`Match not found: ${matchId}`);
  }

  return {
    id: row.id,
    externalId: row.externalId,
    teamA: row.teamA,
    teamB: row.teamB,
    teamAExternalId: row.teamAExternalId,
    teamBExternalId: row.teamBExternalId,
    kickoffTime: row.kickoffTime,
  };
}

/** A fixture to ingest, keyed by its provider `externalId` for upsert. */
export interface UpsertMatchInput {
  externalId: string;
  teamA: string;
  teamB: string;
  teamAExternalId: string | null;
  teamBExternalId: string | null;
  kickoffTime: Date | null;
}

/**
 * Insert discovered fixtures, updating existing rows (matched on `external_id`)
 * with refreshed teams/kickoff. Returns the affected match rows.
 */
export async function upsertMatches(
  rows: UpsertMatchInput[],
): Promise<Array<{ id: string; teamA: string; teamB: string; externalId: string | null }>> {
  if (rows.length === 0) return [];

  return db
    .insert(matches)
    .values(rows)
    .onConflictDoUpdate({
      target: matches.externalId,
      set: {
        teamA: sql`excluded.team_a`,
        teamB: sql`excluded.team_b`,
        teamAExternalId: sql`excluded.team_a_external_id`,
        teamBExternalId: sql`excluded.team_b_external_id`,
        kickoffTime: sql`excluded.kickoff_time`,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: matches.id,
      teamA: matches.teamA,
      teamB: matches.teamB,
      externalId: matches.externalId,
    });
}

/** Bulk-insert the source agents' reports for one analysis run, owned by a user. */
export async function saveAgentReports(
  matchId: string,
  userId: string,
  reports: AgentReport[],
  runId: string,
): Promise<void> {
  if (reports.length === 0) return;

  await db.insert(agentReports).values(
    reports.map((report) => ({
      matchId,
      userId,
      runId,
      agent: report.agent,
      pick: report.pick,
      confidence: report.confidence,
      summary: report.summary,
      evidenceJson: report.evidence,
      rawJson: report.raw ?? null,
    })),
  );
}

/** Persist the Decider's verdict for one analysis run. Status lives in `analyses`. */
export async function savePrediction(
  matchId: string,
  userId: string,
  decision: Decision,
  runId: string,
): Promise<void> {
  await db.insert(predictions).values({
    matchId,
    userId,
    runId,
    pick: decision.pick,
    confidence: decision.confidence,
    rationale: decision.rationale,
    disagreementScore: decision.disagreementScore,
    simulatedStake: decision.simulatedStake,
    stakeReason: decision.stakeReason,
  });
}

/** A user's prediction usage + whether they're exempt from the cap. */
export interface UserUsage {
  used: number;
  unlimited: boolean;
}

/**
 * How many predictions this user has produced and whether they have unlimited
 * access — together these drive the per-user cap.
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const [[usage], [account]] = await Promise.all([
    db
      .select({ value: count() })
      .from(predictions)
      .where(eq(predictions.userId, userId)),
    db
      .select({ unlimited: users.unlimited })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  return { used: usage?.value ?? 0, unlimited: account?.unlimited ?? false };
}

/** Start (or restart) a user's analysis of a match: upsert its status + run id. */
export async function upsertAnalysis(
  userId: string,
  matchId: string,
  status: string,
  runId?: string,
): Promise<void> {
  await db
    .insert(analyses)
    .values({ userId, matchId, status, runId: runId ?? null })
    .onConflictDoUpdate({
      target: [analyses.userId, analyses.matchId],
      set: { status, runId: runId ?? null, updatedAt: new Date() },
    });
}

/** Move a user's analysis to a terminal/intermediate status (keeps the run id). */
export async function setAnalysisStatus(
  userId: string,
  matchId: string,
  status: string,
): Promise<void> {
  await db
    .update(analyses)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(analyses.userId, userId), eq(analyses.matchId, matchId)));
}

/** The user's current analysis state for a match (status + the run id), if any. */
export async function getAnalysisState(
  userId: string,
  matchId: string,
): Promise<{ status: string; runId: string | null } | null> {
  const [row] = await db
    .select({ status: analyses.status, runId: analyses.runId })
    .from(analyses)
    .where(and(eq(analyses.userId, userId), eq(analyses.matchId, matchId)))
    .limit(1);

  return row ?? null;
}

/** A match row trimmed for the dashboard list. */
export interface MatchListItem {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Date | null;
  /** This user's analysis status for the match ("complete" => analyzed badge). */
  predictionStatus: string;
}

/**
 * All matches for the dashboard, soonest kickoff first (undated last). The
 * status reflects *this user's* analysis (matches themselves are shared).
 */
export async function listMatches(userId: string): Promise<MatchListItem[]> {
  const rows = await db
    .select({
      id: matches.id,
      teamA: matches.teamA,
      teamB: matches.teamB,
      kickoffTime: matches.kickoffTime,
      status: analyses.status,
    })
    .from(matches)
    .leftJoin(
      analyses,
      and(eq(analyses.matchId, matches.id), eq(analyses.userId, userId)),
    )
    .orderBy(sql`${matches.kickoffTime} asc nulls last`, asc(matches.createdAt));

  return rows.map((row) => ({
    id: row.id,
    teamA: row.teamA,
    teamB: row.teamB,
    kickoffTime: row.kickoffTime,
    predictionStatus: row.status ?? "not_started",
  }));
}

/**
 * The Decider's stored verdict plus the row id and hand-graded `verdict`, which
 * the UI needs to target and reflect the thumbs up/down state.
 */
export interface PredictionRow extends Decision {
  id: string;
  verdict: Verdict | null;
}

/** One analysis run: the source-agent reports + the Decider's prediction it produced. */
export interface AnalysisRun {
  runId: string | null;
  /** Earliest timestamp in the group — used to order runs oldest → newest. */
  createdAt: Date;
  reports: AgentReport[];
  prediction: PredictionRow | null;
}

/** Everything the match-detail page renders. */
export interface MatchAnalysis {
  match: Match;
  /** Each analysis run, oldest first (newest last — stacked "underneath"). */
  runs: AnalysisRun[];
  /** This user's latest analysis status for the match, or null if never run. */
  status: string | null;
  /** Run id of the in-flight analysis, for live re-subscription. */
  activeRunId: string | null;
}

// Group key for rows whose runId predates this feature (all collapse into one).
const LEGACY_RUN_KEY = "__legacy__";

/** Load a shared match with *this user's* analysis runs, grouped by run. */
export async function getMatchAnalysis(
  matchId: string,
  userId: string,
): Promise<MatchAnalysis> {
  const [match, reportRows, predictionRows, state] = await Promise.all([
    getMatch(matchId),
    db
      .select()
      .from(agentReports)
      .where(
        and(eq(agentReports.matchId, matchId), eq(agentReports.userId, userId)),
      )
      .orderBy(asc(agentReports.createdAt)),
    db
      .select()
      .from(predictions)
      .where(
        and(eq(predictions.matchId, matchId), eq(predictions.userId, userId)),
      )
      .orderBy(asc(predictions.createdAt)),
    getAnalysisState(userId, matchId),
  ]);

  // Bucket reports + predictions by their run id (legacy null rows share a bucket).
  const groups = new Map<string, AnalysisRun>();
  const groupFor = (runId: string | null, createdAt: Date): AnalysisRun => {
    const key = runId ?? LEGACY_RUN_KEY;
    let group = groups.get(key);
    if (!group) {
      group = { runId, createdAt, reports: [], prediction: null };
      groups.set(key, group);
    }
    if (createdAt < group.createdAt) group.createdAt = createdAt;
    return group;
  };

  for (const row of reportRows) {
    groupFor(row.runId, row.createdAt).reports.push({
      agent: row.agent as AgentReport["agent"],
      pick: row.pick,
      confidence: row.confidence,
      summary: row.summary,
      evidence: (row.evidenceJson ?? []) as string[],
      raw: (row.rawJson ?? undefined) as AgentReport["raw"],
    });
  }

  for (const row of predictionRows) {
    groupFor(row.runId, row.createdAt).prediction = {
      id: row.id,
      pick: row.pick,
      confidence: row.confidence,
      rationale: row.rationale,
      disagreementScore: row.disagreementScore as Decision["disagreementScore"],
      simulatedStake: row.simulatedStake,
      stakeReason: row.stakeReason,
      verdict: (row.verdict ?? null) as Verdict | null,
    };
  }

  const runs = [...groups.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    match,
    runs,
    status: state?.status ?? null,
    activeRunId: state?.runId ?? null,
  };
}

/** Set (or clear, with null) the hand-graded verdict on the user's own prediction. */
export async function setPredictionVerdict(
  predictionId: string,
  userId: string,
  verdict: Verdict | null,
): Promise<void> {
  await db
    .update(predictions)
    .set({ verdict, verdictAt: verdict ? new Date() : null })
    .where(
      and(eq(predictions.id, predictionId), eq(predictions.userId, userId)),
    );
}
