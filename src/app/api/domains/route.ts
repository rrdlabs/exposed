import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";
import { maxDomainsFor } from "@/lib/billing/plans";
import { enqueueScan } from "@/lib/scans";
import { normalizeDomain } from "@/lib/util/domain";
import { newId } from "@/lib/util/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let payload: { domain?: unknown };
  try {
    payload = (await request.json()) as { domain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof payload.domain !== "string") {
    return NextResponse.json({ error: "Enter a domain." }, { status: 400 });
  }

  const domain = normalizeDomain(payload.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "That does not look like a valid domain." },
      { status: 400 },
    );
  }

  const duplicate = await db.query.targets.findFirst({
    where: and(eq(targets.userId, user.id), eq(targets.domain, domain)),
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "You are already monitoring that domain." },
      { status: 409 },
    );
  }

  const [existing] = await db
    .select({ n: count() })
    .from(targets)
    .where(eq(targets.userId, user.id));

  const limit = maxDomainsFor(user.plan);
  if ((existing?.n ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: `Your plan allows ${limit === 1000 ? "unlimited" : limit} domain${limit === 1 ? "" : "s"}. Upgrade to add more.`,
      },
      { status: 403 },
    );
  }

  const id = newId("tgt_");
  await db.insert(targets).values({ id, userId: user.id, domain, active: true });

  // Adding a domain is the user asserting they are authorised to monitor it,
  // which is what our terms require of them. Queue the first scan right away.
  await enqueueScan(id, "manual");

  return NextResponse.json({ id });
}
