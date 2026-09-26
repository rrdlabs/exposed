"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function CharityClaimForm() {
  const router = useRouter();
  const [charityName, setCharityName] = useState("");
  const [charityNumber, setCharityNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/charity/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ charityName, charityNumber }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not submit the claim.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-edge-strong bg-panel/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-mist/40 focus:border-gold/60 focus:ring-2 focus:ring-gold/20";

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-edge bg-void/60 p-6">
      <p className="text-sm text-mist">
        Registered charities and nonprofits get free Solo monitoring: up to 5 domains, daily
        re-scans and change alerts. We verify the registration by hand.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          value={charityName}
          onChange={(e) => setCharityName(e.target.value)}
          placeholder="Organisation name"
          aria-label="Organisation name"
          className={fieldClass}
        />
        <input
          type="text"
          required
          value={charityNumber}
          onChange={(e) => setCharityNumber(e.target.value)}
          placeholder="Registration number"
          aria-label="Registration number"
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg border border-gold/50 bg-gold/10 px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-gold transition hover:bg-gold/20 disabled:opacity-50"
      >
        {busy ? "Submitting" : "Claim free monitoring"}
      </button>

      {error ? <p className="mt-3 text-sm text-cyber-rose">{error}</p> : null}
    </form>
  );
}
