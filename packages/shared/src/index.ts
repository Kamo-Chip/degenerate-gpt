export * from "./schemas.js";

/** Simulated paper-trading bankroll the Decider stakes against (no real money). */
export const PAPER_BANKROLL = 1000;

/** Bounds the Decider should keep simulated stakes within. */
export const MIN_STAKE = 0;
export const MAX_STAKE = 100;

/** Default OpenAI model for the Decider when OPENAI_MODEL is unset. */
export const DEFAULT_DECIDER_MODEL = "gpt-4o-mini";

/** Competition code the discovery + stats sources query (football-data.org). */
export const FOOTBALL_DATA_COMPETITION = "WC";

/**
 * Max tool-call steps for the Social/Market research agents' multi-step loop.
 * Bounds latency/token cost while leaving room to consult several sources.
 */
export const RESEARCH_MAX_STEPS = 6;
