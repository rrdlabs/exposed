import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { newId } from "@/lib/util/id";
import { normalizeDomain } from "@/lib/util/domain";
import { maxDomainsFor } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function field(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = field(payload, "email").toLowerCase();
  const password = field(payload, "password");
  const domain = normalizeDomain(field(payload, "domain"));
  const isCharity = payload.charity === true;
  const charityName = field(payload, "charityName");
  const charityNumber = field(payload, "charityNumber");

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json(
      { error: "Use a password of at least 10 characters." },
      { status: 400 },
    );
  }
  if (!domain) {
    return NextResponse.json({ error: "Enter the domain you want to monitor." }, { status: 400 });
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists. Try logging in." },
      { status: 409 },
    );
  }

  const userId = newId("usr_");

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    plan: "free",
    charityClaimed: isCharity,
    charityVerified: false,
    charityName: isCharity ? charityName || null : null,
    charityNumber: isCharity ? charityNumber || null : null,
  });

  const { targets } = await import("@/lib/db/schema");
  const { enqueueScan } = await import("@/lib/scans");
  const targetId = newId("tgt_");
  await db.insert(targets).values({
    id: targetId,
    userId,
    domain,
    active: true,
  });

  // The free tier promises one full scan, so queue it now rather than leaving
  // the user staring at an empty dashboard.
  await enqueueScan(targetId, "signup");

  await createSession(userId);

  return NextResponse.json({
    ok: true,
    redirect: "/dashboard",
    maxDomains: maxDomainsFor("free"),
  });
}
