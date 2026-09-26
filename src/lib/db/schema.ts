import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    plan: text("plan").notNull().default("free"),
    lsCustomerId: text("ls_customer_id"),
    lsSubscriptionId: text("ls_subscription_id"),
    lsSubscriptionStatus: text("ls_subscription_status"),
    lsCustomerPortalUrl: text("ls_customer_portal_url"),
    lsVariantId: text("ls_variant_id"),
    charityClaimed: integer("charity_claimed", { mode: "boolean" })
      .notNull()
      .default(false),
    charityVerified: integer("charity_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    charityName: text("charity_name"),
    charityNumber: text("charity_number"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const targets = sqliteTable(
  "targets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    lastScanAt: integer("last_scan_at", { mode: "timestamp_ms" }),
    lastStatus: text("last_status"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [
    uniqueIndex("targets_user_domain_idx").on(t.userId, t.domain),
    index("targets_user_idx").on(t.userId),
  ],
);

export const scans = sqliteTable(
  "scans",
  {
    id: text("id").primaryKey(),
    targetId: text("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    trigger: text("trigger").notNull().default("manual"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    durationMs: integer("duration_ms"),
    error: text("error"),
    snapshotJson: text("snapshot_json"),
  },
  (t) => [index("scans_target_idx").on(t.targetId)],
);

export const findings = sqliteTable(
  "findings",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    subject: text("subject"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    lastNotifiedAt: integer("last_notified_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("findings_target_idx").on(t.targetId),
    index("findings_user_idx").on(t.userId),
    index("findings_open_idx").on(t.targetId, t.resolvedAt),
  ],
);

export const alerts = sqliteTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    findingId: text("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("new"),
    channel: text("channel").notNull().default("email"),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("alerts_finding_idx").on(t.findingId)],
);

/**
 * Free, no-signup scans. Persisted rather than cached in memory so a report
 * URL keeps working across restarts and across PM2 processes, and so the
 * per-IP rate limit has something to count against.
 */
export const anonScans = sqliteTable(
  "anon_scans",
  {
    token: text("token").primaryKey(),
    domain: text("domain").notNull(),
    ipHash: text("ip_hash").notNull(),
    findingsJson: text("findings_json").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    durationMs: integer("duration_ms"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (t) => [index("anon_scans_ip_idx").on(t.ipHash)],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    eventName: text("event_name").notNull(),
    payloadJson: text("payload_json"),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    outcome: text("outcome"),
  },
  (t) => [index("webhook_events_name_idx").on(t.eventName)],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Target = typeof targets.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Finding = typeof findings.$inferSelect;
export type Alert = typeof alerts.$inferSelect;

export const PLANS = ["free", "solo", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "solo" || plan === "pro";
}
