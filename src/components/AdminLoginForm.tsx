"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/client/api";

export default function AdminLoginForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      await apiFetch("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      router.push("/admin/charities");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        required
        autoComplete="off"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Admin token"
        aria-label="Admin token"
        className="rounded-lg border border-edge-strong bg-panel/70 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-mist/40 focus:border-neon/60 focus:ring-2 focus:ring-neon/20"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neon px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-volt disabled:opacity-50"
      >
        {busy ? "Checking" : "Sign in"}
      </button>
      {error ? <p className="text-sm text-cyber-rose">{error}</p> : null}
    </form>
  );
}
