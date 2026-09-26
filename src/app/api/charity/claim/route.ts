import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  charityName: z.string().trim().min(2, "Give the organisation name.").max(120),
  charityNumber: z
    .string()
    .trim()
    .min(3, "Give the registration or charity number.")
    .max(60),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details and try again." },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({
      charityClaimed: true,
      charityVerified: false,
      charityName: parsed.data.charityName,
      charityNumber: parsed.data.charityNumber,
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
