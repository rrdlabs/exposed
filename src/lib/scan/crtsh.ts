import { isSubdomainOf } from "@/lib/util/domain";
import type { Snapshot } from "./types";

/**
 * Discovers hostnames from public Certificate Transparency logs.
 * CT logs are a passive, public source: we read what the CA already published
 * and never touch the target's infrastructure.
 */

const CRTSH_ENDPOINT = "https://crt.sh/";
const TIMEOUT_MS = 25_000;
const MAX_SUBDOMAINS = 60;

type CrtRow = {
  common_name?: string;
  name_value?: string;
  not_before?: string;
  not_after?: string;
};

function cleanHost(value: string): string | null {
  let host = value.trim().toLowerCase();
  if (!host) return null;
  if (host.startsWith("*.")) host = host.slice(2);
  if (!host || !host.includes(".")) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host.startsWith(".") || host.endsWith(".")) return null;
  return host;
}

export async function collectSubdomains(
  domain: string,
): Promise<{ subdomains: string[]; error?: string }> {
  const found = new Set<string>();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${CRTSH_ENDPOINT}?q=%25.${encodeURIComponent(domain)}&output=json`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "Exposed/1.0 (+rrdlabs.online)" },
    });

    if (!res.ok) {
      return { subdomains: [], error: `crt.sh returned ${res.status}` };
    }

    const rows = (await res.json()) as CrtRow[];
    if (!Array.isArray(rows)) {
      return { subdomains: [], error: "crt.sh returned an unexpected payload" };
    }

    for (const row of rows) {
      const names = `${row.common_name ?? ""}\n${row.name_value ?? ""}`;
      for (const raw of names.split(/\s+/)) {
        const host = cleanHost(raw);
        if (host && isSubdomainOf(host, domain)) found.add(host);
      }
      if (found.size >= MAX_SUBDOMAINS * 4) break;
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return { subdomains: [], error: `crt.sh unreachable (${reason})` };
  } finally {
    clearTimeout(timer);
  }

  const subdomains = [...found].sort().slice(0, MAX_SUBDOMAINS);
  return { subdomains };
}

export function totalHosts(snapshot: Snapshot): number {
  return snapshot.ct.subdomains.length + 1;
}
