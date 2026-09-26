import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, id), eq(targets.userId, user.id)),
  });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.update(targets).set({ active: !target.active }).where(eq(targets.id, id));
  return NextResponse.json({ active: !target.active });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, id), eq(targets.userId, user.id)),
  });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Scans, findings and alerts cascade from the target.
  await db.delete(targets).where(eq(targets.id, id));
  return NextResponse.json({ deleted: true });
}
