import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutButton from "@/components/CheckoutButton";
import Reveal from "@/components/Reveal";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { PLANS, formatPrice } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing — Exposed",
  description:
    "One free scan, then $19/mo to watch a domain daily, or $49/mo for unlimited. Free for registered charities.",
};

export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "What exactly do you read?",
    a: "Public Certificate Transparency logs, public DNS records, the TLS handshake and ordinary HTTP response headers. That is the whole input list. We do not port scan, brute force, fuzz, or send payloads, and we never touch a private system.",
  },
  {
    q: "Do I need to prove I own the domain?",
    a: "Not to sign up. If we ever question a claim, we will ask you to add a TXT record or a file under /.well-known/ and we will drop the account if you cannot. We only ever scan domains you are authorised to monitor, and the terms make that your responsibility.",
  },
  {
    q: "What counts as an alert?",
    a: "A finding that was not open during the previous scan. A new subdomain, a changed DNS record, a certificate entering its expiry window, a header disappearing, a host that stopped resolving. Findings that persist do not re-alert.",
  },
  {
    q: "Can I cancel myself?",
    a: "Yes. Every plan is self-serve through the billing portal, which Lemon Squeezy hosts. You keep access until the end of the period you already paid for, then drop to the free tier with your history intact.",
  },
  {
    q: "Why Lemon Squeezy and not Stripe?",
    a: "Because they act as merchant of record and handle sales tax and VAT in every country. One person should not be handling international tax registration. They take 5% plus 50c and pass the rest through.",
  },
  {
    q: "What happens to my data?",
    a: "We store the domain, the findings, and the scan history needed to diff against the next scan. Passwords are hashed with scrypt. We never sell anything and there is no third-party analytics on this site.",
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const currentPlan = user?.plan ?? "free";

  if (user && currentPlan !== "free") {
    redirect("/dashboard/settings");
  }

  return (
    <>
      <SiteHeader authenticated={!!user} />
      <main className="relative flex-1">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">Pricing</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            One scan is free. Watching it is the subscription.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mist">
            No seat pricing, no per-page tiers, no annual contract. Cancel yourself whenever.
          </p>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {(["free", "solo", "pro"] as const).map((id) => {
              const plan = PLANS[id];
              const featured = id === "solo";
              const isCurrent = currentPlan === id;

              return (
                <Reveal key={id}>
                  <div
                    className={`flex h-full flex-col rounded-xl border p-7 ${
                      featured ? "border-neon/40 bg-neon/[0.04]" : "border-edge bg-void/60"
                    }`}
                  >
                    {featured ? (
                      <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neon">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
                        Most people pick this
                      </p>
                    ) : null}

                    <h2 className="font-display text-2xl font-semibold text-white">{plan.name}</h2>
                    <p className="mt-1 text-sm text-mist">{plan.headline}</p>

                    <p className="mt-6 font-display text-5xl font-semibold text-white">
                      {formatPrice(plan)}
                      {plan.interval === "month" ? (
                        <span className="ml-1 font-mono text-sm font-normal text-mist/70">/mo</span>
                      ) : null}
                    </p>

                    <ul className="mt-7 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-mist/90">
                          <svg
                            className="mt-1 shrink-0"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={featured ? "#22d3ee" : "#a3e635"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7">
                      {id === "free" ? (
                        <Link
                          href={user ? "/dashboard" : "/signup"}
                          className={`block rounded-lg py-3.5 text-center font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition ${
                            featured
                              ? "bg-neon text-void hover:bg-volt"
                              : "border border-edge-strong bg-panel/60 text-white hover:border-neon/60 hover:text-neon"
                          }`}
                        >
                          {user ? "Go to dashboard" : "Start free"}
                        </Link>
                      ) : user ? (
                        <CheckoutButton
                          plan={id}
                          label={`Upgrade to ${plan.name}`}
                          featured={featured}
                        />
                      ) : (
                        <Link
                          href={`/signup`}
                          className={`block rounded-lg py-3.5 text-center font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition ${
                            featured
                              ? "bg-neon text-void hover:bg-volt"
                              : "border border-edge-strong bg-panel/60 text-white hover:border-neon/60 hover:text-neon"
                          }`}
                        >
                          Create an account
                        </Link>
                      )}
                    </div>

                    {isCurrent ? (
                      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-volt">
                        Your current plan
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="mt-12 rounded-xl border border-gold/25 bg-gold/[0.04] p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
              Registered charities and nonprofits
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white">
              You monitor for free. No trial, no expiry.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist">
              Claim it with your registration number and we will verify and switch it on, usually
              within a day. Full Solo features, permanently, at no cost.
            </p>
            <Link
              href="/charity"
              className="mt-6 inline-block rounded-lg bg-gold px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-neon"
            >
              Claim free monitoring
            </Link>
          </div>

          <section className="mt-20">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              Questions, answered
            </h2>
            <dl className="mt-8 divide-y divide-[var(--color-edge)]">
              {FAQ.map((item) => (
                <div key={item.q} className="py-6">
                  <dt className="font-display text-lg font-semibold text-white">{item.q}</dt>
                  <dd className="mt-2.5 max-w-3xl leading-relaxed text-mist">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
