import Link from "next/link";
import Reveal from "@/components/Reveal";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ScanForm from "@/components/ScanForm";
import { SEVERITY_META } from "@/components/SeverityBadge";
import { PLANS, formatPrice } from "@/lib/billing/plans";
import type { Severity } from "@/lib/scan/types";

const SOURCES = [
  {
    label: "Certificate Transparency",
    text: "Every certificate a CA has ever issued is public. We read those logs to find hostnames on your domain that nobody remembers adding.",
  },
  {
    label: "Public DNS",
    text: "Records, and the ones that point at providers you stopped using. A CNAME to a dead host is a takeover waiting to happen.",
  },
  {
    label: "TLS handshake",
    text: "Expiry, issuer, hostname match, and whether the server still shakes hands with TLS 1.0 from 2014.",
  },
  {
    label: "Response headers",
    text: "HSTS, CSP, framing, sniffing, referrers, plus plaintext login forms and server version banners.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Scan it once, free",
    text: "No account. Enter a domain and get a real report in about fifteen seconds. This is the part most tools charge for.",
  },
  {
    n: "02",
    title: "We keep watching",
    text: "Every day we take a fresh snapshot of all of it and diff it against the last one. New hostnames, changed records, expiring certificates.",
  },
  {
    n: "03",
    title: "You get told first",
    text: "The moment something appears that was not there yesterday, an alert lands in your inbox. That is the whole product.",
  },
];

const RULES: { rule: string; sev: Severity; why: string }[] = [
  { rule: "Dangling CNAME", sev: "critical", why: "Subdomain takeover" },
  { rule: "Certificate expired", sev: "critical", why: "Browser warnings" },
  { rule: "Expired nameservers", sev: "critical", why: "Domain is dead" },
  { rule: "TLS 1.0 accepted", sev: "high", why: "Downgrade attacks" },
  { rule: "Cert hostname mismatch", sev: "high", why: "Name warning" },
  { rule: "Self-signed cert", sev: "high", why: "Unverifiable TLS" },
  { rule: "HTTP not forced", sev: "high", why: "Plaintext traffic" },
  { rule: "Login form over HTTP", sev: "high", why: "Credentials in clear" },
  { rule: "Missing HSTS", sev: "medium", why: "Stripped to HTTP" },
  { rule: "New subdomain", sev: "medium", why: "Someone else added it" },
  { rule: "New DNS record", sev: "medium", why: "Unauthorised change" },
  { rule: "No DMARC", sev: "medium", why: "Email spoofing" },
  { rule: "Missing CSP", sev: "low", why: "XSS exposure" },
  { rule: "Version disclosure", sev: "low", why: "Free recon" },
  { rule: "No CAA record", sev: "info", why: "Cert impersonation" },
];

const SAMPLE = [
  {
    sev: "critical" as const,
    title: "Dangling CNAME — subdomain takeover risk",
    subject: "staging.internal.acme.example",
    detail:
      "staging.internal.acme.example points at acme-tickets.herokuapp.com, but that target does not resolve to any address. Anyone able to claim that Heroku app can silently take over the subdomain.",
  },
  {
    sev: "high" as const,
    title: "Certificate does not match this hostname",
    subject: "www.acme.example",
    detail:
      "The certificate served by www.acme.example failed verification (ERR_TLS_CERT_ALTNAME_INVALID). Visitors get a name-mismatch warning.",
  },
  {
    sev: "medium" as const,
    title: "New subdomain appeared",
    subject: "grafana.acme.example",
    detail:
      "grafana.acme.example showed up in Certificate Transparency logs since the last scan. If you did not add it, someone else registered it on your domain.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="relative flex-1">
        {/* ---------------- hero ---------------- */}
        <section className="relative overflow-hidden border-b border-edge">
          <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-neon/10 blur-[140px]" />

          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon">
              rrdlabs.online presents
            </p>

            <h1 className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Know the second your <span className="text-gradient">attack surface changes</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mist">
              Most security tools give you a report and then forget about you. Exposed takes a fresh
              snapshot of your public footprint every day, diffs it against the last one, and tells
              you the moment something appears that was not there yesterday.
            </p>

            <div className="mt-10">
              <ScanForm />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em] text-mist/60">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                No account needed
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                Read-only, passive
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                Free for registered charities
              </span>
            </div>
          </div>
        </section>

        {/* ---------------- terminal ---------------- */}
        <section className="border-b border-edge bg-abyss/50">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="overflow-hidden rounded-xl border border-edge bg-void/80">
              <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-cyber-rose/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-gold/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-volt/60" />
                <span className="ml-2 font-mono text-[11px] text-mist/60">exposed — passive scan</span>
              </div>
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-mist">
                <code>
                  {`$ exposed scan acme.example
  ✓ certificate transparency      14 hostnames discovered
  ✓ dns records                  A AAAA MX NS TXT CAA
  ✓ tls                          TLS1.3 · valid 214d
  ✓ response headers              5 of 6 recommended present
  ! dangling_cname                staging.internal.acme.example
  ! cert_hostname_mismatch        www.acme.example
  ! missing_dmarc                 no v=dmarc1 in TXT

  3 findings · 14 hostnames · 4 sources · 1.9s
  passive only: no port scanning, no payloads, no brute force

  $ _`}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* ---------------- the gap ---------------- */}
        <section className="border-b border-edge">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:py-24">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyber-rose">
                The gap
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A scan is a photograph. Exposure is a film.
              </h2>
              <p className="mt-5 leading-relaxed text-mist">
                A one-time audit tells you what was true on the day. It cannot tell you that someone
                registered a subdomain in your name six hours ago, that your mail records changed, or
                that your certificate quietly stopped being renewed.
              </p>
              <p className="mt-4 leading-relaxed text-mist">
                Those are the changes that actually get exploited, and they are the ones nobody looks
                at. Watching is the product. The first scan is free so you can see what you have
                been missing.
              </p>
            </Reveal>

            <Reveal>
              <div className="space-y-4">
                {SOURCES.map((source) => (
                  <div key={source.label} className="rounded-lg border border-edge bg-panel/40 p-5">
                    <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-neon">
                      {source.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-mist">{source.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section id="how" className="scroll-mt-24 border-b border-edge bg-abyss/50">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">How it works</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Three steps. Fifteen seconds to the first one.
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <Reveal key={step.n}>
                  <div className="h-full rounded-xl border border-edge bg-void/60 p-6">
                    <p className="font-mono text-[11px] tracking-[0.2em] text-neon/70">{step.n}</p>
                    <h3 className="mt-4 font-display text-xl font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-mist">{step.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- rules ---------------- */}
        <section className="border-b border-edge">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
                What it looks for
              </p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Every check, in the open
              </h2>
              <p className="mt-5 leading-relaxed text-mist">
                No black box and no marketing adjectives. These are the actual rules, with the actual
                severities, and the reasoning behind each one.
              </p>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {RULES.map((rule) => (
                <div
                  key={rule.rule}
                  className="flex items-center justify-between gap-4 rounded-lg border border-edge bg-panel/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12.5px] text-white">{rule.rule}</p>
                    <p className="mt-0.5 truncate text-xs text-mist/60">{rule.why}</p>
                  </div>
                  <span
                    className="shrink-0 rounded border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                    style={{
                      color: SEVERITY_META[rule.sev].color,
                      borderColor: `${SEVERITY_META[rule.sev].color}55`,
                      background: `${SEVERITY_META[rule.sev].color}14`,
                    }}
                  >
                    {rule.sev}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- sample ---------------- */}
        <section className="border-b border-edge bg-abyss/50">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <Reveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
                  Example output
                </p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Plain language, not a wall of jargon
                </h2>
                <p className="mt-5 leading-relaxed text-mist">
                  Every finding explains what an attacker could actually do about it, and what to
                  change. No CVE parade, no risk score out of ten telling you nothing.
                </p>
                <p className="mt-4 leading-relaxed text-mist">
                  And the one you cannot act on is the whole point of a subscription:{" "}
                  <span className="text-neon">new subdomain appeared</span> while you slept.
                </p>
              </Reveal>

              <Reveal>
                <ul className="space-y-3">
                  {SAMPLE.map((finding) => (
                    <li
                      key={finding.title}
                      className="rounded-lg border border-edge border-l-2 border-l-cyber-rose/60 bg-void/60 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="font-display text-base font-semibold text-white">
                          {finding.title}
                        </h3>
                        <span
                          className="rounded border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                          style={{
                            color: SEVERITY_META[finding.sev].color,
                            borderColor: `${SEVERITY_META[finding.sev].color}55`,
                            background: `${SEVERITY_META[finding.sev].color}14`,
                          }}
                        >
                          {finding.sev}
                        </span>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-mist">{finding.detail}</p>
                      <p className="mt-3 inline-block rounded border border-edge bg-panel/60 px-2 py-1 font-mono text-[11px] text-neon">
                        {finding.subject}
                      </p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------------- pricing preview ---------------- */}
        <section className="border-b border-edge">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">Pricing</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The first scan is free. Watching is the subscription.
            </h2>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {(["free", "solo", "pro"] as const).map((id) => {
                const plan = PLANS[id];
                const featured = id === "solo";
                return (
                  <Reveal key={id}>
                    <div
                      className={`flex h-full flex-col rounded-xl border p-7 ${
                        featured
                          ? "border-neon/40 bg-neon/[0.04]"
                          : "border-edge bg-void/60"
                      }`}
                    >
                      {featured ? (
                        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neon">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
                          Most people pick this
                        </p>
                      ) : null}

                      <h3 className="font-display text-xl font-semibold text-white">{plan.name}</h3>
                      <p className="mt-1 text-sm text-mist">{plan.headline}</p>
                      <p className="mt-5 font-display text-4xl font-semibold text-white">
                        {formatPrice(plan)}
                        {plan.interval === "month" ? (
                          <span className="ml-1 font-mono text-sm font-normal text-mist/70">
                            /mo
                          </span>
                        ) : null}
                      </p>

                      <ul className="mt-6 flex-1 space-y-2.5">
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

                      <Link
                        href={id === "free" ? "/#top" : "/pricing"}
                        className={`mt-7 inline-flex items-center justify-center rounded-lg px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition ${
                          featured
                            ? "bg-neon text-void hover:bg-volt"
                            : "border border-edge-strong bg-panel/60 text-white hover:border-neon/60 hover:text-neon"
                        }`}
                      >
                        {id === "free" ? "Scan a domain" : "Start watching"}
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <p className="mt-8 text-center text-sm text-mist/70">
              Registered charities and nonprofits monitor for free.{" "}
              <Link href="/charity" className="text-neon underline underline-offset-4">
                Apply here
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ---------------- charity ---------------- */}
        <section className="border-b border-edge bg-abyss/50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-gold/25 bg-gold/[0.04] p-8 lg:flex-row lg:items-center">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
                  For nonprofits
                </p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                  If you are a registered charity, this is free.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist">
                  No budget for security tooling is not a moral failing. Claim it with your
                  registration number and we will switch your monitoring on at no cost, permanently.
                </p>
              </div>
              <Link
                href="/charity"
                className="shrink-0 rounded-lg bg-gold px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-neon"
              >
                Claim free monitoring
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- cta ---------------- */}
        <section id="top" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-neon/10 blur-[140px]" />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Find out what you are already exposing.
            </h2>
            <p className="mt-4 text-mist">Free, no account, about fifteen seconds.</p>
            <div className="mx-auto mt-10 max-w-xl text-left">
              <ScanForm compact />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
