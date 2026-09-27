import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  BillingNotConfiguredError,
  createSubscriptionSession,
} from "@/lib/billing/stripe";
import { isBillablePlan } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates an Embedded Checkout session and hands the browser a client secret.
 *
 * The client secret is safe to expose. It can only mount the one checkout it
 * belongs to, and it grants no access to the account. The secret key never
 * leaves the server.
 */
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

  // Don't let someone "upgrade" to the plan they are already on, which would
  // create a second subscription for the same tier and double-charge them.
  if (user.plan === payload.plan) {
    return NextResponse.json({ error: "You are already on that plan." }, { status: 409 });
  }

  try {
    const record = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { stripeCustomerId: true },
    });

    const session = await createSubscriptionSession({
      userId: user.id,
      email: user.email,
      plan: payload.plan,
      existingCustomerId: record?.stripeCustomerId ?? null,
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a client secret." },
        { status: 502 },
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    // Stripe's own message is the only useful thing here: an invalid price id,
    // a mismatched key pair and a revoked key all fail this call with
    // otherwise indistinguishable 500s, and the operator needs to know which.
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
