import tls from "node:tls";
import type { TlsCertInfo } from "./types";

/**
 * Reads TLS metadata from a normal HTTPS handshake. We complete the handshake
 * and immediately tear it down without sending any application data, so this
 * is indistinguishable from a browser visiting the site.
 */

const TIMEOUT_MS = 8_000;

type ProbeResult = {
  cert: tls.PeerCertificate;
  protocol: string | null;
  authorized: boolean;
  authorizationError: string | null;
};

function probe(
  host: string,
  bounds: { minVersion: "TLSv1" | "TLSv1.2"; maxVersion?: "TLSv1" | "TLSv1.2" },
): Promise<ProbeResult | null> {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port: 443,
      servername: host,
      rejectUnauthorized: false,
      ...bounds,
    });

    let settled = false;
    const finish = (value: ProbeResult | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once("secureConnect", () =>
      finish({
        cert: socket.getPeerCertificate(),
        protocol: socket.getProtocol(),
        authorized: socket.authorized,
        authorizationError: socket.authorizationError
          ? String(socket.authorizationError)
          : null,
      }),
    );
    socket.once("error", () => finish(null));
    socket.once("timeout", () => finish(null));
  });
}

function subjectName(value: string | string[] | undefined): string {
  if (!value) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.replace(/^CN=/i, "").trim();
}

function toInfo(host: string, result: ProbeResult): TlsCertInfo {
  const { cert } = result;
  const sans = (cert.subjectaltname ?? "")
    .split(",")
    .map((entry) => entry.trim().replace(/^DNS:/i, "").toLowerCase())
    .filter((entry) => entry.startsWith("dns:") || entry.includes("."));

  const selfSigned =
    !!cert.issuer && !!cert.subject && JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);

  return {
    host,
    subject: subjectName(cert.subject?.CN ?? cert.subject?.O?.[0]),
    issuer: subjectName(cert.issuer?.O?.[0] ?? cert.issuer?.CN),
    notBefore: cert.valid_from ? Date.parse(cert.valid_from) : 0,
    notAfter: cert.valid_to ? Date.parse(cert.valid_to) : 0,
    subjectAltNames: sans,
    protocol: result.protocol,
    selfSigned,
    authorized: result.authorized,
    authorizationError: result.authorizationError,
  };
}

export async function collectTls(hosts: string[]) {
  const certs: TlsCertInfo[] = [];
  const legacyTlsAccepted: string[] = [];
  const warnings: string[] = [];

  for (const host of hosts) {
    const modern = await probe(host, { minVersion: "TLSv1.2" });
    if (!modern) {
      warnings.push(`no TLS handshake with ${host}:443`);
      continue;
    }
    certs.push(toInfo(host, modern));

    // maxVersion is what makes this a real test: minVersion alone is only a
    // floor, so the handshake would still succeed over TLS 1.3 and every
    // correctly configured host would look vulnerable.
    const legacy = await probe(host, { minVersion: "TLSv1", maxVersion: "TLSv1" });
    if (legacy) legacyTlsAccepted.push(host);
  }

  return {
    certs,
    legacyTlsAccepted,
    error: warnings.length ? warnings.join("; ") : undefined,
  };
}
