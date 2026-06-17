import {
  boolean,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Auth (Better Auth)                                                         */
/* -------------------------------------------------------------------------- */
// Better Auth tables (magic-link sign-in only — no passwords/OAuth, so no
// `account` table is needed). Table names are plural to match the rest of the
// schema; the property keys stay the camelCase Better Auth field names, and the
// adapter is given an explicit model→table map in apps/web/src/lib/auth.ts.

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Hand-set to grant a user unlimited predictions (bypasses the per-user cap).
  unlimited: boolean("unlimited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  predictionStatus: text("prediction_status").notNull().default("not_started"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One structured opinion per source agent, per analysis run (scoped to a user). */
export const agentReports = pgTable("agent_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id),
  // Owner of this analysis. Matches are shared; reports/predictions are private.
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Trigger.dev run that produced this report — groups a single analysis run.
  runId: text("run_id"),
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
  // Owner of this prediction (counts toward their per-user cap).
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Trigger.dev run that produced this prediction — groups it with its reports.
  runId: text("run_id"),
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
 * Per-user analysis run status. Matches are shared, so "has this been analyzed
 * / is it running" is per-user — this replaces the global `matches.prediction
 * Status`. One row per (user, match); upserted when an analysis starts.
 */
export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    // "running" | "complete" | "failed"
    status: text("status").notNull().default("running"),
    // Trigger.dev run id of the latest analysis, for live re-subscription.
    runId: text("run_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.userId, t.matchId)],
);

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
