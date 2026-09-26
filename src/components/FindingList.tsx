import type { Finding } from "@/lib/scan/types";
import { SEVERITY_ORDER } from "@/lib/scan/types";
import { SEVERITY_META, SeverityBadge } from "./SeverityBadge";

export function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

export function countBySeverity(findings: Finding[]) {
  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}

export function SeveritySummary({ findings }: { findings: Finding[] }) {
  const counts = countBySeverity(findings);
  const present = SEVERITY_ORDER.filter((s) => counts[s]! > 0);

  if (present.length === 0) {
    return (
      <p className="rounded-lg border border-volt/30 bg-volt/5 px-4 py-3 font-mono text-sm text-volt">
        No findings. Nothing is obviously wrong right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-5">
      {SEVERITY_ORDER.map((severity) => (
        <div key={severity} className="bg-panel/80 px-4 py-4">
          <p
            className="font-display text-2xl font-semibold"
            style={{ color: counts[severity] ? SEVERITY_META[severity].color : "#3d4a63" }}
          >
            {counts[severity] ?? 0}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-mist/70">
            {SEVERITY_META[severity].label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function FindingList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-volt/30 bg-volt/5 p-8 text-center">
        <p className="font-display text-xl font-semibold text-volt">Clean scan</p>
        <p className="mt-2 text-sm text-mist">
          Nothing to report. Keep watching it daily and we will tell you the moment that changes.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sortBySeverity(findings).map((finding) => (
        <li
          key={finding.fingerprint}
          className={`rounded-lg border border-edge border-l-2 ${SEVERITY_META[finding.severity].border} ${SEVERITY_META[finding.severity].bg} p-5`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-white">{finding.title}</h3>
            <SeverityBadge severity={finding.severity} />
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-mist">{finding.detail}</p>
          {finding.subject ? (
            <p className="mt-3 inline-block rounded border border-edge bg-void/60 px-2 py-1 font-mono text-[11px] text-neon">
              {finding.subject}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
