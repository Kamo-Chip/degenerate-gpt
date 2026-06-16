import "./env.js";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { agentReports, matches, predictions } from "./schema.js";

/**
 * Human-readable dump of the agent reports + final prediction for a match,
 * in the "France vs England" format from the spec. Usage:
 *   pnpm db:report <matchId>
 */
async function main() {
  const matchId = process.argv[2];
  if (!matchId) {
    console.error("Usage: pnpm db:report <matchId>");
    process.exit(1);
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) {
    console.error(`Match not found: ${matchId}`);
    process.exit(1);
  }

  const reports = await db
    .select()
    .from(agentReports)
    .where(eq(agentReports.matchId, matchId));
  const [prediction] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId))
    .limit(1);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  console.log(`\n${match.teamA} vs ${match.teamB}\n`);
  for (const r of reports) {
    console.log(`${r.agent[0]?.toUpperCase()}${r.agent.slice(1)} Agent:`);
    console.log(`Pick: ${r.pick}`);
    console.log(`Confidence: ${pct(r.confidence)}\n`);
  }

  if (prediction) {
    console.log("Bot Decision:");
    console.log(`Pick: ${prediction.pick}`);
    console.log(`Confidence: ${pct(prediction.confidence)}`);
    console.log(`Disagreement: ${prediction.disagreementScore}`);
    console.log(`Simulated stake: ${prediction.simulatedStake}`);
    console.log(`\nReason:\n${prediction.rationale}\n`);
  } else {
    console.log("(no prediction yet)\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
