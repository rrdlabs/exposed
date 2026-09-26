import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scans, targets } from "@/lib/db/schema";
import { enqueueScan } from "@/lib/scans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function ownedTarget(userId: string, id: string) {
  return db.query.targets.findFirst({
    where: and(eq(targets.id, id), eq(targets.userId, userId)),
  });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const target = await ownedTarget(user.id, id);
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const pending = await db
    .select({ id: scans.id })
    .from(scans)
    .where(
      and(eq(scans.targetId, id), inArray(scans.status, ["queued", "running"])),
    )
    .limit(1);

  if (pending.length > 0) {
    return NextResponse.json({ error: "A scan is already queued for this domain." }, { status: 409 });
  }

  const scanId = await enqueueScan(id, "manual");
  return NextResponse.json({ id: scanId });
}
