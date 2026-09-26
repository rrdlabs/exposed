export type PlanId = "free" | "solo" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  interval: "once" | "month";
  maxDomains: number;
  headline: string;
  features: string[];
  variantEnv: "LEMON_SQUEEZY_SOLO_VARIANT_ID" | "LEMON_SQUEEZY_PRO_VARIANT_ID" | null;
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
    variantEnv: null,
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
    variantEnv: "LEMON_SQUEEZY_SOLO_VARIANT_ID",
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
    variantEnv: "LEMON_SQUEEZY_PRO_VARIANT_ID",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "solo", "pro"];

export function planForVariant(variantId: string | null | undefined): PlanId | null {
  if (!variantId) return null;
  if (process.env.LEMON_SQUEEZY_SOLO_VARIANT_ID === variantId) return "solo";
  if (process.env.LEMON_SQUEEZY_PRO_VARIANT_ID === variantId) return "pro";
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
