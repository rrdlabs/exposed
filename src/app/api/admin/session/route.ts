import { NextResponse } from "next/server";
import { z } from "zod";
import { adminTokenMatches, setAdminSession } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success || !adminTokenMatches(parsed.data.token)) {
    return NextResponse.json({ error: "Wrong token." }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
