"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DomainActions({
  targetId,
  active,
  canRescan,
  maxDomains,
  usedLabel,
}: {
  targetId: string;
  active: boolean;
  canRescan: boolean;
  maxDomains: number;
  usedLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"rescan" | "toggle" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: "POST" | "DELETE", kind: typeof busy) {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(path, { method });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        setBusy(null);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error.");
      setBusy(null);
      return false;
    }
  }

  const buttonClass =
    "rounded-lg border border-edge-strong bg-panel/60 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white transition hover:border-neon/60 hover:text-neon disabled:opacity-40";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canRescan ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => call(`/api/domains/${targetId}/rescan`, "POST", "rescan")}
            className={buttonClass}
          >
            {busy === "rescan" ? "Queuing" : "Rescan now"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => call(`/api/domains/${targetId}`, "POST", "toggle")}
          className={buttonClass}
        >
          {busy === "toggle" ? "Saving" : active ? "Pause" : "Resume"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-cyber-rose/40 bg-cyber-rose/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cyber-rose transition hover:border-cyber-rose/70"
        >
          Delete
        </button>
      </div>

      <p className="font-mono text-[10.5px] text-mist/50">
        {usedLabel} · {maxDomains === 1000 ? "unlimited domains" : `${maxDomains} max`}
      </p>

      {error ? <p className="text-xs text-cyber-rose">{error}</p> : null}

      {confirming ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-void/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-edge bg-panel p-6">
            <h3 className="font-display text-lg font-semibold text-white">
              Delete this domain?
            </h3>
            <p className="mt-2 text-sm text-mist">
              Every scan, finding and alert for this domain is removed. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={buttonClass}
                disabled={busy !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={async () => {
                  const ok = await call(`/api/domains/${targetId}`, "DELETE", "delete");
                  if (ok) router.push("/dashboard");
                }}
                className="rounded-lg bg-cyber-rose px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void transition hover:bg-white"
              >
                {busy === "delete" ? "Deleting" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
