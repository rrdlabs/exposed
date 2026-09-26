import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: `file:${process.env.DATABASE_PATH ?? "./data/exposed.db"}`,
  },
});
