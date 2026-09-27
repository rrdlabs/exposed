"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

/**
 * Opens the Stripe Customer Portal. Kept as a button rather than a plain link
 * because the portal URL is single-use and short-lived, so it has to be minted
 * per click.
 */
export default function ManageBillingButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<{ url?: string }>("/api/billing/portal", {
        method: "POST",
      });
      if (!body.url) {
        setError("Could not open billing.");
        setBusy(false);
        return;
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="rounded-lg border border-edge-strong bg-panel/60 px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon disabled:opacity-50"
      >
        {busy ? "Opening…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-cyber-rose">{error}</p> : null}
    </div>
  );
}
