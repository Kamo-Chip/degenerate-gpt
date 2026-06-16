import { resolve } from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// The monorepo keeps a single .env at the repo root, but `next` runs from
// apps/web (process.cwd()). Load it here — the same trick apps/jobs uses in
// trigger.config.ts — so DATABASE_URL / TRIGGER_SECRET_KEY reach server code.
config({ path: resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source (exports "./src/index.ts"), so
  // Next must transpile them rather than expect prebuilt JS.
  transpilePackages: ["@degenerate-gpt/db", "@degenerate-gpt/shared"],
  webpack(config) {
    // Those packages use NodeNext-style ".js" specifiers that actually point at
    // ".ts" files. tsc resolves this; teach webpack the same mapping.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
