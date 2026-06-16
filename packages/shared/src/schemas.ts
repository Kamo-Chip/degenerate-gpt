import { z } from "zod";

/** The three source agents that feed the Decider. */
export const AgentNameSchema = z.enum(["stats", "social", "market"]);
export type AgentName = z.infer<typeof AgentNameSchema>;

/**
 * A structured opinion from a single source agent. Every agent — mocked or
 * real — must conform to this shape so the Decider can compare them uniformly.
 */
export const AgentReportSchema = z.object({
  agent: AgentNameSchema,
  pick: z.string(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  evidence: z.array(z.string()),
  raw: z.record(z.string(), z.any()).optional(),
});
export type AgentReport = z.infer<typeof AgentReportSchema>;

/** Disagreement between the source agents, as judged by the Decider. */
export const DisagreementScoreSchema = z.enum(["low", "medium", "high"]);
export type DisagreementScore = z.infer<typeof DisagreementScoreSchema>;

/**
 * The Decider's final, paper-only verdict for a match. `simulatedStake` and
 * `stakeReason` describe a simulated paper bet — no real money is ever placed.
 */
export const DecisionSchema = z.object({
  pick: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  disagreementScore: DisagreementScoreSchema,
  simulatedStake: z.number().min(0),
  stakeReason: z.string(),
});
export type Decision = z.infer<typeof DecisionSchema>;

/** Hand-graded verdict on a prediction — was the Decider's call right or wrong? */
export const VerdictSchema = z.enum(["correct", "wrong"]);
export type Verdict = z.infer<typeof VerdictSchema>;

/** Trigger.dev task payloads. */
export const AnalyzeMatchPayloadSchema = z.object({
  matchId: z.uuid(),
});
export type AnalyzeMatchPayload = z.infer<typeof AnalyzeMatchPayloadSchema>;

/** Discovery task payload — defaults to the World Cup competition. */
export const DiscoverMatchesPayloadSchema = z.object({
  competition: z.string().default("WC"),
});
export type DiscoverMatchesPayload = z.infer<typeof DiscoverMatchesPayloadSchema>;

export const AgentPayloadSchema = z.object({
  matchId: z.uuid(),
});
export type AgentPayload = z.infer<typeof AgentPayloadSchema>;

export const DeciderPayloadSchema = z.object({
  matchId: z.uuid(),
  reports: z.array(AgentReportSchema),
});
export type DeciderPayload = z.infer<typeof DeciderPayloadSchema>;

/** A match as the agents need to see it (decoupled from the DB row shape). */
export const MatchSchema = z.object({
  id: z.uuid(),
  /** Provider fixture id (football-data.org). Null for hand-seeded matches. */
  externalId: z.string().nullable(),
  teamA: z.string(),
  teamB: z.string(),
  /** Provider team ids used to resolve real stats. Null when unknown. */
  teamAExternalId: z.string().nullable(),
  teamBExternalId: z.string().nullable(),
  kickoffTime: z.coerce.date().nullable(),
});
export type Match = z.infer<typeof MatchSchema>;
