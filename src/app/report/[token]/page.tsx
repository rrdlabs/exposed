import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { anonScans } from "@/lib/db/schema";
import type { Finding, Snapshot } from "@/lib/scan/types";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FindingList, { SeveritySummary, countBySeverity } from "@/components/FindingList";
import { SEVERITY_META } from "@/components/SeverityBadge";
import { PLANS, formatPrice } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

type TokenParams = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: TokenParams): Promise<Metadata> {
  const { token } = await params;
  const row = await db.query.anonScans.findFirst({ where: eq(anonScans.token, token) });
  if (!row) return { title: "Report not found — Exposed" };

  const findings = JSON.parse(row.findingsJson) as Finding[];
  const counts = countBySeverity(findings);

  return {
    title: `${row.domain} exposure report — Exposed`,
    description: `Passive exposure scan of ${row.domain}: ${findings.length} findings across ${counts.critical ?? 0} critical, ${counts.high ?? 0} high. Powered by Exposed by rrdlabs.online.`,
    robots: { index: false, follow: true },
  };
}

export default async function ReportPage({ params }: TokenParams) {
  const { token } = await params;

  const row = await db.query.anonScans.findFirst({ where: eq(anonScans.token, token) });
  if (!row) notFound();

  const findings = JSON.parse(row.findingsJson) as Finding[];
  const snapshot = JSON.parse(row.snapshotJson) as Snapshot;
  const counts = countBySeverity(findings);
  const actionable = findings.filter((f) => f.severity !== "info").length;

  const worst = ["critical", "high", "medium", "low", "info"].find((s) => (counts[s] ?? 0) > 0);

  return (
    <>
      <SiteHeader />

      <main className="relative flex-1">
        <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0" />

        <div className="relative mx-auto max-w-5xl px-6 py-14">
          {/* verdict */}
          <div className="rounded-xl border border-edge bg-void/70 p-7 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">
                  Exposure report
                </p>
                <h1 className="mt-3 break-all font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {row.domain}
                </h1>
                <p className="mt-3 font-mono text-[12px] text-mist/70">
                  scanned {new Date(snapshot.scannedAt).toUTCString().slice(0, 22)} ·{" "}
                  {snapshot.ct.subdomains.length} hostnames · {(row.durationMs ?? 0) / 1000}s · passive
                </p>
              </div>

              <div
                className="shrink-0 rounded-lg border px-5 py-4 text-center"
                style={{
                  borderColor: worst ? `${SEVERITY_META[worst as keyof typeof SEVERITY_META].color}55` : undefined,
                  background: worst
                    ? `${SEVERITY_META[worst as keyof typeof SEVERITY_META].color}14`
                    : undefined,
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: worst
                      ? SEVERITY_META[worst as keyof typeof SEVERITY_META].color
                      : "#a3e635",
                  }}
                >
                  {worst ? `${worst} risk` : "clean"}
                </p>
                <p className="mt-1 font-display text-3xl font-semibold text-white">
                  {findings.length}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-mist/60">
                  findings
                </p>
              </div>
            </div>

            <div className="mt-7">
              <SeveritySummary findings={findings} />
            </div>

            {snapshot.warnings.length > 0 ? (
              <div className="mt-6 rounded-lg border border-gold/25 bg-gold/[0.04] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                  Partial results
                </p>
                <ul className="mt-2 space-y-1">
                  {snapshot.warnings.map((warning) => (
                    <li key={warning} className="text-xs text-mist/80">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* findings */}
          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              {findings.length} finding{findings.length === 1 ? "" : "s"}
            </h2>
            <div className="mt-5">
              <FindingList findings={findings} />
            </div>
          </section>

          {/* observed surface */}
          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              What we observed
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-edge bg-panel/40 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
                  Hostnames in CT logs
                </p>
                {snapshot.ct.subdomains.length === 0 ? (
                  <p className="mt-3 text-sm text-mist/60">None discovered.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {snapshot.ct.subdomains.slice(0, 40).map((host) => (
                      <li
                        key={host}
                        className="rounded border border-edge bg-void/60 px-2 py-1 font-mono text-[11px] text-mist"
                      >
                        {host}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-edge bg-panel/40 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/70">
                  Public DNS records
                </p>
                {Object.keys(snapshot.dns.root).length === 0 ? (
                  <p className="mt-3 text-sm text-mist/60">No records returned.</p>
                ) : (
                  <dl className="mt-3 space-y-2">
                    {Object.entries(snapshot.dns.root).map(([type, values]) => (
                      <div key={type} className="flex gap-3 text-xs">
                        <dt className="w-14 shrink-0 font-mono text-neon">{type}</dt>
                        <dd className="min-w-0 break-all text-mist">{values.join(" · ")}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </section>

          {/* conversion */}
          <section className="mt-14 rounded-xl border border-neon/25 bg-neon/[0.03] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              {actionable > 0 ? `${actionable} of these need attention` : "Keep it that way"}
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              This was a snapshot. The next change will not email you.
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-mist">
              Free accounts monitor one domain with a single scan. Paid accounts re-scan daily and
              alert you the moment a new host, record or certificate appears — including the changes
              that happen while nobody is looking.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-neon px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt"
              >
                Start watching {row.domain}
              </Link>
              <Link
                href={`/signup?domain=${encodeURIComponent(row.domain)}`}
                className="rounded-lg border border-edge-strong bg-panel/60 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon"
              >
                From {formatPrice(PLANS.solo)}/mo
              </Link>
            </div>

            <p className="mt-6 text-xs text-mist/60">
              Free for registered charities —{" "}
              <Link href="/charity" className="text-gold underline underline-offset-4">
                claim monitoring free
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
