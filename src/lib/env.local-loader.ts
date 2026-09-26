import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `next start` loads .env.local for us, but the worker is run by tsx and gets
 * no such treatment. Without this the two processes can disagree about the
 * database path or the mail sender, which is exactly the kind of bug that only
 * shows up as "the alerts are going somewhere odd".
 *
 * Real environment variables always win; this only fills in what is missing.
 */
export function loadLocalEnv(): void {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;

  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    if (process.env[key] !== undefined) continue;

    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
