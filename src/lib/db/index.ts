import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_PATH ?? resolve(process.cwd(), "data", "exposed.db");

mkdirSync(dirname(dbPath), { recursive: true });

const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, { schema });
export { client as rawClient };
export * as tables from "./schema";
