export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  ttl?: number;
};

export type DnsAnswer = {
  name: string;
  type: string;
  values: string[];
  cnames: string[];
};

export type TlsCertInfo = {
  host: string;
  subject: string;
  issuer: string;
  notBefore: number;
  notAfter: number;
  subjectAltNames: string[];
  protocol: string | null;
  selfSigned: boolean;
  authorized: boolean;
  authorizationError: string | null;
};

export type HeaderReport = {
  host: string;
  url: string;
  status: number | null;
  finalUrl: string | null;
  server: string | null;
  poweredBy: string | null;
  present: Record<string, string>;
  missing: string[];
  insecureForm: boolean;
  error?: string;
};

export type Snapshot = {
  domain: string;
  scannedAt: number;
  ct: { subdomains: string[]; error?: string };
  dns: { root: Record<string, string[]>; hosts: DnsAnswer[]; error?: string };
  tls: { certs: TlsCertInfo[]; legacyTlsAccepted: string[]; error?: string };
  http: { endpoints: HeaderReport[]; error?: string };
  warnings: string[];
};

export type Finding = {
  ruleId: string;
  fingerprint: string;
  severity: Severity;
  title: string;
  detail: string;
  subject: string;
};

export type ScanResult = {
  snapshot: Snapshot;
  findings: Finding[];
  durationMs: number;
};
