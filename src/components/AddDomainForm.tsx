"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/client/api";

export default function AddDomainForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<{ id: string }>("/api/domains", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });

      setDomain("");
      router.push(`/dashboard/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that domain.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        required
        spellCheck={false}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="anotherdomain.com"
        aria-label="Domain to add"
        className="flex-1 rounded-lg border border-edge-strong bg-panel/70 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-mist/40 focus:border-neon/60 focus:ring-2 focus:ring-neon/20"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neon px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt disabled:opacity-50"
      >
        {busy ? "Adding" : "Add domain"}
      </button>
      {error ? <p className="w-full text-sm text-cyber-rose">{error}</p> : null}
    </form>
  );
}
