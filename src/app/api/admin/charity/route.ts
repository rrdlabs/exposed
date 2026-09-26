import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  approve: z.boolean(),
});

/**
 * Approving a charity is not just a flag: it grants the free Solo tier
 * permanently, so it must also move the plan and the domain allowance.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, parsed.data.userId) });
  if (!user) return NextResponse.json({ error: "No such user." }, { status: 404 });

  if (parsed.data.approve) {
    await db
      .update(users)
      .set({ charityVerified: true, plan: "solo" })
      .where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  }

  // Revoking only drops the plan if the free tier is what granted it. Someone
  // with an active subscription keeps their paid plan.
  const paid = user.plan === "pro" || Boolean(user.lsSubscriptionId);
  await db
    .update(users)
    .set({ charityVerified: false, plan: paid ? user.plan : "free" })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
