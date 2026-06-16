import "./env.js";
import { db } from "./client.js";
import { matches } from "./schema.js";

/** A few fake upcoming fixtures so we have match IDs to trigger analysis with. */
const SEED_MATCHES = [
  { teamA: "France", teamB: "England", kickoffHoursFromNow: 4 },
  { teamA: "Brazil", teamB: "Argentina", kickoffHoursFromNow: 8 },
  { teamA: "Spain", teamB: "Germany", kickoffHoursFromNow: 26 },
];

async function main() {
  const now = Date.now();

  const inserted = await db
    .insert(matches)
    .values(
      SEED_MATCHES.map((m, i) => ({
        externalId: `seed-${i + 1}`,
        teamA: m.teamA,
        teamB: m.teamB,
        kickoffTime: new Date(now + m.kickoffHoursFromNow * 60 * 60 * 1000),
        status: "upcoming",
        predictionStatus: "not_started",
      })),
    )
    .returning({
      id: matches.id,
      teamA: matches.teamA,
      teamB: matches.teamB,
    });

  console.log("\nSeeded matches — use one of these IDs as the analyze-match payload:\n");
  for (const m of inserted) {
    console.log(`  ${m.id}  ${m.teamA} vs ${m.teamB}`);
  }
  console.log(
    `\nExample payload:\n  { "matchId": "${inserted[0]?.id ?? "<id>"}" }\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
