import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { headers } from "next/headers";

/**
 * We only ever need a stable pseudonym for rate limiting, never the address
 * itself, so we hash it with a server-side secret. That keeps the anon_scans
 * table free of anything that identifies a visitor.
 */
export async function clientIpHash(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const raw = forwarded?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${env.sessionSecret}:${raw}`).digest("hex").slice(0, 32);
}
