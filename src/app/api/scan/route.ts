import { randomBytes } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { anonScans } from "@/lib/db/schema";
import { runScan } from "@/lib/scan";
import { normalizeDomain } from "@/lib/util/domain";
import { clientIpHash } from "@/lib/util/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_HOUR = 5;
const PER_DAY = 20;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export async function POST(request: Request) {
  let payload: { domain?: unknown };
  try {
    payload = (await request.json()) as { domain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof payload.domain !== "string") {
    return NextResponse.json({ error: "Enter a domain to scan." }, { status: 400 });
  }

  const domain = normalizeDomain(payload.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "That does not look like a valid domain. Try something like example.com" },
      { status: 400 },
    );
  }

  const ipHash = await clientIpHash();

  const recent = await db
    .select({ n: count() })
    .from(anonScans)
    .where(and(eq(anonScans.ipHash, ipHash), gt(anonScans.createdAt, new Date(Date.now() - DAY))));

  if ((recent[0]?.n ?? 0) >= PER_DAY) {
    return NextResponse.json(
      { error: "Daily free-scan limit reached. Create an account to keep scanning." },
      { status: 429 },
    );
  }

  const hourly = await db
    .select({ n: count() })
    .from(anonScans)
    .where(and(eq(anonScans.ipHash, ipHash), gt(anonScans.createdAt, new Date(Date.now() - HOUR))));

  if ((hourly[0]?.n ?? 0) >= PER_HOUR) {
    return NextResponse.json(
      { error: "Too many scans in a row. Try again in an hour." },
      { status: 429 },
    );
  }

  let result;
  try {
    result = await runScan(domain, null);
  } catch {
    return NextResponse.json(
      { error: "The scan failed unexpectedly. Please try again." },
      { status: 502 },
    );
  }

  const token = randomBytes(16).toString("base64url");

  await db.insert(anonScans).values({
    token,
    domain,
    ipHash,
    findingsJson: JSON.stringify(result.findings),
    snapshotJson: JSON.stringify(result.snapshot),
    durationMs: result.durationMs,
  });

  return NextResponse.json({ token });
}
