import {
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Upcoming/known fixtures. For this milestone these are seeded by hand; a
 * future `check-upcoming-matches` task will populate them from a fixtures API.
 */
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Provider fixture id (football-data.org). Unique so discovery can upsert by it.
  externalId: text("external_id").unique(),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  // Provider team ids, used by the Stats agent to resolve real standings/form.
  teamAExternalId: text("team_a_external_id"),
  teamBExternalId: text("team_b_external_id"),
  kickoffTime: timestamp("kickoff_time", { withTimezone: true }),
  status: text("status").notNull().default("upcoming"),
  predictionStatus: text("prediction_status").notNull().default("not_started"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One structured opinion per source agent, per analysis run. */
export const agentReports = pgTable("agent_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  agent: text("agent").notNull(),
  pick: text("pick").notNull(),
  confidence: real("confidence").notNull(),
  summary: text("summary").notNull(),
  evidenceJson: jsonb("evidence_json").notNull(),
  rawJson: jsonb("raw_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The Decider's final verdict, including the simulated paper bet
 * (`simulatedStake` / `stakeReason`). Paper trading only — never real money.
 */
export const predictions = pgTable("predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  pick: text("pick").notNull(),
  confidence: real("confidence").notNull(),
  rationale: text("rationale").notNull(),
  disagreementScore: text("disagreement_score").notNull(),
  simulatedStake: real("simulated_stake").notNull(),
  stakeReason: text("stake_reason").notNull(),
  // Hand-graded verdict on the prediction: "correct" | "wrong" | null (unscored).
  verdict: text("verdict"),
  verdictAt: timestamp("verdict_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Final scores. Unused this milestone — populated later by a
 * `fetch-match-result` task — but defined now so the schema is complete.
 */
export const matchResults = pgTable("match_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  teamAScore: real("team_a_score"),
  teamBScore: real("team_b_score"),
  winner: text("winner"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
