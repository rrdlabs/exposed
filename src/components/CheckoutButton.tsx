"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

export default function CheckoutButton({
  plan,
  label,
  featured = false,
}: {
  plan: "solo" | "pro";
  label: string;
  featured?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<{ url?: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });

      if (!body.url) {
        setError("Could not start checkout.");
        setBusy(false);
        return;
      }

      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={`w-full rounded-lg py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
          featured
            ? "bg-neon text-void hover:bg-volt"
            : "border border-edge-strong bg-panel/60 text-white hover:border-neon/60 hover:text-neon"
        }`}
      >
        {busy ? "Redirecting" : label}
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs text-cyber-rose">{error}</p>
      ) : null}
    </div>
  );
}
