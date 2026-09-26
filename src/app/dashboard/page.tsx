import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { findings, scans, targets } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { maxDomainsFor, PLANS } from "@/lib/billing/plans";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import AddDomainForm from "@/components/AddDomainForm";
import { SEVERITY_META } from "@/components/SeverityBadge";

export const dynamic = "force-dynamic";

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser();
  const { checkout } = await searchParams;

  const rows = await db
    .select({ target: targets })
    .from(targets)
    .where(eq(targets.userId, user.id))
    .orderBy(desc(targets.createdAt));

  const limit = maxDomainsFor(user.plan);
  const used = rows.length;

  const summary = await Promise.all(
    rows.map(async ({ target }) => {
      const [open] = await db
        .select({ n: count() })
        .from(findings)
        .where(and(eq(findings.targetId, target.id), isNull(findings.resolvedAt)));

      const perSeverity = await Promise.all(
        SEVERITIES.map(async (severity) => {
          const [row] = await db
            .select({ n: count() })
            .from(findings)
            .where(
              and(
                eq(findings.targetId, target.id),
                isNull(findings.resolvedAt),
                eq(findings.severity, severity),
              ),
            );
          return [severity, row?.n ?? 0] as const;
        }),
      );

      const [scanCount] = await db
        .select({ n: count() })
        .from(scans)
        .where(and(eq(scans.targetId, target.id), eq(scans.status, "complete")));

      return {
        target,
        open: open?.n ?? 0,
        counts: Object.fromEntries(perSeverity) as Record<string, number>,
        scans: scanCount?.n ?? 0,
      };
    }),
  );

  const totals = summary.reduce(
    (acc, item) => {
      for (const severity of SEVERITIES) {
        acc[severity] = (acc[severity] ?? 0) + (item.counts[severity] ?? 0);
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <SiteHeader authenticated />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neon">
                Dashboard
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
                {user.name || user.email}
              </h1>
              <p className="mt-2 font-mono text-[12px] text-mist/70">
                {PLANS[user.plan as keyof typeof PLANS]?.name ?? user.plan} plan ·{" "}
                {used} of {limit === 1000 ? "unlimited" : limit} domains
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard/settings"
                className="rounded-lg border border-edge-strong bg-panel/60 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon"
              >
                Settings
              </Link>
              {user.plan === "free" ? (
                <Link
                  href="/pricing"
                  className="rounded-lg bg-neon px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt"
                >
                  Upgrade
                </Link>
              ) : null}
            </div>
          </div>

          {checkout === "success" ? (
            <div className="mt-8 rounded-lg border border-volt/30 bg-volt/5 px-5 py-4">
              <p className="font-mono text-[12px] text-volt">
                Payment received. Your plan updates the moment the webhook lands — usually within a
                few seconds. Refresh in a moment if the plan above still says Free.
              </p>
            </div>
          ) : null}

          {user.charityClaimed && !user.charityVerified ? (
            <div className="mt-8 rounded-lg border border-gold/30 bg-gold/5 px-5 py-4">
              <p className="font-mono text-[12px] text-gold">
                Charity claim received. It is being verified by hand, usually within a day.
              </p>
            </div>
          ) : null}

          {/* totals */}
          {summary.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-5">
              {SEVERITIES.map((severity) => (
                <div key={severity} className="bg-panel/80 px-4 py-4">
                  <p
                    className="font-display text-2xl font-semibold"
                    style={{
                      color: totals[severity]
                        ? SEVERITY_META[severity].color
                        : "#3d4a63",
                    }}
                  >
                    {totals[severity] ?? 0}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-mist/70">
                    {SEVERITY_META[severity].label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* domains */}
          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              Monitored domains
            </h2>

            {summary.length === 0 ? (
              <div className="mt-5 rounded-xl border border-edge bg-void/60 p-8 text-center">
                <p className="text-mist">No domains yet. Add one below to get started.</p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {summary.map(({ target, open, counts, scans: scanCount }) => {
                  return (
                    <li key={target.id}>
                      <Link
                        href={`/dashboard/${target.id}`}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-edge bg-void/60 p-5 transition hover:border-neon/40"
                      >
                        <div className="min-w-0">
                          <p className="break-all font-display text-lg font-semibold text-white">
                            {target.domain}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-mist/60">
                            {scanCount} scan{scanCount === 1 ? "" : "s"} ·{" "}
                            {target.lastScanAt
                              ? `last ${new Date(target.lastScanAt).toUTCString().slice(0, 17)}`
                              : "never scanned"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {SEVERITIES.filter((s) => (counts[s] ?? 0) > 0).map((severity) => (
                            <span
                              key={severity}
                              className="rounded border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                              style={{
                                color: SEVERITY_META[severity].color,
                                borderColor: `${SEVERITY_META[severity].color}55`,
                                background: `${SEVERITY_META[severity].color}14`,
                              }}
                            >
                              {counts[severity]} {severity}
                            </span>
                          ))}
                          {open === 0 ? (
                            <span className="rounded border border-volt/30 bg-volt/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-volt">
                              clean
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              Add a domain
            </h2>
            <div className="mt-5">
              {used >= limit ? (
                <div className="rounded-lg border border-gold/30 bg-gold/5 px-5 py-4">
                  <p className="text-sm text-mist">
                    You are on the {PLANS[user.plan as keyof typeof PLANS]?.name} plan with{" "}
                    {limit === 1000 ? "unlimited" : limit} domain{limit === 1 ? "" : "s"}.{" "}
                    <Link href="/pricing" className="text-neon underline underline-offset-4">
                      Upgrade to add more
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <AddDomainForm />
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
