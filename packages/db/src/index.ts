export { db } from "./client.js";
export type { Db } from "./client.js";
export * from "./schema.js";
export {
  getMatch,
  getMatchAnalysis,
  listMatches,
  saveAgentReports,
  savePrediction,
  setPredictionVerdict,
  upsertMatches,
} from "./queries.js";
export type {
  MatchAnalysis,
  MatchListItem,
  PredictionRow,
  UpsertMatchInput,
} from "./queries.js";
