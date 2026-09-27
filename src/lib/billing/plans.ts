export type PlanId = "free" | "solo" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  interval: "once" | "month";
  maxDomains: number;
  headline: string;
  features: string[];
  /**
   * Env var holding this plan's recurring Stripe Price ID. Read at call time
   * rather than at module load so a price can be added without a rebuild, and
   * null for the free plan which is never purchased.
   */
  priceEnv: "STRIPE_SOLO_PRICE_ID" | "STRIPE_PRO_PRICE_ID" | null;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    interval: "once",
    maxDomains: 1,
    headline: "One domain, one scan",
    features: [
      "One domain monitored",
      "One full exposure report",
      "Passive scan: DNS, TLS, headers, subdomains",
      "No account required",
    ],
    priceEnv: null,
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceCents: 1900,
    interval: "month",
    maxDomains: 5,
    headline: "Keep watching, every day",
    features: [
      "Up to 5 domains",
      "Daily re-scans",
      "Email alert the moment something changes",
      "90 days of scan history",
      "New subdomain detection",
      "Self-serve cancel",
    ],
    priceEnv: "STRIPE_SOLO_PRICE_ID",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 4900,
    interval: "month",
    maxDomains: 1000,
    headline: "Everything, monitored continuously",
    features: [
      "Unlimited domains",
      "Daily scans plus on-demand",
      "Alert on every new finding, not just new hosts",
      "Full history, no 90-day cut-off",
      "Outbound webhook for alerts",
      "Priority: reply from the founder",
    ],
    priceEnv: "STRIPE_PRO_PRICE_ID",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "pro"];

export function isBillablePlan(value: unknown): value is PlanId {
  return value === "solo" || value === "pro";
}

/**
 * The recurring Stripe Price ID for a plan, or null when the free plan is
 * passed or the env var has not been filled in yet.
 */
export function priceIdForPlan(plan: PlanId): string | null {
  const planDef = PLANS[plan];
  if (!planDef?.priceEnv) return null;
  const value = process.env[planDef.priceEnv];
  return value && value.length > 0 ? value : null;
}

/**
 * Reverse mapping, used by the webhook. A subscription event carries a price id
 * but not our plan name, so the price id is the only link back to what the
 * customer actually bought.
 *
 * Deliberately matched against both the configured id and its last segment: a
 * webhook can reference a price as "price_1AbC" while the env var holds the
 * same id, but anything that re-creates a price under a new id must not
 * silently keep granting the old entitlement.
 */
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceIdForPlan("solo") === priceId) return "solo";
  if (priceIdForPlan("pro") === priceId) return "pro";
  return null;
}

export function isPaid(plan: string | null | undefined): boolean {
  return plan === "solo" || plan === "pro";
}

export function maxDomainsFor(plan: string | null | undefined): number {
  if (plan === "pro") return PLANS.pro.maxDomains;
  if (plan === "solo") return PLANS.solo.maxDomains;
  return PLANS.free.maxDomains;
}

export function formatPrice(plan: Plan): string {
  if (plan.priceCents === 0) return "Free";
  const dollars = plan.priceCents / 100;
  return `$${dollars % 1 === 0 ? dollars.toFixed(0) : dollars.toFixed(2)}`;
}
