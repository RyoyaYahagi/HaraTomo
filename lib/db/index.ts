import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type EventDatabase = BetterSQLite3Database<typeof schema>;

export function connectDatabase(filename: string): {
  db: EventDatabase;
  close: () => void;
} {
  if (filename !== ":memory:") {
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  }

  const client = new Database(filename);
  client.pragma("foreign_keys = ON");
  const db = drizzle({ client, schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  return { db, close: () => client.close() };
}

const globalDatabase = globalThis as typeof globalThis & {
  haratomoDatabase?: ReturnType<typeof connectDatabase>;
};

export function getDatabase(): EventDatabase {
  if (!globalDatabase.haratomoDatabase) {
    const filename = process.env.DATABASE_PATH ?? "data/haratomo.db";
    globalDatabase.haratomoDatabase = connectDatabase(filename);
  }

  return globalDatabase.haratomoDatabase.db;
}
