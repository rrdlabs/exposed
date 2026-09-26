import { and, eq, inArray, isNull } from "drizzle-orm";
import { loadLocalEnv } from "@/lib/env.local-loader";
import { db } from "@/lib/db";
import { alerts, findings, targets, users } from "@/lib/db/schema";
import { isPaid } from "@/lib/billing/plans";
import { sendChangeAlert } from "@/lib/mail";
import { newId } from "@/lib/util/id";
import { runMigrations } from "@/lib/db/migrate";
import {
  claimNextScan,
  enqueueScanForActivePaidTargets,
  executeScan,
  resetStaleScans,
  type QueueRow,
} from "@/lib/scans";
import type { Finding } from "@/lib/scan/types";

/**
 * The worker owns every scan. Keeping it out of the web process means a
 * traffic spike or a `next build` restart can never interrupt a scan, and it
 * gives us a natural single-concurrency lock: this loop processes one target
 * at a time, which is both polite to customer infrastructure and gentle on a
 * 1 vCPU box.
 */

const IDLE_SLEEP_MS = 15_000;
const MAX_FINDINGS_PER_ALERT = 25;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function dispatchAlerts(job: QueueRow, fresh: Finding[], newFindingIds: Map<string, string>) {
  if (fresh.length === 0) return;

  const user = await db.query.users.findFirst({ where: eq(users.id, job.userId) });
  if (!user || !isPaid(user.plan)) return;

  const batch = fresh.slice(0, MAX_FINDINGS_PER_ALERT);
  const result = await sendChangeAlert({
    to: user.email,
    domain: job.domain,
    findings: batch,
  });

  for (const finding of batch) {
    const id = newFindingIds.get(finding.fingerprint);
    if (!id) continue;
    await db.insert(alerts).values({
      id: newId("alr_"),
      findingId: id,
      userId: job.userId,
      kind: "new",
      channel: "email",
      status: result.sent ? "sent" : "failed",
      error: result.error ?? null,
      sentAt: result.sent ? new Date() : null,
    });
  }

  if (fresh.length > batch.length) {
    console.log(
      `[worker] ${job.domain}: ${fresh.length - batch.length} further findings not emailed (cap ${MAX_FINDINGS_PER_ALERT})`,
    );
  }
}

/** Re-attempts alerts that failed to send on the scan that produced them. */
async function retryFailedAlerts(): Promise<void> {
  const pending = await db
    .select({
      alertId: alerts.id,
      severity: findings.severity,
      title: findings.title,
      detail: findings.detail,
      subject: findings.subject,
      domain: targets.domain,
      email: users.email,
      plan: users.plan,
    })
    .from(alerts)
    .innerJoin(findings, eq(findings.id, alerts.findingId))
    .innerJoin(targets, eq(targets.id, findings.targetId))
    .innerJoin(users, eq(users.id, alerts.userId))
    .where(and(eq(alerts.status, "failed"), isNull(findings.resolvedAt)))
    .limit(20);

  if (pending.length === 0) return;

  const byDomain = new Map<string, typeof pending>();
  for (const row of pending) {
    if (!isPaid(row.plan)) continue;
    const list = byDomain.get(row.domain) ?? [];
    list.push(row);
    byDomain.set(row.domain, list);
  }

  for (const [domain, rows] of byDomain) {
    const result = await sendChangeAlert({
      to: rows[0]!.email,
      domain,
      findings: rows.map((r) => ({
        ruleId: r.title,
        fingerprint: r.alertId,
        severity: r.severity as Finding["severity"],
        title: r.title,
        detail: r.detail ?? "",
        subject: r.subject ?? "",
      })),
    });

    for (const row of rows) {
      await db
        .update(alerts)
        .set({
          status: result.sent ? "sent" : "failed",
          error: result.error ?? null,
          sentAt: result.sent ? new Date() : null,
        })
        .where(eq(alerts.id, row.alertId));
    }
  }
}

async function main() {
  console.log("[worker] starting");
  // Must happen before anything reads env.sessionSecret, which is a getter
  // that throws when the variable is missing.
  loadLocalEnv();
  await runMigrations();
  console.log("[worker] migrations applied");

  let idleTicks = 0;

  while (true) {
    try {
      if (idleTicks % 20 === 0) {
        const reset = await resetStaleScans();
        if (reset > 0) console.log(`[worker] reaped ${reset} stale scan(s)`);
        const enqueued = await enqueueScanForActivePaidTargets();
        if (enqueued > 0) console.log(`[worker] enqueued ${enqueued} daily scan(s)`);
        await retryFailedAlerts();
      }

      const job = await claimNextScan();
      if (!job) {
        idleTicks += 1;
        await sleep(IDLE_SLEEP_MS);
        continue;
      }

      idleTicks = 0;
      console.log(`[worker] scanning ${job.domain} (${job.trigger})`);

      const outcome = await executeScan(job);
      if (outcome.error) {
        console.error(`[worker] ${job.domain} failed: ${outcome.error}`);
        continue;
      }

      const newFindingIds = new Map<string, string>();
      if (outcome.fresh.length > 0) {
        const inserted = await db
          .select({ fingerprint: findings.fingerprint, id: findings.id })
          .from(findings)
          .where(
            and(
              eq(findings.scanId, outcome.scanId),
              inArray(
                findings.fingerprint,
                outcome.fresh.map((f) => f.fingerprint),
              ),
            ),
          );
        for (const row of inserted) newFindingIds.set(row.fingerprint, row.id);
      }

      await dispatchAlerts(job, outcome.fresh, newFindingIds);

      console.log(
        `[worker] ${job.domain}: ${outcome.total} findings in ${outcome.durationMs}ms ` +
          `(${outcome.fresh.length} new, ${outcome.resolved} resolved)`,
      );
    } catch (err) {
      console.error("[worker] tick failed:", err);
      await sleep(IDLE_SLEEP_MS);
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
