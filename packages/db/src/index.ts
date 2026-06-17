export { db } from "./client.js";
export type { Db } from "./client.js";
export * from "./schema.js";
export {
  getAnalysisState,
  getMatch,
  getMatchAnalysis,
  getUserUsage,
  listMatches,
  saveAgentReports,
  savePrediction,
  setAnalysisStatus,
  setPredictionVerdict,
  upsertAnalysis,
  upsertMatches,
} from "./queries.js";
export type {
  AnalysisRun,
  MatchAnalysis,
  MatchListItem,
  PredictionRow,
  UpsertMatchInput,
  UserUsage,
} from "./queries.js";
