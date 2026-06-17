import { logger, schedules } from "@trigger.dev/sdk";
import { type UpsertMatchInput, upsertMatches } from "@degenerate-gpt/db";
import { footballData } from "@degenerate-gpt/sources";

const COMPETITION = "WC";

/**
 * Fixture ingestion. Pulls real World Cup fixtures from football-data.org and
 * upserts them (matched on the provider fixture id) so each match has a real
 * `externalId` + team ids the source agents can resolve. Runs on a daily cron
 * so the fixture list stays fresh without any manual trigger.
 */
export const discoverMatches = schedules.task({
  id: "discover-matches",
  cron: "0 0 * * *", // daily at 06:00 UTC
  run: async () => {
    const fixtures = await footballData.getWorldCupFixtures(COMPETITION);

    // Skip fixtures whose teams aren't decided yet (e.g. "TBD" knockout slots).
    const rows: UpsertMatchInput[] = fixtures
      .filter((f) => f.teamAExternalId && f.teamBExternalId)
      .map((f) => ({
        externalId: f.externalId,
        teamA: f.teamA,
        teamB: f.teamB,
        teamAExternalId: f.teamAExternalId,
        teamBExternalId: f.teamBExternalId,
        kickoffTime: f.kickoffTime ? new Date(f.kickoffTime) : null,
      }));

    const saved = await upsertMatches(rows);

    const upcoming = saved.slice(0, 20);
    logger.info("Discovered fixtures", {
      competition: COMPETITION,
      fetched: fixtures.length,
      upserted: saved.length,
      sample: upcoming.map((m) => `${m.id} — ${m.teamA} vs ${m.teamB}`),
    });

    return {
      competition: COMPETITION,
      fetched: fixtures.length,
      upserted: saved.length,
      matches: saved.map((m) => ({
        matchId: m.id,
        teamA: m.teamA,
        teamB: m.teamB,
        externalId: m.externalId,
      })),
    };
  },
});
