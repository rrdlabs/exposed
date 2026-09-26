import { collectSubdomains } from "./crtsh";
import { collectDns, resolves } from "./dns";
import { collectHttp } from "./http";
import { evaluate, evaluateChanges } from "./rules";
import { collectTls } from "./tls";
import type { HeaderReport, ScanResult, Snapshot, TlsCertInfo } from "./types";

const OVERALL_TIMEOUT_MS = 90_000;

/**
 * Per-phase budgets, chosen so the sequential phases cannot outrun the reverse
 * proxy. The anonymous free scan is synchronous, so if the sum of these
 * exceeded nginx's proxy_read_timeout the user would get a gateway timeout
 * instead of a report. Worst case is CT + max(TLS, HTTP) + DNS = 20 + 40 + 30
 * = 90s, which leaves headroom under the 120s proxy timeout.
 */
const CT_TIMEOUT_MS = 20_000;
const TLS_TIMEOUT_MS = 40_000;
const HTTP_TIMEOUT_MS = 40_000;
const DNS_TIMEOUT_MS = 30_000;

function cap<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Runs a full passive exposure scan.
 *
 * Every input here is public: Certificate Transparency logs, public DNS
 * records, a normal TLS handshake and ordinary page requests. Nothing
 * brute-forces, probes, exploits or writes. The product is monitoring, not
 * attacking, and the implementation keeps that promise.
 */
export async function runScan(
  domain: string,
  previous: Snapshot | null = null,
): Promise<ScanResult> {
  const startedAt = Date.now();

  const [ct, wwwLive] = await Promise.all([
    cap(collectSubdomains(domain), CT_TIMEOUT_MS, {
      subdomains: [] as string[],
      error: "subdomain discovery timed out",
    }),
    resolves(`www.${domain}`),
  ]);

  // Only probe hosts that actually exist. A domain with no www record should
  // not be reported as if www were misconfigured.
  const hosts = wwwLive ? [domain, `www.${domain}`] : [domain];

  const [tls, http] = await Promise.all([
    cap(collectTls(hosts), TLS_TIMEOUT_MS, {
      certs: [] as TlsCertInfo[],
      legacyTlsAccepted: [] as string[],
      error: "TLS inspection timed out",
    }),
    cap(collectHttp(domain, hosts), HTTP_TIMEOUT_MS, {
      endpoints: [] as HeaderReport[],
      error: "HTTP header checks timed out",
    }),
  ]);

  const dns = await cap(
    collectDns(domain, ct.subdomains),
    DNS_TIMEOUT_MS,
    { root: {}, hosts: [], error: "DNS resolution timed out" },
  );

  const warnings: string[] = [];
  if (ct.error) warnings.push(ct.error);
  if (tls.error) warnings.push(tls.error);
  if (http.error) warnings.push(http.error);
  if (dns.error) warnings.push(dns.error);

  const snapshot: Snapshot = {
    domain,
    scannedAt: startedAt,
    ct,
    dns,
    tls,
    http,
    warnings,
  };

  const findings = [...evaluate(snapshot), ...evaluateChanges(previous, snapshot)];

  return {
    snapshot,
    findings,
    durationMs: Math.min(Date.now() - startedAt, OVERALL_TIMEOUT_MS),
  };
}
