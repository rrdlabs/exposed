import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { requireUser } from "@/lib/auth/require";
import { PLANS, formatPrice, isPaid } from "@/lib/billing/plans";
import CharityClaimForm from "@/components/CharityClaimForm";

export const metadata: Metadata = {
  title: "Settings — Exposed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const plan = PLANS[user.plan as keyof typeof PLANS] ?? PLANS.free;

  if (user.plan === "solo" && user.lsCustomerPortalUrl) {
    // no-op: portal is surfaced below as a link
  }

  if (!user.email) redirect("/login");

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

          <h1 className="mt-5 font-display text-3xl font-semibold text-white">Settings</h1>

          {/* account */}
          <section className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Account</h2>
            <dl className="mt-4 divide-y divide-[var(--color-edge)] rounded-lg border border-edge bg-void/60">
              <div className="flex flex-wrap justify-between gap-2 px-5 py-4">
                <dt className="text-sm text-mist/70">Email</dt>
                <dd className="font-mono text-sm text-white">{user.email}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 px-5 py-4">
                <dt className="text-sm text-mist/70">Alert address</dt>
                <dd className="font-mono text-sm text-white">{user.email}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2 px-5 py-4">
                <dt className="text-sm text-mist/70">Member since</dt>
                <dd className="font-mono text-sm text-white">
                  {new Date(user.createdAt).toUTCString().slice(0, 16)}
                </dd>
              </div>
            </dl>
          </section>

          {/* plan */}
          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Plan</h2>

            <div className="mt-4 rounded-lg border border-edge bg-void/60 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-sm text-mist">{plan.headline}</p>
                </div>
                <p className="font-display text-3xl font-semibold text-white">
                  {formatPrice(plan)}
                  {plan.interval === "month" ? (
                    <span className="ml-1 font-mono text-sm font-normal text-mist/70">/mo</span>
                  ) : null}
                </p>
              </div>

              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-mist/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                {isPaid(user.plan) ? (
                  <>
                    {user.lsCustomerPortalUrl ? (
                      <a
                        href={user.lsCustomerPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-edge-strong bg-panel/60 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-white transition hover:border-cyber-rose/60 hover:text-cyber-rose"
                      >
                        Manage or cancel billing
                      </a>
                    ) : null}
                    <Link
                      href="/pricing"
                      className="rounded-lg border border-edge-strong bg-panel/60 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon"
                    >
                      Change plan
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/pricing"
                    className="rounded-lg bg-neon px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt"
                  >
                    Upgrade to watch daily
                  </Link>
                )}
              </div>

              {user.lsSubscriptionStatus ? (
                <p className="mt-4 font-mono text-[11px] text-mist/50">
                  Subscription status: {user.lsSubscriptionStatus}
                </p>
              ) : null}
            </div>
          </section>

          {/* charity */}
          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
              Charity monitoring
            </h2>

            {user.charityVerified ? (
              <div className="mt-4 rounded-lg border border-volt/30 bg-volt/5 px-5 py-4">
                <p className="text-sm text-volt">
                  Verified. {user.charityName ?? "Your organisation"} has free Solo monitoring,
                  permanently.
                </p>
              </div>
            ) : user.charityClaimed ? (
              <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-5 py-4">
                <p className="text-sm text-gold">
                  Claim received for {user.charityName ?? "your organisation"}
                  {user.charityNumber ? ` (${user.charityNumber})` : ""}. Being verified by hand,
                  usually within a day.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <CharityClaimForm />
              </div>
            )}
          </section>

          <p className="mt-14 border-t border-edge pt-6 text-sm text-mist/60">
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy
            </Link>{" "}
            ·{" "}
            <a href="mailto:founder@rrdlabs.online" className="underline underline-offset-4">
              founder@rrdlabs.online
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
