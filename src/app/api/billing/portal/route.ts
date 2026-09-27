import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  BillingNotConfiguredError,
  createPortalSession,
} from "@/lib/billing/stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-serve billing management, which is what the Solo plan page promises.
 * A Stripe Customer Portal session is a one-time URL scoped to one customer;
 * the cancel and update-card actions live in the Stripe-hosted portal, so we
 * never handle card details at all.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const record = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { stripeCustomerId: true, plan: true },
  });

  if (!record?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account is linked to this user." },
      { status: 404 },
    );
  }

  try {
    const session = await createPortalSession({
      customerId: record.stripeCustomerId,
      returnUrl: `${env.siteUrl}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not open billing." }, { status: 500 });
  }
}
