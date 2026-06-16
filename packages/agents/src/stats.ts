import { getNationalElo, footballData } from "@degenerate-gpt/sources";
import { type AgentReport, AgentReportSchema, type Match } from "@degenerate-gpt/shared";

/**
 * Stats Agent — "reads the numbers". Real football data, no LLM: Elo + World Cup
 * standings (points / goal difference) + recent form, combined into a strength
 * signal. Every source is best-effort; if nothing resolves we emit a neutral
 * 0.5-confidence report so the orchestration still proceeds.
 */

function round(value: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Points from a recent-form string: W=3, D=1, L=0. */
function formPoints(form: ReadonlyArray<{ outcome: "W" | "D" | "L" }>): number {
  return form.reduce(
    (sum, r) => sum + (r.outcome === "W" ? 3 : r.outcome === "D" ? 1 : 0),
    0,
  );
}

interface TeamStats {
  elo: number | null;
  points: number | null;
  goalDifference: number | null;
  formPts: number | null;
  formGames: number;
}

function neutralReport(match: Match, note: string): AgentReport {
  return AgentReportSchema.parse({
    agent: "stats",
    pick: match.teamA,
    confidence: 0.5,
    summary: `No reliable statistical signal available for ${match.teamA} vs ${match.teamB}.`,
    evidence: [note],
    raw: { note },
  });
}

export async function runStatsAgent(match: Match): Promise<AgentReport> {
  const competition = "WC";

  // Standings (group tables). Best-effort — may be empty pre-tournament.
  const standings = await footballData
    .getStandings(competition)
    .catch(() => [] as Awaited<ReturnType<typeof footballData.getStandings>>);

  const standingFor = (teamName: string, teamId: string | null) =>
    standings.find(
      (r) => (teamId != null && String(r.teamId) === teamId) || r.teamName === teamName,
    );

  const standA = standingFor(match.teamA, match.teamAExternalId);
  const standB = standingFor(match.teamB, match.teamBExternalId);

  // Recent form (needs provider team ids).
  const formA = match.teamAExternalId
    ? await footballData.getTeamForm(match.teamAExternalId).catch(() => [])
    : [];
  const formB = match.teamBExternalId
    ? await footballData.getTeamForm(match.teamBExternalId).catch(() => [])
    : [];

  // Elo enrichment (best-effort, can be null).
  const [eloA, eloB] = await Promise.all([
    getNationalElo(match.teamA),
    getNationalElo(match.teamB),
  ]);

  const a: TeamStats = {
    elo: eloA,
    points: standA?.points ?? null,
    goalDifference: standA?.goalDifference ?? null,
    formPts: formA.length ? formPoints(formA) : null,
    formGames: formA.length,
  };
  const b: TeamStats = {
    elo: eloB,
    points: standB?.points ?? null,
    goalDifference: standB?.goalDifference ?? null,
    formPts: formB.length ? formPoints(formB) : null,
    formGames: formB.length,
  };

  // Build a signal that's positive when team A looks stronger. Each component is
  // only included when both teams have data for it.
  let signal = 0;
  let components = 0;
  const evidence: string[] = [];

  if (a.elo != null && b.elo != null) {
    const diff = a.elo - b.elo;
    signal += diff / 100; // ~1 unit per 100 Elo points
    components++;
    const lead = diff >= 0 ? match.teamA : match.teamB;
    evidence.push(
      `Elo: ${match.teamA} ${a.elo} vs ${match.teamB} ${b.elo} (${lead} +${Math.abs(diff)}).`,
    );
  }
  if (a.points != null && b.points != null) {
    signal += (a.points - b.points) / 3;
    components++;
    evidence.push(
      `Group points: ${match.teamA} ${a.points} vs ${match.teamB} ${b.points}.`,
    );
  }
  if (a.goalDifference != null && b.goalDifference != null) {
    signal += (a.goalDifference - b.goalDifference) / 3;
    components++;
    evidence.push(
      `Goal difference: ${match.teamA} ${a.goalDifference} vs ${match.teamB} ${b.goalDifference}.`,
    );
  }
  if (a.formPts != null && b.formPts != null) {
    signal += (a.formPts - b.formPts) / 4;
    components++;
    evidence.push(
      `Recent form points: ${match.teamA} ${a.formPts}/${a.formGames * 3} vs ${match.teamB} ${b.formPts}/${b.formGames * 3}.`,
    );
  }

  if (components === 0) {
    return neutralReport(
      match,
      "football-data standings/form and Elo were all unavailable for these teams.",
    );
  }

  // Average per component so confidence doesn't scale with how many we found.
  const avg = signal / components;
  const favoursA = avg >= 0;
  const pick = favoursA ? match.teamA : match.teamB;

  // Map the magnitude into a confidence band ~[0.5, 0.9].
  const confidence = round(0.5 + Math.min(Math.abs(avg), 1) * 0.4);

  return AgentReportSchema.parse({
    agent: "stats",
    pick,
    confidence,
    summary: `${pick} has the stronger statistical profile (Elo / standings / form) for this match.`,
    evidence,
    raw: {
      teamA: { name: match.teamA, ...a },
      teamB: { name: match.teamB, ...b },
      signal: round(avg, 3),
      components,
    },
  });
}
