/**
 * Normalizes a user-supplied domain into a safe, comparable hostname.
 * Returns null when the input is not a plausible public domain.
 *
 * Defensive on purpose: this value is used to build DNS and TLS lookups, so
 * anything exotic is rejected rather than passed through to the network.
 */
const DOMAIN_RE =
  /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export function normalizeDomain(input: string): string | null {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/)[0]
    .split("@").pop()!
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

  if (!value) return null;

  if (IPV4_RE.test(value)) {
    return value
      .split(".")
      .every((octet) => Number(octet) <= 255)
      ? value
      : null;
  }

  if (value.length > 253) return null;
  if (!DOMAIN_RE.test(value)) return null;
  if (!value.includes(".")) return null;

  return value;
}

export function isIpv4(domain: string): boolean {
  return IPV4_RE.test(domain);
}

export function registrableDomain(domain: string): string {
  const labels = domain.split(".");
  if (labels.length <= 2) return domain;
  const twoLevelTlds = new Set([
    "co.uk",
    "co.za",
    "com.au",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "co.nz",
    "com.br",
    "co.in",
  ]);
  const lastTwo = labels.slice(-2).join(".");
  if (twoLevelTlds.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

export function isSubdomainOf(candidate: string, root: string): boolean {
  return candidate === root || candidate.endsWith(`.${root}`);
}
