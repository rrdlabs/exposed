import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildCheckoutUrl } from "@/lib/billing/lemonsqueezy";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BILLING_NOT_CONFIGURED =
  "Billing is not configured yet. Email founder@rrdlabs.online and we will switch it on.";

function isBillablePlan(value: unknown): value is PlanId {
  return value === "solo" || value === "pro";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  let payload: { plan?: unknown };
  try {
    payload = (await request.json()) as { plan?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isBillablePlan(payload.plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const plan = PLANS[payload.plan];
  const variantId = plan.variantEnv ? process.env[plan.variantEnv] : null;

  if (!variantId) {
    return NextResponse.json({ error: BILLING_NOT_CONFIGURED }, { status: 503 });
  }

  const url = buildCheckoutUrl({
    variantId,
    userId: user.id,
    email: user.email,
    plan: plan.id,
  });

  if (!url) {
    return NextResponse.json({ error: BILLING_NOT_CONFIGURED }, { status: 503 });
  }

  return NextResponse.json({ url });
}
