export { fetchJson, fetchText, requireEnv, HttpError } from "./http.js";

export * as footballData from "./football-data.js";
export type { Fixture, StandingRow, FormResult } from "./football-data.js";

export { getNationalElo } from "./elo.js";

export * as polymarket from "./polymarket.js";
export type { PolymarketMarket, MarketOutcome } from "./polymarket.js";

export * as tavily from "./tavily.js";
export type { SearchResult, ResearchResult } from "./tavily.js";
