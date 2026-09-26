import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/util/id";
import { planForVariant, type PlanId } from "./plans";

/**
 * Lemon Squeezy is our merchant of record: they take the payment, handle
 * sales tax and VAT in every country, and pay us out. That keeps the tax
 * burden off a one-person studio.
 */

export function buildCheckoutUrl(input: {
  variantId: string;
  userId: string;
  email: string;
  plan: PlanId;
}): string | null {
  const storeId = env.lemonSqueezyStoreId;
  if (!storeId) return null;

  const slug = process.env.LEMON_SQUEEZY_STORE_SLUG;
  if (!slug) return null;

  const params = new URLSearchParams({
    "checkout[custom][user_id]": input.userId,
    "checkout[email]": input.email,
    "checkout[success_url]": `${env.siteUrl}/dashboard?checkout=success`,
    "checkout[embed]": "false",
  });

  void input.plan;

  return `https://${slug}.lemonsqueezy.com/checkout/buy/${input.variantId}?${params.toString()}`;
}

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(digest, "utf8");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export type LsSubscriptionEvent = {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      ends_at?: string | null;
      renews_at?: string | null;
      customer_id?: number;
      variant_id?: number | null;
      first_subscription_item?: { variant_id?: number | null } | null;
      urls?: { customer_portal?: string | null } | null;
      user_email?: string;
      test_mode?: boolean;
    };
  };
};

const ACTIVE_STATUSES = new Set(["on_going", "trialing", "active"]);

/**
 * Lemon Squeezy keeps a cancelled subscription usable until ends_at, so a
 * cancellation must not revoke access the customer already paid for.
 */
function resolvePlan(attrs: NonNullable<LsSubscriptionEvent["data"]>["attributes"]): {
  plan: PlanId;
  active: boolean;
} {
  const variantId = attrs?.first_subscription_item?.variant_id ?? attrs?.variant_id ?? null;
  const paid = planForVariant(variantId ? String(variantId) : null);
  const status = attrs?.status ?? "";

  if (ACTIVE_STATUSES.has(status)) {
    return { plan: paid ?? "solo", active: true };
  }

  if (status === "cancelled" || status === "expired") {
    const endsAt = attrs?.ends_at ? Date.parse(attrs.ends_at) : 0;
    if (endsAt > Date.now()) {
      return { plan: paid ?? "solo", active: true };
    }
  }

  return { plan: "free", active: false };
}

export async function handleWebhook(rawBody: string, event: LsSubscriptionEvent): Promise<{
  outcome: string;
  duplicate: boolean;
}> {
  const eventName = event.meta?.event_name ?? "unknown";
  const subscriptionId = event.data?.id ? `sub_${event.data.id}` : newId("evt_");

  const inserted = await db
    .insert(webhookEvents)
    .values({
      id: `${subscriptionId}:${eventName}`,
      eventName,
      payloadJson: rawBody.slice(0, 8000),
    })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  if (inserted.length === 0) {
    return { outcome: "duplicate", duplicate: true };
  }

  const customUserId = event.meta?.custom_data?.user_id;
  const email = event.data?.attributes?.user_email;

  let user =
    customUserId
      ? await db.query.users.findFirst({ where: eq(users.id, customUserId) })
      : null;

  if (!user && email) {
    user = await db.query.users.findFirst({ where: eq(users.email, email) });
  }

  if (!user) {
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date(), outcome: "no matching account" })
      .where(eq(webhookEvents.id, `${subscriptionId}:${eventName}`));
    return { outcome: "no matching account", duplicate: false };
  }

  const { plan, active } = resolvePlan(event.data?.attributes);
  const attrs = event.data?.attributes;

  await db
    .update(users)
    .set({
      plan,
      lsSubscriptionId: subscriptionId,
      lsCustomerId: attrs?.customer_id ? String(attrs.customer_id) : user.lsCustomerId,
      lsSubscriptionStatus: attrs?.status ?? null,
      lsCustomerPortalUrl: attrs?.urls?.customer_portal ?? user.lsCustomerPortalUrl,
    })
    .where(eq(users.id, user.id));

  await db
    .update(webhookEvents)
    .set({ processedAt: new Date(), outcome: `plan=${plan} active=${active}` })
    .where(eq(webhookEvents.id, `${subscriptionId}:${eventName}`));

  return { outcome: `plan=${plan}`, duplicate: false };
}
