import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ManageBillingButton from "@/components/ManageBillingButton";
import { requireUser } from "@/lib/auth/require";
import { PLANS, formatPrice, isPaid } from "@/lib/billing/plans";
import { retrieveCheckoutSession } from "@/lib/billing/stripe";

export const metadata: Metadata = {
  title: "Billing — Exposed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where Stripe's return_url lands after checkout, and where a customer manages
 * an existing subscription.
 *
 * The session_id in the query string is confirmed against Stripe's API rather
 * than trusted. It cannot grant anything: the plan is written by the webhook,
 * and this page only decides what to display. That is deliberate, because the
 * URL is attacker-controllable and the client secret is public.
 *
 * There is a real race here worth naming. Stripe fires
 * checkout.session.completed to the webhook at roughly the same moment the
 * browser is redirected here, so on a fast connection this page can load before
 * the webhook has run. It therefore says "we are confirming" rather than
 * "you're on the Pro plan", and re-checks rather than asserting.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const plan = PLANS[user.plan as keyof typeof PLANS] ?? PLANS.free;

  let sessionStatus: "complete" | "incomplete" | "unknown" | null = null;
  if (params.session_id) {
    const session = await retrieveCheckoutSession(params.session_id);
    sessionStatus = session?.status === "complete" ? "complete" : "incomplete";
  }

  const justCheckedOut = params.checkout === "success";
  const paid = isPaid(user.plan);

  return (
    <>
      <SiteHeader authenticated />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/60 transition hover:text-neon"
          >
            &larr; Dashboard
          </Link>

          <h1 className="mt-5 font-display text-3xl font-semibold text-white">Billing</h1>

          {justCheckedOut ? (
            <div className="mt-6 rounded-lg border border-neon/30 bg-neon/5 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
                Payment received
              </p>

              {sessionStatus === "complete" ? (
                <p className="mt-3 text-sm leading-relaxed text-mist">
                  Thanks — your {plan.name} plan is active. A receipt is on its way to{" "}
                  <span className="text-white">{user.email}</span>. This page updates
                  itself once Stripe confirms the subscription.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-mist">
                  Stripe is still confirming your payment. This page normally updates
                  within a few seconds. Your plan is applied by a signed webhook, so it
                  is already recorded even if this page has not caught up yet.
                </p>
              )}
            </div>
          ) : null}

          <section className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-mist/60">
              Current plan
            </h2>

            <div className="mt-4 rounded-lg border border-edge bg-panel/60 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-2xl font-semibold text-white">
                  {plan.name}
                </p>
                <p className="font-mono text-sm text-mist">
                  {plan.priceCents === 0 ? "Free" : `${formatPrice(plan)} / month`}
                </p>
              </div>

              <p className="mt-3 text-sm text-mist/70">
                {plan.maxDomains === 1000
                  ? "Unlimited domains monitored."
                  : `Up to ${plan.maxDomains} domain${plan.maxDomains === 1 ? "" : "s"} monitored.`}
              </p>

              {user.stripeSubscriptionStatus === "past_due" ? (
                <p className="mt-4 rounded border border-cyber-rose/30 bg-cyber-rose/10 px-4 py-3 text-sm text-cyber-rose">
                  Your last payment failed. Your monitoring is still running while
                  Stripe retries — update your card to avoid losing access.
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {paid && user.stripeCustomerId ? (
                  <ManageBillingButton label="Manage or cancel" />
                ) : (
                  <Link
                    href="/pricing"
                    className="rounded-lg bg-neon px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-white"
                  >
                    Choose a plan
                  </Link>
                )}

                <Link
                  href="/dashboard/settings"
                  className="rounded-lg border border-edge-strong bg-panel/60 px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon"
                >
                  Settings
                </Link>
              </div>
            </div>
          </section>

          <p className="mt-8 text-xs leading-relaxed text-mist/50">
            Subscriptions renew monthly and can be cancelled at any time from the
            Stripe portal above. Cancelling keeps your access until the end of the
            period you have already paid for. Reports and scan history are never
            deleted.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
