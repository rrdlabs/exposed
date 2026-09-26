import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./index";

/**
 * Applies the generated SQL migrations. Safe to call from both the web process
 * and the worker: libsql serialises writes, so concurrent startup is fine.
 */
export async function runMigrations(): Promise<void> {
  const folder = resolve(process.cwd(), "drizzle");
  if (!existsSync(folder)) {
    throw new Error(`Migrations folder not found at ${folder}`);
  }
  await migrate(db, { migrationsFolder: folder });
}
