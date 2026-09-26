"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const STAGES = [
  "Reading Certificate Transparency logs",
  "Resolving public DNS records",
  "Inspecting TLS",
  "Checking response headers",
];

export default function ScanForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(-1);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setStage(0);

    const ticker = setInterval(() => {
      setStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const body = (await res.json()) as { token?: string; error?: string };

      if (!res.ok || !body.token) {
        setError(body.error ?? "The scan could not be completed. Please try again.");
        setBusy(false);
        return;
      }

      router.push(`/report/${body.token}`);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    } finally {
      clearInterval(ticker);
    }
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "w-full" : "w-full max-w-xl"}>
      <label htmlFor="domain" className="sr-only">
        Domain to scan
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-mist/50">
            https://
          </span>
          <input
            id="domain"
            name="domain"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-edge-strong bg-panel/70 py-4 pl-[4.6rem] pr-4 font-mono text-sm text-white outline-none transition placeholder:text-mist/40 focus:border-neon/60 focus:ring-2 focus:ring-neon/20 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={busy || domain.trim().length === 0}
          className="rounded-lg bg-neon px-7 py-4 font-mono text-[13px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Scanning" : "Scan free"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-cyber-rose/40 bg-cyber-rose/10 px-4 py-3 text-sm text-cyber-rose">
          {error}
        </p>
      ) : null}

      {busy ? (
        <div className="mt-4 rounded-lg border border-edge bg-panel/50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neon">
            {STAGES[stage] ?? "Working"}
            <span className="ml-1 inline-block animate-pulse">▊</span>
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-edge">
            <div className="h-full w-1/3 animate-sweep rounded-full bg-gradient-to-r from-transparent via-neon to-transparent" />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-mist/60">
          Passive and read-only. We read public CT logs, public DNS, the TLS handshake and page
          headers. We never brute-force, scan ports or send payloads. You must own or be authorised
          to monitor the domain.
        </p>
      )}
    </form>
  );
}
