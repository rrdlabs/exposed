import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleWebhook, verifySignature, type LsSubscriptionEvent } from "@/lib/billing/lemonsqueezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy retries with exponential backoff until we return 200, so the
 * handler must be quick and must never throw for a business-logic problem.
 * Signature verification is the only reason to answer anything but 200.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  let secret: string;
  try {
    secret = env.lemonSqueezyWebhookSecret;
  } catch {
    return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: LsSubscriptionEvent;
  try {
    event = JSON.parse(rawBody) as LsSubscriptionEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await handleWebhook(rawBody, event);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[ls-webhook] handler failed:", err);
    // 200 so Lemon Squeezy stops retrying; the event row stays unprocessed and
    // is visible for manual replay.
    return NextResponse.json({ ok: false, error: "handler failed" });
  }
}
