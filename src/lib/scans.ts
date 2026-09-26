import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, rawClient } from "@/lib/db";
import { alerts, findings, scans, targets, users } from "@/lib/db/schema";
import { runScan } from "@/lib/scan";
import { evaluateChanges, evaluate } from "@/lib/scan/rules";
import type { Finding, Snapshot } from "@/lib/scan/types";
import { newId } from "@/lib/util/id";

export type QueueRow = {
  scanId: string;
  targetId: string;
  domain: string;
  userId: string;
  trigger: string;
};

export async function enqueueScan(targetId: string, trigger: string): Promise<string> {
  const scanId = newId("scn_");
  await db.insert(scans).values({ id: scanId, targetId, status: "queued", trigger });
  return scanId;
}

export async function latestSnapshot(targetId: string): Promise<Snapshot | null> {
  const rows = await db
    .select({ snapshotJson: scans.snapshotJson })
    .from(scans)
    .where(and(eq(scans.targetId, targetId), eq(scans.status, "complete")))
    .orderBy(desc(scans.finishedAt))
    .limit(1);

  const raw = rows[0]?.snapshotJson;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

/** Daily cadence: only enqueue when the last successful scan is over 20h old. */
const RESCAN_INTERVAL_MS = 20 * 60 * 60_000;

export async function enqueueScanForActivePaidTargets(): Promise<number> {
  const cutoff = Date.now() - RESCAN_INTERVAL_MS;

  const rows = await db
    .select({ id: targets.id })
    .from(targets)
    .innerJoin(users, eq(users.id, targets.userId))
    .where(
      and(
        eq(targets.active, true),
        sql`(${users.plan} = 'solo' OR ${users.plan} = 'pro')`,
        sql`(${targets.lastScanAt} IS NULL OR ${targets.lastScanAt} < ${cutoff})`,
      ),
    );

  let count = 0;
  for (const row of rows) {
    const pending = await db
      .select({ id: scans.id })
      .from(scans)
      .where(and(eq(scans.targetId, row.id), inArray(scans.status, ["queued", "running"])))
      .limit(1);
    if (pending.length > 0) continue;
    await enqueueScan(row.id, "scheduled");
    count += 1;
  }
  return count;
}

/**
 * Claims one queued scan. The conditional UPDATE is what makes this safe with
 * a single worker: two workers can never claim the same row, and a worker that
 * dies mid-scan leaves the row in 'running' for the reaper to reset.
 */
export async function claimNextScan(): Promise<QueueRow | null> {
  const result = await rawClient.execute({
    sql: `
      UPDATE scans
         SET status = 'running', started_at = unixepoch() * 1000
       WHERE id = (
         SELECT id FROM scans WHERE status = 'queued' ORDER BY rowid ASC LIMIT 1
       )
      RETURNING id, target_id, trigger
    `,
    args: [],
  });

  const row = result.rows[0];
  if (!row) return null;

  const targetRows = await db
    .select({ domain: targets.domain, userId: targets.userId })
    .from(targets)
    .where(eq(targets.id, String(row.target_id)))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    await db.update(scans).set({ status: "failed", error: "target missing" }).where(eq(scans.id, String(row.id)));
    return null;
  }

  return {
    scanId: String(row.id),
    targetId: String(row.target_id),
    domain: target.domain,
    userId: target.userId,
    trigger: String(row.trigger),
  };
}

export async function resetStaleScans(maxAgeMs = 10 * 60_000): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const result = await rawClient.execute({
    sql: `UPDATE scans SET status = 'failed', error = 'worker died mid-scan'
            WHERE status = 'running' AND started_at < ?
            RETURNING id`,
    args: [cutoff],
  });
  return result.rows.length;
}

export type ScanOutcome = {
  scanId: string;
  domain: string;
  durationMs: number;
  total: number;
  fresh: Finding[];
  resolved: number;
  error?: string;
};

export async function executeScan(job: QueueRow): Promise<ScanOutcome> {
  const previous = await latestSnapshot(job.targetId);

  try {
    const result = await runScan(job.domain, previous);
    const { snapshot, findings: resultFindings, durationMs } = result;

    const openBefore = await db
      .select({
        fingerprint: findings.fingerprint,
        firstSeenAt: findings.firstSeenAt,
      })
      .from(findings)
      .where(and(eq(findings.targetId, job.targetId), isNull(findings.resolvedAt)));

    const known = new Set(openBefore.map((f) => f.fingerprint));
    const fresh = resultFindings.filter((f) => !known.has(f.fingerprint));

    // The row already exists: enqueueScan() created it and claimNextScan()
    // moved it to 'running'. Completing it must be an UPDATE, never an insert.
    await db
      .update(scans)
      .set({
        status: "complete",
        finishedAt: new Date(),
        durationMs,
        snapshotJson: JSON.stringify(snapshot),
      })
      .where(eq(scans.id, job.scanId));

    // Retire every open finding that was already recorded. A fingerprint that
    // is still present gets a fresh row below (carrying firstSeenAt forward), and
    // one that is gone is genuinely resolved. Either way the old open row is
    // closed, which is what keeps the dashboard from counting a persistent
    // problem once per scan, forever.
    const nowFingerprints = new Set(resultFindings.map((f) => f.fingerprint));
    const cleared = openBefore.filter((f) => !nowFingerprints.has(f.fingerprint));

    for (const row of openBefore) {
      await db
        .update(findings)
        .set({ resolvedAt: new Date() })
        .where(
          and(
            eq(findings.targetId, job.targetId),
            eq(findings.fingerprint, row.fingerprint),
            isNull(findings.resolvedAt),
          ),
        );
    }

    if (resultFindings.length > 0) {
      const firstSeenBy = new Map(openBefore.map((f) => [f.fingerprint, f.firstSeenAt]));

      await db.insert(findings).values(
        resultFindings.map((f) => ({
          id: newId("fnd_"),
          scanId: job.scanId,
          targetId: job.targetId,
          userId: job.userId,
          ruleId: f.ruleId,
          fingerprint: f.fingerprint,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
          subject: f.subject,
          // Carry the original discovery date forward across daily re-observes.
          firstSeenAt: firstSeenBy.get(f.fingerprint) ?? new Date(snapshot.scannedAt),
        })),
      );
    }

    await db
      .update(targets)
      .set({ lastScanAt: new Date(), lastStatus: "complete" })
      .where(eq(targets.id, job.targetId));

    return {
      scanId: job.scanId,
      domain: job.domain,
      durationMs,
      total: resultFindings.length,
      fresh,
      resolved: cleared.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await db
      .update(scans)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(scans.id, job.scanId));
    await db.update(targets).set({ lastStatus: "failed" }).where(eq(targets.id, job.targetId));
    return {
      scanId: job.scanId,
      domain: job.domain,
      durationMs: 0,
      total: 0,
      fresh: [],
      resolved: 0,
      error: message,
    };
  }
}

export async function queueAlert(input: {
  findingIds: string[];
  userId: string;
  domain: string;
}): Promise<void> {
  if (input.findingIds.length === 0) return;
  await db.insert(alerts).values(
    input.findingIds.map((findingId) => ({
      id: newId("alr_"),
      findingId,
      userId: input.userId,
      kind: "new",
      channel: "email",
      status: "pending",
    })),
  );
}

export { evaluate, evaluateChanges };
