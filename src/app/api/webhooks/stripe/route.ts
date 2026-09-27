import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";
import {
  BillingNotConfiguredError,
  constructWebhookEvent,
} from "@/lib/billing/stripe";
import type { PlanId } from "@/lib/billing/plans";
import { sendEmail } from "@/lib/mail";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

/**
 * The only place plan entitlement is granted or revoked.
 *
 * Everything else in the billing flow is presentation. A customer can reach
 * the return page with any session_id they like and the client secret is
 * public, so neither may change what an account is entitled to. Stripe states
 * what happened with a signature over the exact bytes it sent, and this is the
 * only code that trusts it.
 */
export async function POST(request: Request) {
  // Raw text, never request.json(): Stripe signs the exact byte sequence, and
  // re-serialising parsed JSON changes bytes and invalidates the signature.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      // Name the variables that are actually missing. constructWebhookEvent
      // checks STRIPE_SECRET_KEY before the webhook secret, so hardcoding one
      // name here sent me looking at a variable that was set correctly.
      return NextResponse.json(
        { error: `Stripe is not configured. Missing: ${error.missing.join(", ")}` },
        { status: 503 },
      );
    }
    // The one case that must not be a 200: a bad signature means Stripe would
    // retry forever and fill the log.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Claim the event before touching any state. Stripe retries a delivery for up
  // to three days with exponential backoff, and it will not retry a 2xx, so the
  // status code is load-bearing: 200 means "handled, never send this again",
  // and anything else means "please send it again later".
  const claim = await claimEvent(event);
  if (claim === "done") {
    return NextResponse.json({ received: true, handled: false, reason: "already processed" });
  }

  try {
    const outcome = await handleEvent(event);
    await markProcessed(event.id, outcome);
    return NextResponse.json({ received: true, ...outcome });
  } catch (error) {
    // Left unprocessed on purpose. A 500 makes Stripe retry, and the retry sees
    // a row with processedAt still null and runs the handler again. Marking it
    // done here instead would silently drop a subscription grant whenever the
    // database blips.
    console.error(`[stripe-webhook] ${event.type} (${event.id}) failed:`, error);
    return NextResponse.json({ received: false, error: "handler failed" }, { status: 500 });
  }
}

type Outcome = { handled: boolean; reason?: string };

async function handleEvent(event: Stripe.Event): Promise<Outcome> {
  // event.data.object is passed into each handler rather than the event
  // itself. Stripe's Event is a discriminated union, but the discriminant lives
  // on `type` while the payload lives on a sibling property, so narrowing is
  // lost as soon as the whole event crosses a function boundary.
  switch (event.type) {
    case "checkout.session.completed":
      return onCheckoutCompleted(event.data.object);

    case "customer.subscription.updated":
      return onSubscriptionChanged(event.data.object, false);

    case "customer.subscription.deleted":
      return onSubscriptionChanged(event.data.object, true);

    case "invoice.paid":
      return onInvoicePaid(event.data.object);

    case "invoice.payment_failed":
      return onInvoiceFailed(event.data.object);

    default:
      return { handled: false, reason: `ignored ${event.type}` };
  }
}

/**
 * metadata.plan is set by our own server when it creates the session, and a
 * customer cannot create a Checkout session against our Stripe account or forge
 * its metadata, so it is trustworthy in a way a price id from the client would
 * not be.
 */
function planFromMetadata(value: string | undefined | null): PlanId | null {
  return value === "solo" || value === "pro" ? value : null;
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<Outcome> {
  const plan = planFromMetadata(session.metadata?.plan);
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;

  if (!plan) {
    return { handled: false, reason: `session ${session.id} carried no plan` };
  }
  if (!userId) {
    // Most likely a checkout started from the pricing page while signed out.
    return { handled: false, reason: `session ${session.id} carried no userId` };
  }

  const account = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, email: true, plan: true },
  });

  if (!account) {
    // Deleted between checkout and webhook. Do not recreate the account.
    return { handled: false, reason: `unknown user ${userId}` };
  }

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  await db
    .update(users)
    .set({
      plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeSubscriptionStatus: "active",
    })
    .where(eq(users.id, userId));

  // The audit row for this event was already written by claimEvent/markProcessed
  // before the handler ran, so there is nothing to record here.
  if (account.plan !== plan) {
    // Never let a mail outage fail the grant: the DB write above already
    // happened, and sendEmail reports failure instead of throwing.
    await sendEmail({
      to: account.email,
      subject: `Exposed: welcome to ${plan}`,
      body: [
        `Your Exposed account is now on the ${plan} plan.`,
        "",
        `Manage or cancel your subscription: ${env.siteUrl}/dashboard/billing`,
      ].join("\n"),
    });
  }

  return { handled: true };
}

async function onSubscriptionChanged(
  subscription: Stripe.Subscription,
  deleted: boolean,
): Promise<Outcome> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    return { handled: false, reason: "subscription carries no userId" };
  }

  if (deleted) {
    await revokePlan(userId, "subscription deleted");
    return { handled: true };
  }

  // A cancellation requested mid-period keeps access until the period actually
  // ends. That is what the customer was promised, and Stripe already encodes it
  // in cancel_at_period_end, so downgrading here would cut a paid month short.
  const stillEntitled =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    (subscription.status === "canceled" && Boolean(subscription.cancel_at_period_end));

  if (!stillEntitled) {
    await revokePlan(userId, `subscription ${subscription.status}`);
    return { handled: true };
  }

  const firstItem = subscription.items?.data?.[0];
  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      // current_period_end moved from Subscription to SubscriptionItem in the
      // 2025-03-31.basil API version. Reading it off the subscription compiles
      // against older typings and is always undefined against these.
      stripeCurrentPeriodEnd: firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : null,
    })
    .where(eq(users.id, userId));

  return { handled: true };
}

async function onInvoicePaid(invoice: Stripe.Invoice): Promise<Outcome> {
  const userId = userIdFromInvoice(invoice);
  if (!userId) return { handled: false, reason: "invoice carried no userId" };

  const reference = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof reference === "string" ? reference : null;

  await db
    .update(users)
    .set({
      stripeSubscriptionStatus: "active",
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    })
    .where(eq(users.id, userId));

  return { handled: true };
}

async function onInvoiceFailed(invoice: Stripe.Invoice): Promise<Outcome> {
  const userId = userIdFromInvoice(invoice);
  if (!userId) return { handled: false, reason: "invoice carried no userId" };

  // past_due, not free: Stripe retries for several days and the customer keeps
  // their domains monitored throughout. A hard downgrade on the first failed
  // charge loses paying users to a transient card decline.
  const before = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, plan: true, stripeSubscriptionStatus: true },
  });

  await db
    .update(users)
    .set({ stripeSubscriptionStatus: "past_due" })
    .where(eq(users.id, userId));

  // Only mail on the transition. Stripe re-sends invoice.payment_failed for each
  // failed retry of the same invoice, and the customer does not need to be told
  // about attempt four of something they already know about.
  if (before && before.plan !== "free" && before.stripeSubscriptionStatus !== "past_due") {
    await sendEmail({
      to: before.email,
      subject: "Exposed: your payment failed",
      body: [
        "We could not take the payment for your Exposed subscription.",
        "",
        "Your monitoring is still running while Stripe retries. You have not",
        "lost access. Update your card here:",
        "",
        `${env.siteUrl}/dashboard/billing`,
      ].join("\n"),
    });
  }

  return { handled: true };
}

/**
 * Invoices reference a subscription rather than our user, and the subscription
 * id alone is not enough to look one up without an extra API call, so the
 * metadata we set on subscription_data at checkout is what connects them.
 */
function userIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  const fromMetadata = details?.metadata?.userId;
  if (fromMetadata) return fromMetadata;

  const reference = details?.subscription;
  if (reference && typeof reference === "object" && reference.metadata?.userId) {
    return reference.metadata.userId;
  }

  return null;
}

async function revokePlan(userId: string, reason: string): Promise<void> {
  const account = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, plan: true },
  });

  await db
    .update(users)
    .set({ plan: "free", stripeSubscriptionStatus: reason })
    .where(eq(users.id, userId));

  if (account && account.plan !== "free") {
    await sendEmail({
      to: account.email,
      subject: "Exposed: your subscription has ended",
      body: [
        "Your Exposed subscription has ended and the account is back on the free plan.",
        "",
        "Your existing reports and scan history are still here, and nothing was deleted.",
        "",
        `Restart a subscription any time: ${env.siteUrl}/pricing`,
      ].join("\n"),
    });
  }
}

/**
 * Reserves the event id so a redelivery cannot run the handler twice.
 *
 * Returns "claimed" when this delivery owns the work, "done" when the event has
 * already been processed successfully, and "retry" when an earlier attempt
 * inserted the row but then failed, in which case this delivery is the retry
 * and must do the work.
 */
async function claimEvent(event: Stripe.Event): Promise<"claimed" | "done" | "retry"> {
  // Deliberately not the full event payload: it carries customer email
  // addresses and can be tens of kilobytes, and nothing reads it back. The
  // identifying fields and the handler's own summary are what the audit view
  // needs.
  const summary = JSON.stringify({
    type: event.type,
    livemode: event.livemode,
    created: event.created,
  });

  const inserted = await db
    .insert(webhookEvents)
    .values({ id: event.id, eventName: event.type, payloadJson: summary })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  if (inserted.length > 0) return "claimed";

  const existing = await db
    .select({ processedAt: webhookEvents.processedAt })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, event.id))
    .limit(1);

  return existing[0]?.processedAt ? "done" : "retry";
}

async function markProcessed(eventId: string, outcome: Outcome): Promise<void> {
  await db
    .update(webhookEvents)
    .set({
      processedAt: new Date(),
      outcome: outcome.handled ? (outcome.reason ?? "handled") : (outcome.reason ?? "ignored"),
    })
    .where(eq(webhookEvents.id, eventId));
}

export { HANDLED_EVENTS };
