"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

type Row = {
  id: string;
  email: string;
  charityName: string | null;
  charityNumber: string | null;
  charityClaimed: boolean;
  charityVerified: boolean;
  plan: string;
  createdAt: Date;
};

export default function CharityQueue({
  pending,
  approved,
}: {
  pending: Row[];
  approved: Row[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(userId: string, approve: boolean) {
    setBusy(userId);
    setError(null);
    try {
      await apiFetch("/api/admin/charity", {
        method: "POST",
        body: JSON.stringify({ userId, approve }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that claim.");
    } finally {
      setBusy(null);
    }
  }

  if (pending.length === 0 && approved.length === 0) {
    return (
      <p className="rounded-lg border border-edge bg-void/60 px-5 py-6 text-sm text-mist/70">
        No charity claims yet.
      </p>
    );
  }

  const section = (title: string, rows: Row[], action: boolean) => (
    <section className="mt-8 first:mt-0">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-neon">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-mist/50">None.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-edge bg-void/60 p-5"
            >
              <div className="min-w-0">
                <p className="break-all font-display text-lg font-semibold text-white">
                  {row.charityName ?? "Unnamed organisation"}
                </p>
                <p className="mt-1 font-mono text-[11.5px] text-mist/70">
                  {row.charityNumber ?? "no number"} · {row.email} · plan {row.plan} · claimed{" "}
                  {new Date(row.createdAt).toUTCString().slice(0, 16)}
                </p>
                <p className="mt-2 text-xs text-mist/50">
                  Verify the registration number against the official charity register before
                  approving. Approval grants free Solo monitoring, so it is not reversible by
                  cancelling.
                </p>
              </div>

              {action ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => decide(row.id, true)}
                    className="rounded-lg border border-volt/40 bg-volt/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-volt transition hover:bg-volt/20 disabled:opacity-40"
                  >
                    {busy === row.id ? "Saving" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => decide(row.id, false)}
                    className="rounded-lg border border-cyber-rose/40 bg-cyber-rose/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cyber-rose transition hover:bg-cyber-rose/20 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="rounded border border-volt/30 bg-volt/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-volt">
                  verified
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      {error ? <p className="mb-4 text-sm text-cyber-rose">{error}</p> : null}
      {section("Awaiting review", pending, true)}
      {section("Approved", approved, false)}
    </div>
  );
}
