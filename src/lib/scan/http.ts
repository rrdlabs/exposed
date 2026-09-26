import type { HeaderReport } from "./types";

/**
 * Fetches public pages the same way a browser would and reports on the
 * response headers. We request only the root document of each host, follow no
 * redirects manually, and read a bounded amount of the body to spot a login
 * form served over plaintext.
 */

const TIMEOUT_MS = 12_000;
const MAX_BODY = 200_000;

const REQUIRED_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
];

async function fetchOnce(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ExposedBot/1.0; +https://rrdlabs.online/exposed)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return null;
  }
}

async function inspect(
  host: string,
  url: string,
  requireHttps: boolean,
): Promise<HeaderReport> {
  const res = await fetchOnce(url);

  if (!res) {
    return {
      host,
      url,
      status: null,
      finalUrl: null,
      server: null,
      poweredBy: null,
      present: {},
      missing: [],
      insecureForm: false,
      error: "no response",
    };
  }

  const present: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    present[key.toLowerCase()] = value;
  });

  let insecureForm = false;
  if (!requireHttps && res.body) {
    try {
      const text = await res.text();
      insecureForm = /<input[^>]+type=["']?password/i.test(text.slice(0, MAX_BODY));
    } catch {
      // body is optional; a truncated read is not a finding
    }
  }

  const location = present["location"] ?? null;
  const redirectsToHttps =
    requireHttps ||
    (res.status >= 300 && res.status < 400 && !!location && location.startsWith("https://"));

  return {
    host,
    url,
    status: res.status,
    finalUrl: location,
    server: present["server"] ?? null,
    poweredBy: present["x-powered-by"] ?? null,
    present,
    missing: requireHttps || redirectsToHttps ? REQUIRED_HEADERS.filter((h) => !present[h]) : [],
    insecureForm,
  };
}

export async function collectHttp(domain: string, hosts: string[]) {
  const endpoints: HeaderReport[] = [];
  const warnings: string[] = [];

  for (const host of hosts) {
    const secure = await inspect(host, `https://${host}/`, true);
    endpoints.push(secure);

    // Plaintext must be probed unconditionally. Only checking it when HTTPS is
    // broken or redirecting means a site that serves 200 over HTTP and 200 over
    // HTTPS never gets flagged, which is the single most common misconfiguration
    // this product exists to find.
    const plain = await inspect(host, `http://${host}/`, false);
    endpoints.push(plain);

    if (secure.status === null) {
      warnings.push(`https://${host} did not respond`);
    }
  }

  return { endpoints, error: warnings.length > 0 ? warnings.join("; ") : undefined };
}
