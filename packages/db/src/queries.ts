import type {
  AgentReport,
  Decision,
  Match,
  Verdict,
} from "@degenerate-gpt/shared";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { agentReports, matches, predictions } from "./schema.js";

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
  status: string;
}

/**
 * Insert discovered fixtures, updating existing rows (matched on `external_id`)
 * with refreshed teams/kickoff/status. Returns the affected match rows.
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
        status: sql`excluded.status`,
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

/** Bulk-insert the source agents' reports for a match. */
export async function saveAgentReports(
  matchId: string,
  reports: AgentReport[],
): Promise<void> {
  if (reports.length === 0) return;

  await db.insert(agentReports).values(
    reports.map((report) => ({
      matchId,
      agent: report.agent,
      pick: report.pick,
      confidence: report.confidence,
      summary: report.summary,
      evidenceJson: report.evidence,
      rawJson: report.raw ?? null,
    })),
  );
}

/** Persist the Decider's verdict and mark the match analysis complete. */
export async function savePrediction(
  matchId: string,
  decision: Decision,
): Promise<void> {
  await db.insert(predictions).values({
    matchId,
    pick: decision.pick,
    confidence: decision.confidence,
    rationale: decision.rationale,
    disagreementScore: decision.disagreementScore,
    simulatedStake: decision.simulatedStake,
    stakeReason: decision.stakeReason,
  });

  await db
    .update(matches)
    .set({ predictionStatus: "complete", updatedAt: new Date() })
    .where(eq(matches.id, matchId));
}

/** A match row trimmed for the dashboard list. */
export interface MatchListItem {
  id: string;
  teamA: string;
  teamB: string;
  kickoffTime: Date | null;
  status: string;
  predictionStatus: string;
}

/** All matches for the dashboard, soonest kickoff first (undated last). */
export async function listMatches(): Promise<MatchListItem[]> {
  const rows = await db
    .select({
      id: matches.id,
      teamA: matches.teamA,
      teamB: matches.teamB,
      kickoffTime: matches.kickoffTime,
      status: matches.status,
      predictionStatus: matches.predictionStatus,
    })
    .from(matches)
    .orderBy(sql`${matches.kickoffTime} asc nulls last`, asc(matches.createdAt));

  return rows;
}

/**
 * The Decider's stored verdict plus the row id and hand-graded `verdict`, which
 * the UI needs to target and reflect the thumbs up/down state.
 */
export interface PredictionRow extends Decision {
  id: string;
  verdict: Verdict | null;
}

/** Everything the match-detail page renders: the match, agent reports, prediction. */
export interface MatchAnalysis {
  match: Match;
  reports: AgentReport[];
  prediction: PredictionRow | null;
}

/** Load a match with its source-agent reports and latest prediction. */
export async function getMatchAnalysis(matchId: string): Promise<MatchAnalysis> {
  const match = await getMatch(matchId);

  console.log(matchId);
  console.log(match);
  
  const reportRows = await db
    .select()
    .from(agentReports)
    .where(eq(agentReports.matchId, matchId))
    .orderBy(asc(agentReports.createdAt));

  const reports: AgentReport[] = reportRows.map((row) => ({
    agent: row.agent as AgentReport["agent"],
    pick: row.pick,
    confidence: row.confidence,
    summary: row.summary,
    evidence: (row.evidenceJson ?? []) as string[],
    raw: (row.rawJson ?? undefined) as AgentReport["raw"],
  }));

  const [predictionRow] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId))
    .orderBy(desc(predictions.createdAt))
    .limit(1);

  const prediction: PredictionRow | null = predictionRow
    ? {
        id: predictionRow.id,
        pick: predictionRow.pick,
        confidence: predictionRow.confidence,
        rationale: predictionRow.rationale,
        disagreementScore:
          predictionRow.disagreementScore as Decision["disagreementScore"],
        simulatedStake: predictionRow.simulatedStake,
        stakeReason: predictionRow.stakeReason,
        verdict: (predictionRow.verdict ?? null) as Verdict | null,
      }
    : null;

  return { match, reports, prediction };
}

/** Set (or clear, with null) the hand-graded verdict on a prediction. */
export async function setPredictionVerdict(
  predictionId: string,
  verdict: Verdict | null,
): Promise<void> {
  await db
    .update(predictions)
    .set({ verdict, verdictAt: verdict ? new Date() : null })
    .where(eq(predictions.id, predictionId));
}
