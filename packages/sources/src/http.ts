/**
 * Tiny fetch helper shared by every source client. Adds a timeout and turns
 * non-2xx responses into clear errors so callers can distinguish an infra/auth
 * failure (which should throw and surface) from "no data" (which they handle by
 * returning null/empty).
 */

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number;
}

/** GET/POST a URL and parse JSON, throwing `HttpError` on non-2xx. */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HttpError(
        `${res.status} ${res.statusText} for ${url}${body ? ` — ${body.slice(0, 200)}` : ""}`,
        res.status,
        url,
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** GET a URL and return raw text (for CSV-style sources like eloratings). */
export async function fetchText(
  url: string,
  options: FetchJsonOptions = {},
): Promise<string> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new HttpError(`${res.status} ${res.statusText} for ${url}`, res.status, url);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Read a required env var, throwing a clear error if missing (auth failure). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — add it to your .env`);
  }
  return value;
}
