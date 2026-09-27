import { BASE_PATH } from "@/lib/site";

/**
 * Every client-side call to our own API goes through here.
 *
 * This exists because `fetch("/api/scan")` is NOT basePath-aware: a literal
 * root-relative URL goes to the origin root, so the browser asked
 * rrdabs.online/api/scan, nginx handed it to the landing app on :3000, and that
 * app replied with an HTML 404. The JSON parse then threw and every form
 * reported the same useless "Network Error". <Link> and next/navigation
 * prepend basePath for you; fetch does not.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error(`apiFetch needs an absolute path, got: ${path}`);
  }

  const res = await fetch(`${BASE_PATH}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();

  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // A non-JSON body means we reached something that is not our API — most
      // likely a misrouted path returning an HTML error page. Say so plainly
      // instead of letting it surface as a generic network failure.
      throw new ApiError(
        `Unexpected response from the server (${res.status}). The request may have been routed to the wrong application.`,
        res.status,
      );
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}
