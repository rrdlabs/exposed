import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { findings, scans, targets } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { maxDomainsFor, PLANS } from "@/lib/billing/plans";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FindingList, { SeveritySummary, countBySeverity } from "@/components/FindingList";
import DomainActions from "@/components/DomainActions";
import type { Finding } from "@/lib/scan/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const target = await db.query.targets.findFirst({ where: eq(targets.id, id) });
  return { title: target ? `${target.domain} — Exposed` : "Exposed" };
}

export default async function TargetPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();

  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, id), eq(targets.userId, user.id)),
  });
  if (!target) notFound();

  const history = await db
    .select({
      id: scans.id,
      status: scans.status,
      trigger: scans.trigger,
      startedAt: scans.startedAt,
      finishedAt: scans.finishedAt,
      durationMs: scans.durationMs,
      error: scans.error,
    })
    .from(scans)
    .where(eq(scans.targetId, target.id))
    .orderBy(desc(scans.startedAt))
    .limit(14);

  const openRows = await db
    .select()
    .from(findings)
    .where(and(eq(findings.targetId, target.id), isNull(findings.resolvedAt)))
    .orderBy(desc(findings.firstSeenAt));

  // Deduplicate: an identical finding re-observed across scans is one open issue.
  const seen = new Set<string>();
  const open: Finding[] = [];
  for (const row of openRows) {
    if (seen.has(row.fingerprint)) continue;
    seen.add(row.fingerprint);
    open.push({
      ruleId: row.ruleId,
      fingerprint: row.fingerprint,
      severity: row.severity as Finding["severity"],
      title: row.title,
      detail: row.detail ?? "",
      subject: row.subject ?? "",
    });
  }

  const counts = countBySeverity(open);
  const last = history[0];

  return (
    <>
      <SiteHeader authenticated />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-mist/60 transition hover:text-neon"
          >
            &larr; All domains
          </Link>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="break-all font-display text-3xl font-semibold text-white sm:text-4xl">
                {target.domain}
              </h1>
              <p className="mt-2 font-mono text-[12px] text-mist/70">
                {open.length} open finding{open.length === 1 ? "" : "s"} ·{" "}
                {history.length} scan{history.length === 1 ? "" : "s"} recorded
                {target.lastScanAt
                  ? ` · last ${new Date(target.lastScanAt).toUTCString().slice(0, 17)}`
                  : ""}
              </p>
            </div>

            <DomainActions
              targetId={target.id}
              active={target.active}
              canRescan={user.plan !== "free" || history.length === 0}
              maxDomains={maxDomainsFor(user.plan)}
              usedLabel={`${PLANS[user.plan as keyof typeof PLANS]?.name ?? user.plan} plan`}
            />
          </div>

          {user.plan === "free" ? (
            <div className="mt-8 rounded-lg border border-neon/25 bg-neon/[0.04] px-5 py-4">
              <p className="text-sm text-mist">
                You are on the free plan, so this domain is scanned once.{" "}
                <Link href="/pricing" className="text-neon underline underline-offset-4">
                  Upgrade
                </Link>{" "}
                to re-scan daily and get alerted the moment anything changes.
              </p>
            </div>
          ) : null}

          {last?.status === "queued" || last?.status === "running" ? (
            <div className="mt-6 rounded-lg border border-neon/25 bg-neon/[0.04] px-5 py-4">
              <p className="font-mono text-[12px] text-neon">
                Scan {last.status} — results appear here within a minute.{" "}
                <span className="inline-block animate-pulse">▊</span>
              </p>
            </div>
          ) : null}

          <div className="mt-8">
            <SeveritySummary findings={open} />
          </div>

          <section className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              Open findings
            </h2>
            <div className="mt-5">
              <FindingList findings={open} />
            </div>
          </section>

          <section className="mt-14">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">
              Scan history
            </h2>

            {history.length === 0 ? (
              <p className="mt-5 rounded-lg border border-edge bg-void/60 px-5 py-6 text-sm text-mist/70">
                No scans yet. The first one is usually queued the moment you add the domain.
              </p>
            ) : (
              <ol className="mt-5 space-y-2">
                {history.map((scan) => (
                  <li
                    key={scan.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-void/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          scan.status === "complete"
                            ? "bg-volt"
                            : scan.status === "failed"
                              ? "bg-cyber-rose"
                              : "bg-gold animate-pulse"
                        }`}
                      />
                      <div>
                        <p className="font-mono text-[12.5px] text-white">
                          {new Date(scan.finishedAt ?? scan.startedAt ?? 0)
                            .toUTCString()
                            .slice(0, 22)}
                        </p>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mist/50">
                          {scan.status} · {scan.trigger}
                          {scan.durationMs ? ` · ${scan.durationMs}ms` : ""}
                        </p>
                      </div>
                    </div>
                    {scan.error ? (
                      <p className="font-mono text-[11px] text-cyber-rose">{scan.error}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}

            {counts.critical ? (
              <p className="mt-6 text-xs text-mist/50">
                Critical findings stay open until a later scan shows they are gone.
              </p>
            ) : null}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
