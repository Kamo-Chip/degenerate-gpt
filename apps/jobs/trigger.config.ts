import { resolve } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "@trigger.dev/sdk/v3";

// The monorepo's single .env lives at the repo root, but the Trigger dev server
// runs from apps/jobs (process.cwd()). Load it here so DATABASE_URL /
// OPENAI_API_KEY reach runs. (This file is transpiled to CJS by jiti, so we
// can't use import.meta here.)
config({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  project: "proj_sxengmcrwulivcyovdzq",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["src/trigger"],
});
