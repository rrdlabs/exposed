import { createHash } from "node:crypto";
import type { Finding, Severity, Snapshot } from "./types";

const DAY = 86_400_000;

function fingerprint(ruleId: string, subject: string): string {
  return createHash("sha256").update(`${ruleId}|${subject}`).digest("hex").slice(0, 32);
}

function finding(
  ruleId: string,
  severity: Severity,
  title: string,
  detail: string,
  subject = "",
): Finding {
  return { ruleId, severity, title, detail, subject, fingerprint: fingerprint(ruleId, subject) };
}

const HEADER_LABELS: Record<string, string> = {
  "strict-transport-security": "Strict-Transport-Security",
  "content-security-policy": "Content-Security-Policy",
  "x-content-type-options": "X-Content-Type-Options",
  "x-frame-options": "X-Frame-Options",
  "referrer-policy": "Referrer-Policy",
  "permissions-policy": "Permissions-Policy",
};

function headerRule(header: string): { id: string; severity: Severity; title: string; why: string } {
  const meta: Record<string, { id: string; severity: Severity; why: string }> = {
    "strict-transport-security": {
      id: "missing_hsts",
      severity: "medium",
      why: "Without HSTS a browser can be downgraded to plaintext on a first visit or an intercepted request.",
    },
    "content-security-policy": {
      id: "missing_csp",
      severity: "low",
      why: "A CSP is the main defence against cross-site scripting.",
    },
    "x-content-type-options": {
      id: "missing_nosniff",
      severity: "low",
      why: "Prevents browsers from guessing content types and re-interpreting your files.",
    },
    "x-frame-options": {
      id: "missing_clickjacking_protection",
      severity: "low",
      why: "Without this your pages can be framed and used for clickjacking.",
    },
    "referrer-policy": {
      id: "missing_referrer_policy",
      severity: "low",
      why: "Stops full URLs leaking to third parties in the Referer header.",
    },
    "permissions-policy": {
      id: "missing_permissions_policy",
      severity: "info",
      why: "Restricts which device features your pages may reach.",
    },
  };
  const entry = meta[header]!;
  return {
    id: entry.id,
    severity: entry.severity,
    title: `Missing ${HEADER_LABELS[header]}`,
    why: entry.why,
  };
}

export function evaluate(snapshot: Snapshot): Finding[] {
  const out: Finding[] = [];
  const { domain } = snapshot;

  if (snapshot.dns.root.NS && snapshot.dns.root.NS.length === 0) {
    out.push(
      finding(
        "dangling_ns",
        "critical",
        "No nameservers resolve",
        "The domain has no working NS records, so it is not being served at all. This usually follows an expired or misconfigured domain.",
        domain,
      ),
    );
  }

  for (const host of snapshot.dns.hosts) {
    if (host.cnames.length === 0) continue;
    if (host.values.length > 0) continue;

    for (const target of host.cnames) {
      out.push(
        finding(
          "dangling_cname",
          "critical",
          "Dangling CNAME — subdomain takeover risk",
          `${host.name} points at ${target}, but that target does not resolve to any address. Anyone able to claim ${target} can silently take over ${host.name}. Point it at a live provider or remove the record.`,
          host.name,
        ),
      );
    }
  }

  if (snapshot.tls.legacyTlsAccepted.length > 0) {
    for (const host of snapshot.tls.legacyTlsAccepted) {
      out.push(
        finding(
          "weak_tls_protocol",
          "high",
          "Legacy TLS versions still accepted",
          `${host} completed a TLS 1.0 handshake. TLS 1.0 and 1.1 are deprecated and vulnerable to downgrade attacks. Require TLS 1.2 or higher.`,
          host,
        ),
      );
    }
  }

  if (snapshot.tls.certs.length === 0) {
    out.push(
      finding(
        "no_tls",
        "high",
        "No TLS certificate served",
        "Nothing answered on port 443 with a certificate. Visitors are forced onto plaintext HTTP, if the site loads at all.",
        domain,
      ),
    );
  }

  for (const cert of snapshot.tls.certs) {
    const now = Date.now();
    const daysLeft = cert.notAfter ? Math.floor((cert.notAfter - now) / DAY) : 0;

    if (cert.notAfter && cert.notAfter < now) {
      out.push(
        finding(
          "cert_expired",
          "critical",
          "TLS certificate has expired",
          `The certificate for ${cert.host} expired ${cert.issuer || "unknown issuer"}. Visitors see a browser warning and many clients refuse to connect.`,
          cert.host,
        ),
      );
    } else if (daysLeft <= 30) {
      out.push(
        finding(
          "cert_expiring_soon",
          daysLeft <= 14 ? "high" : "medium",
          "TLS certificate expiring soon",
          `The certificate for ${cert.host} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${new Date(cert.notAfter).toUTCString().slice(0, 16)}). Renewal automation that silently fails is the usual cause.`,
          cert.host,
        ),
      );
    }

    if (cert.selfSigned) {
      out.push(
        finding(
          "cert_self_signed",
          "high",
          "Self-signed certificate",
          `${cert.host} presents a self-signed certificate, so browsers cannot verify it and most will warn or refuse. Use a certificate from a public CA.`,
          cert.host,
        ),
      );
    }

    if (cert.authorizationError) {
      out.push(
        finding(
          "cert_hostname_mismatch",
          "high",
          "Certificate does not match this hostname",
          `The certificate served by ${cert.host} failed verification (${cert.authorizationError}). Visitors get a name-mismatch warning.`,
          cert.host,
        ),
      );
    }
  }

  for (const endpoint of snapshot.http.endpoints) {
    if (endpoint.error) continue;

    if (endpoint.url.startsWith("http://")) {
      // A redirect to HTTPS counts as forcing it, not just 301/308: nginx and
      // most CDNs also emit 302 or 307, and flagging those is a false positive
      // that costs the user trust in everything else we report.
      const redirects = endpoint.status !== null && endpoint.status >= 300 && endpoint.status < 400;
      const toHttps = (endpoint.finalUrl ?? "").toLowerCase().startsWith("https://");
      const forced = redirects && toHttps;

      if (!forced) {
        out.push(
          finding(
            "https_not_forced",
            "high",
            "HTTP is not redirected to HTTPS",
            `${endpoint.host} answers on plaintext HTTP without redirecting to HTTPS. A one-line server rule closes this.`,
            endpoint.host,
          ),
        );
      }

      if (endpoint.insecureForm) {
        out.push(
          finding(
            "insecure_login_form",
            "high",
            "Login form served over plaintext HTTP",
            `${endpoint.host} serves a password field over an unencrypted connection. Anything on the path can read those credentials.`,
            endpoint.host,
          ),
        );
      }
    }

    for (const header of endpoint.missing) {
      const rule = headerRule(header);
      out.push(finding(rule.id, rule.severity, rule.title, rule.why, endpoint.host));
    }

    const serverBanner = endpoint.server ?? endpoint.poweredBy;
    if (serverBanner && /\d+\.\d+/.test(serverBanner)) {
      out.push(
        finding(
          "server_version_disclosure",
          "low",
          "Server software version disclosed",
          `${endpoint.host} advertises "${serverBanner}", including a version number. It gives an attacker a shortlist of known vulnerabilities for free.`,
          endpoint.host,
        ),
      );
    }
  }

  const txt = (snapshot.dns.root.TXT ?? []).join(" ").toLowerCase();
  if (!txt.includes("v=spf1")) {
    out.push(
      finding(
        "missing_spf",
        "low",
        "No SPF record",
        "No SPF record was found, so anyone can spoof email from this domain in the eyes of a receiver.",
        domain,
      ),
    );
  }
  if (!txt.includes("v=dmarc1")) {
    out.push(
      finding(
        "missing_dmarc",
        "medium",
        "No DMARC record",
        "No DMARC record was found. Without it, forged mail from this domain is not reported or rejected by receiving mail servers.",
        domain,
      ),
    );
  }
  if (!snapshot.dns.root.CAA?.length) {
    out.push(
      finding(
        "missing_caa",
        "info",
        "No CAA record",
        "A CAA record pins which certificate authorities may issue for this domain, which limits impersonation attempts.",
        domain,
      ),
    );
  }

  return out;
}

/**
 * Emits findings that only exist when compared against a previous scan.
 * This is the whole point of the product: a one-time report shows state,
 * a subscription shows change.
 */
export function evaluateChanges(previous: Snapshot | null, current: Snapshot): Finding[] {
  if (!previous) return [];
  const out: Finding[] = [];

  const known = new Set(previous.ct.subdomains);
  for (const host of current.ct.subdomains) {
    if (!known.has(host)) {
      out.push(
        finding(
          "new_subdomain",
          "medium",
          "New subdomain appeared",
          `${host} showed up in Certificate Transparency logs since the last scan on ${new Date(previous.scannedAt).toUTCString().slice(0, 16)}. If you did not add it, someone else registered it on your domain.`,
          host,
        ),
      );
    }
  }

  for (const type of ["A", "AAAA", "MX", "NS", "TXT", "CAA"]) {
    const before = new Set(previous.dns.root[type] ?? []);
    const after = current.dns.root[type] ?? [];
    for (const value of after) {
      if (before.size > 0 && !before.has(value)) {
        out.push(
          finding(
            "new_dns_record",
            "medium",
            `New ${type} record`,
            `A ${type} record was added since the last scan: ${value}. Verify it was intentional.`,
            `${type}:${value}`,
          ),
        );
      }
    }
  }

  const previousHosts = new Map(previous.dns.hosts.map((h) => [h.name, h]));
  for (const host of current.dns.hosts) {
    const before = previousHosts.get(host.name);
    if (!before) continue;
    if (before.values.length > 0 && host.values.length === 0) {
      out.push(
        finding(
          "host_stopped_resolving",
          "medium",
          "Subdomain stopped resolving",
          `${host.name} resolved during the previous scan and no longer does. Either it was decommissioned or its DNS record was removed by mistake.`,
          host.name,
        ),
      );
    }
  }

  return out;
}

export function scanFingerprint(domain: string, scannedAt: number): string {
  return fingerprint(`scan:${domain}`, String(scannedAt));
}
