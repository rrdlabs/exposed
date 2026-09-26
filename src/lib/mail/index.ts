import { Resend } from "resend";
import { env } from "@/lib/env";
import { SEVERITY_ORDER, type Finding, type Severity } from "@/lib/scan/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff4d6d",
  high: "#ff8a5c",
  medium: "#ecaf3e",
  low: "#22d3ee",
  info: "#9fb0c8",
};

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = env.resendApiKey;
  if (!key) return null;
  client ??= new Resend(key);
  return client;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

function renderFindings(domain: string, findings: Finding[]): string {
  const rows = sortFindings(findings)
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.16);white-space:nowrap;">
          <span style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.12em;color:${SEVERITY_COLOR[f.severity]};">${f.severity.toUpperCase()}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.16);">
          <p style="margin:0 0 4px;font-weight:600;color:#fff;">${escapeHtml(f.title)}</p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#9fb0c8;">${escapeHtml(f.detail)}</p>
          ${f.subject ? `<p style="margin:6px 0 0;font-family:ui-monospace,monospace;font-size:11px;color:#22d3ee;">${escapeHtml(f.subject)}</p>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  return `
  <div style="background:#04060c;padding:28px 16px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:#070c16;border:1px solid rgba(148,163,184,.18);border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;border-bottom:1px solid rgba(148,163,184,.16);">
        <p style="margin:0;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.2em;color:#22d3ee;">EXPOSED // CHANGE DETECTED</p>
        <h1 style="margin:8px 0 0;font-size:20px;color:#fff;">${escapeHtml(domain)}</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#9fb0c8;">${findings.length} new finding${findings.length === 1 ? "" : "s"} since the last scan.</p>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
      <div style="padding:18px 24px;border-top:1px solid rgba(148,163,184,.16);">
        <a href="${env.siteUrl}/dashboard" style="display:inline-block;background:#22d3ee;color:#04060c;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:11px 20px;border-radius:6px;">Open dashboard</a>
      </div>
      <div style="padding:0 24px 22px;">
        <p style="margin:0;font-size:11px;color:#6b7a94;line-height:1.6;">Exposed reads only public data: Certificate Transparency logs, public DNS records, a normal TLS handshake and ordinary page requests. You are receiving this because this address monitors ${escapeHtml(domain)}.</p>
      </div>
    </div>
  </div>`;
}

export async function sendChangeAlert(input: {
  to: string;
  domain: string;
  findings: Finding[];
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getClient();
  if (!resend) return { sent: false, error: "RESEND_API_KEY is not set" };

  const subject = `[Exposed] ${input.domain} — ${input.findings.length} new finding${input.findings.length === 1 ? "" : "s"}`;

  try {
    const { error } = await resend.emails.send({
      from: env.mailFrom,
      to: input.to,
      subject,
      html: renderFindings(input.domain, input.findings),
      text: sortFindings(input.findings)
        .map((f) => `[${f.severity.toUpperCase()}] ${f.title}${f.subject ? ` (${f.subject})` : ""}\n${f.detail}`)
        .join("\n\n"),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
