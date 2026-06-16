import { fetchJson, requireEnv } from "./http.js";

/**
 * football-data.org v4 client (free tier covers the World Cup, code "WC").
 * Used by the Stats agent for fixtures, standings, form and head-to-head.
 * Auth is a single `X-Auth-Token` header. Reads FOOTBALL_DATA_API_KEY lazily.
 */

const BASE = "https://api.football-data.org/v4";

function authHeaders(): Record<string, string> {
  return { "X-Auth-Token": requireEnv("FOOTBALL_DATA_API_KEY") };
}

export interface Fixture {
  externalId: string;
  teamA: string;
  teamB: string;
  teamAExternalId: string | null;
  teamBExternalId: string | null;
  kickoffTime: string | null;
  status: string;
  stage: string | null;
  group: string | null;
}

export interface StandingRow {
  teamId: number;
  teamName: string;
  group: string | null;
  position: number;
  playedGames: number;
  points: number;
  goalsFor: number;
  goalDifference: number;
  /** Recent form string like "W,D,L" if the API provides it. */
  form: string | null;
}

/** One finished result from a team's perspective. */
export interface FormResult {
  opponent: string;
  outcome: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  utcDate: string;
}

interface FdTeam {
  id: number;
  name: string;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

/** Normalise football-data statuses into our match status vocabulary. */
function mapStatus(s: string): string {
  switch (s) {
    case "SCHEDULED":
    case "TIMED":
      return "upcoming";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    default:
      return s.toLowerCase();
  }
}

/** All fixtures for the competition, mapped to our match shape. */
export async function getWorldCupFixtures(competition = "WC"): Promise<Fixture[]> {
  const data = await fetchJson<{ matches: FdMatch[] }>(
    `${BASE}/competitions/${competition}/matches`,
    { headers: authHeaders() },
  );

  return (data.matches ?? []).map((m) => ({
    externalId: String(m.id),
    teamA: m.homeTeam?.name ?? "TBD",
    teamB: m.awayTeam?.name ?? "TBD",
    teamAExternalId: m.homeTeam?.id != null ? String(m.homeTeam.id) : null,
    teamBExternalId: m.awayTeam?.id != null ? String(m.awayTeam.id) : null,
    kickoffTime: m.utcDate ?? null,
    status: mapStatus(m.status),
    stage: m.stage ?? null,
    group: m.group ?? null,
  }));
}

interface FdStandingsResponse {
  standings: Array<{
    group?: string | null;
    table: Array<{
      position: number;
      team: FdTeam;
      playedGames: number;
      points: number;
      goalsFor: number;
      goalDifference: number;
      form?: string | null;
    }>;
  }>;
}

/** Flattened standings across every group table. */
export async function getStandings(competition = "WC"): Promise<StandingRow[]> {
  const data = await fetchJson<FdStandingsResponse>(
    `${BASE}/competitions/${competition}/standings`,
    { headers: authHeaders() },
  );

  const rows: StandingRow[] = [];
  for (const block of data.standings ?? []) {
    for (const r of block.table ?? []) {
      rows.push({
        teamId: r.team.id,
        teamName: r.team.name,
        group: block.group ?? null,
        position: r.position,
        playedGames: r.playedGames,
        points: r.points,
        goalsFor: r.goalsFor,
        goalDifference: r.goalDifference,
        form: r.form ?? null,
      });
    }
  }
  return rows;
}

/** A team's recent finished results (most recent first), from their perspective. */
export async function getTeamForm(teamId: string, limit = 5): Promise<FormResult[]> {
  const data = await fetchJson<{ matches: FdMatch[] }>(
    `${BASE}/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
    { headers: authHeaders() },
  );

  const id = Number(teamId);
  return (data.matches ?? [])
    .map((m): FormResult | null => {
      const home = m.score?.fullTime?.home;
      const away = m.score?.fullTime?.away;
      if (home == null || away == null) return null;
      const isHome = m.homeTeam.id === id;
      const goalsFor = isHome ? home : away;
      const goalsAgainst = isHome ? away : home;
      const outcome: FormResult["outcome"] =
        goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
      return {
        opponent: isHome ? m.awayTeam.name : m.homeTeam.name,
        outcome,
        goalsFor,
        goalsAgainst,
        utcDate: m.utcDate,
      };
    })
    .filter((r): r is FormResult => r !== null);
}
