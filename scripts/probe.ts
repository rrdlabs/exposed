import { runScan } from "../src/lib/scan";

async function main() {
  const domain = process.argv[2] ?? "rrdlabs.online";

  const { snapshot, findings, durationMs } = await runScan(domain);

  console.log(`\n=== ${domain} — ${durationMs}ms ===\n`);

  console.log("CT subdomains:", snapshot.ct.subdomains.length, snapshot.ct.subdomains.slice(0, 12));
  console.log("DNS root keys:", Object.keys(snapshot.dns.root));
  console.log("DNS root A:", snapshot.dns.root.A);
  console.log("DNS root NS:", snapshot.dns.root.NS);
  console.log("resolved hosts:", snapshot.dns.hosts.length);
  console.log(
    "dangling (CNAME, no A):",
    snapshot.dns.hosts.filter((h) => h.cnames.length && !h.values.length).map((h) => `${h.name} -> ${h.cnames}`),
  );
  console.log(
    "TLS certs:",
    snapshot.tls.certs.map((c) => ({
      host: c.host,
      issuer: c.issuer,
      notAfter: new Date(c.notAfter).toISOString().slice(0, 10),
      protocol: c.protocol,
      authErr: c.authorizationError,
    })),
  );
  console.log("legacy TLS accepted:", snapshot.tls.legacyTlsAccepted);
  console.log(
    "HTTP:",
    snapshot.http.endpoints.map((e) => ({
      url: e.url,
      status: e.status,
      server: e.server,
      missing: e.missing,
      insecureForm: e.insecureForm,
      err: e.error,
    })),
  );
  console.log("warnings:", snapshot.warnings);

  console.log(`\n=== ${findings.length} findings ===`);
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  for (const f of [...findings].sort((a, b) => order[a.severity]! - order[b.severity]!)) {
    console.log(`[${f.severity.toUpperCase().padEnd(8)}] ${f.title} (${f.ruleId}) :: ${f.subject}`);
  }
}

main().catch((err) => {
  console.error("scan failed:", err);
  process.exit(1);
});
