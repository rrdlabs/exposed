import Stripe from "stripe";
import { env } from "@/lib/env";
import { priceIdForPlan, type PlanId } from "./plans";

/**
 * Stripe is the payment processor but NOT our merchant of record. Lemon Squeezy
 * used to remit VAT/sales tax on every sale; that liability now sits with the
 * studio. See the tax note in .env.example before taking real money.
 *
 * Plan state is only ever written from a verified webhook, never from the
 * browser. The return page after checkout exists purely to show the customer
 * something reassuring; it must not be able to grant itself a plan, because
 * anyone can craft a URL to it.
 */

let cached: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = env.stripeSecretKey;
  if (!key) return null;

  if (!cached) {
    cached = new Stripe(key, {
      // Pinned to the version this SDK was generated against. Letting it float
      // would mean a Stripe-side change can alter the shape of the objects this
      // code destructures underneath a deploy, and the SDK's own types would
      // not catch it. Bump deliberately.
      apiVersion: "2026-08-26.dahlia",
      typescript: true,
      appInfo: { name: "Exposed", version: "1.0.0" },
    });
  }

  return cached;
}

export type BillingReadiness =
  | { ready: true }
  | { ready: false; missing: string[] };

/**
 * Everything needed to take a payment, checked together so the operator gets
 * one list of what to fill in rather than discovering the gaps one 500 at a
 * time.
 */
export function billingReadiness(): BillingReadiness {
  const missing: string[] = [];

  if (!env.stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!env.stripePublishableKey) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (!priceIdForPlan("solo")) missing.push("STRIPE_SOLO_PRICE_ID");
  if (!priceIdForPlan("pro")) missing.push("STRIPE_PRO_PRICE_ID");

  return missing.length ? { ready: false, missing } : { ready: true };
}

export const BILLING_NOT_CONFIGURED =
  "Billing is not configured yet. Email founder@rrdlabs.online and we will switch it on.";

export async function createSubscriptionSession(input: {
  userId: string;
  email: string;
  plan: PlanId;
  existingCustomerId?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient();
  const priceId = priceIdForPlan(input.plan);

  if (!stripe) throw new BillingNotConfiguredError(["STRIPE_SECRET_KEY"]);
  if (!priceId) throw new BillingNotConfiguredError([planPriceEnvName(input.plan)]);

  return stripe.checkout.sessions.create({
    // Embedded Checkout renders inside our own page rather than redirecting to
    // a Stripe-hosted one. This is what makes ui_mode mandatory here: it also
    // forbids success_url, so the only post-payment destination is return_url.
    ui_mode: "embedded",
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],

    // Stripe substitutes {CHECKOUT_SESSION_ID} before redirecting.
    return_url: `${env.siteUrl}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

    client_reference_id: input.userId,
    customer: input.existingCustomerId ?? undefined,
    customer_email: input.existingCustomerId ? undefined : input.email,

    // Our own copy of the intent, so a webhook can act on the event alone
    // without a database round trip. client_reference_id is the documented
    // field for this, but metadata is what every event reliably carries.
    metadata: { userId: input.userId, plan: input.plan },

    // Stripe reuses or creates the Customer for a subscription session. When
    // the user already has one we must pass customer (not customer_email,
    // which errors in that case), and we want the subscription to carry our
    // metadata too: later events like customer.subscription.deleted reference
    // only the subscription, never the checkout session.
    subscription_data: { metadata: { userId: input.userId, plan: input.plan } },

    // The customer may change quantity on the pricing page, and the allow
    // list is the guard that stops a tampered request switching them to a
    // different price. Promotions are not used, so they are not promoted.
    allow_promotion_codes: false,
  });
}

function planPriceEnvName(plan: PlanId): string {
  return plan === "pro" ? "STRIPE_PRO_PRICE_ID" : "STRIPE_SOLO_PRICE_ID";
}

export class BillingNotConfiguredError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Billing is not configured. Missing: ${missing.join(", ")}`);
    this.name = "BillingNotConfiguredError";
    this.missing = missing;
  }
}

/**
 * Verifies the Stripe-Signature header against the raw request body.
 *
 * The raw body is the whole point: Stripe computes the signature over the exact
 * bytes it sent, so parsing JSON and re-serialising it invalidates it. The
 * route must therefore read request.text() and never request.json().
 */
export function constructWebhookEvent(rawBody: string, signature: string | null): Stripe.Event {
  const stripe = stripeClient();
  const secret = env.stripeWebhookSecret;

  if (!stripe) throw new BillingNotConfiguredError(["STRIPE_SECRET_KEY"]);
  if (!secret) throw new BillingNotConfiguredError(["STRIPE_WEBHOOK_SECRET"]);
  if (!signature) throw new Error("Missing stripe-signature header.");

  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Self-serve cancellation for the plans that advertise it. The Solo plan page
 * promises "Self-serve cancel", which on Stripe means a Customer Portal
 * session rather than a bespoke cancellation flow.
 */
export async function createPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = stripeClient();
  if (!stripe) throw new BillingNotConfiguredError(["STRIPE_SECRET_KEY"]);

  return stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
}

/**
 * Server-side confirmation of a checkout session for the return page.
 *
 * The tutorial pattern of calling stripe.checkout.sessions.retrieve() from the
 * browser cannot work: a publishable key may only create and read, and a
 * checkout session is not readable with one. Doing it here also means the page
 * never trusts a session id it was handed in the URL.
 */
export async function retrieveCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session | null> {
  const stripe = stripeClient();
  if (!stripe) return null;

  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    // An unknown or already-expired session is not an error worth surfacing to
    // the customer; the return page degrades to "check your email".
    return null;
  }
}
