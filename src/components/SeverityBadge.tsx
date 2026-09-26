import type { Severity } from "@/lib/scan/types";

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; chip: string; border: string; bg: string }
> = {
  critical: {
    label: "Critical",
    color: "#ff4d6d",
    chip: "border-cyber-rose/40 bg-cyber-rose/10 text-cyber-rose",
    border: "border-l-cyber-rose",
    bg: "bg-cyber-rose/5",
  },
  high: {
    label: "High",
    color: "#ff8a5c",
    chip: "border-cyber-rose/30 bg-cyber-rose/10 text-cyber-rose",
    border: "border-l-cyber-rose/60",
    bg: "bg-cyber-rose/[0.03]",
  },
  medium: {
    label: "Medium",
    color: "#ecaf3e",
    chip: "border-gold/30 bg-gold/10 text-gold",
    border: "border-l-gold",
    bg: "bg-gold/[0.03]",
  },
  low: {
    label: "Low",
    color: "#22d3ee",
    chip: "border-neon/30 bg-neon/10 text-neon",
    border: "border-l-neon/70",
    bg: "bg-neon/[0.03]",
  },
  info: {
    label: "Info",
    color: "#9fb0c8",
    chip: "border-edge-strong bg-panel/60 text-mist",
    border: "border-l-mist/40",
    bg: "bg-transparent",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: SEVERITY_META[severity].color }}
    />
  );
}
