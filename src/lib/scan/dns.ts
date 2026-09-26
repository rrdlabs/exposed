import type { DnsAnswer } from "./types";
/**
 * Passive DNS resolution over DNS-over-HTTPS.
 *
 * We only ever query public resolvers (Cloudflare, Google fallback) about
 * public DNS records. The customer's own nameservers are never touched, so
 * this stays a read-only observation of public data.
 */

const RESOLVERS = [
  { url: "https://cloudflare-dns.com/dns-query", accept: "application/dns-json" },
  { url: "https://dns.google/resolve", accept: "application/json" },
];

const TIMEOUT_MS = 8_000;
const MAX_HOSTS = 25;
const CONCURRENCY = 6;

type DohRow = { name: string; type: number; TTL: number; data: string };
type DohResponse = { Status: number; Answer?: DohRow[] };

const TYPE_CODES: Record<string, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  NS: 2,
  TXT: 16,
  CAA: 257,
};

function stripQuotes(value: string): string {
  const match = value.match(/"([^"]*)"/);
  return match ? match[1]! : value;
}

function trailingDot(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1).toLowerCase() : value.toLowerCase();
}

async function query(
  name: string,
  type: string,
  resolver: (typeof RESOLVERS)[number],
): Promise<DohResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${resolver.url}?name=${encodeURIComponent(name)}&type=${TYPE_CODES[type]}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: resolver.accept },
    });
    if (!res.ok) return null;
    return (await res.json()) as DohResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveType(name: string, type: string): Promise<DnsAnswer | null> {
  for (const resolver of RESOLVERS) {
    const body = await query(name, type, resolver);
    if (!body) continue;
    if (body.Status !== 0 && body.Status !== 3) continue;

    const rows = (body.Answer ?? []).filter((row) => {
      if (row.type === TYPE_CODES.CNAME!) return true;
      return row.type === TYPE_CODES[type]!;
    });
    if (rows.length === 0) return { name, type, values: [], cnames: [] };

    return {
      name,
      type,
      values: rows
        .filter((row) => row.type === TYPE_CODES[type]!)
        .map((row) => (type === "TXT" ? stripQuotes(row.data) : row.data.trim())),
      cnames: rows
        .filter((row) => row.type === TYPE_CODES.CNAME!)
        .map((row) => trailingDot(row.data)),
    };
  }
  return null;
}

async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runner(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

export async function resolves(host: string): Promise<boolean> {
  const [a, aaaa, cname] = await Promise.all([
    resolveType(host, "A"),
    resolveType(host, "AAAA"),
    resolveType(host, "CNAME"),
  ]);
  return Boolean(a?.values.length || aaaa?.values.length || cname?.values.length);
}

export async function collectDns(domain: string, subdomains: string[]) {
  const rootTypes = ["A", "AAAA", "MX", "NS", "TXT", "CAA"];
  const warnings: string[] = [];

  const rootEntries = await Promise.all(
    rootTypes.map(async (type) => [type, await resolveType(domain, type)] as const),
  );

  const root: Record<string, string[]> = {};
  for (const [type, answer] of rootEntries) {
    if (!answer) {
      warnings.push(`DNS ${type} lookup returned no answer`);
      continue;
    }
    if (answer.values.length) root[type] = answer.values;
  }

  const hosts = subdomains.slice(0, MAX_HOSTS);

  const answers = await pool(hosts, CONCURRENCY, async (host) => {
    const [a, cname] = await Promise.all([resolveType(host, "A"), resolveType(host, "CNAME")]);
    const aaaa = await resolveType(host, "AAAA");
    return {
      name: host,
      type: "A",
      values: [...(a?.values ?? []), ...(aaaa?.values ?? [])],
      cnames: cname?.values ?? [],
    } satisfies DnsAnswer;
  });

  const resolvable = answers.filter((answer) => answer.values.length > 0 || answer.cnames.length > 0);
  const unresolvable = answers.filter(
    (answer) => answer.values.length === 0 && answer.cnames.length === 0,
  );

  if (unresolvable.length > 0) {
    warnings.push(
      `${unresolvable.length} of ${answers.length} discovered hostnames did not resolve`,
    );
  }
  if (hosts.length > subdomains.length) {
    warnings.push(
      `resolved the first ${MAX_HOSTS} of ${subdomains.length} discovered hostnames to stay polite`,
    );
  }

  return { root, hosts: resolvable, error: warnings.length ? warnings.join("; ") : undefined };
}
