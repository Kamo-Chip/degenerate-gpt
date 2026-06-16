import { config } from "dotenv";
import { resolve } from "node:path";

// Scripts run with cwd = packages/db, but the .env lives at the repo root.
// Load the local .env first (if any), then fall back to the repo-root .env.
config({
  path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
});
