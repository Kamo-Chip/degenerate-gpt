import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof createDb>;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.",
    );
  }
  return drizzle(neon(connectionString), { schema });
}

let _db: Db | undefined;

/**
 * Shared Drizzle client backed by Neon's HTTP driver. Created lazily on first
 * use so that importing this module (e.g. while Trigger.dev indexes tasks)
 * never requires DATABASE_URL — only actually querying does.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    _db ??= createDb();
    return Reflect.get(_db, prop, receiver);
  },
});
