import { fetchJson, requireEnv } from "./http.js";

/**
 * Tavily search API — one provider for both general web and news search, with
 * LLM-friendly snippets. Used as a tool by the Social and Market research
 * agents. Reads TAVILY_API_KEY lazily.
 */

const SEARCH_URL = "https://api.tavily.com/search";
const RESEARCH_URL = "https://api.tavily.com/research";

export interface SearchResult {
  title: string;
  url: string;
  /** Clean content snippet relevant to the query. */
  content: string;
  publishedDate?: string;
}

interface TavilyResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    published_date?: string;
  }>;
}

async function search(
  query: string,
  opts: { topic: "general" | "news"; maxResults: number; days?: number },
): Promise<SearchResult[]> {
  const apiKey = requireEnv("TAVILY_API_KEY");

  const body: Record<string, unknown> = {
    query,
    topic: opts.topic,
    max_results: opts.maxResults,
    // "advanced" digs past the top/most-popular hits for richer, less
    // surface-level snippets — the research agents need depth, not headlines.
    search_depth: "advanced",
  };
  if (opts.topic === "news" && opts.days != null) body.days = opts.days;

  const data = await fetchJson<TavilyResponse>(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return (data.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
    ...(r.published_date ? { publishedDate: r.published_date } : {}),
  }));
}

/** General web search. */
export function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  return search(query, { topic: "general", maxResults });
}

/** Recent news search (defaults to the last 7 days). */
export function newsSearch(
  query: string,
  maxResults = 5,
  days = 7,
): Promise<SearchResult[]> {
  return search(query, { topic: "news", maxResults, days });
}

/* -------------------------------------------------------------------------- */
/* Deep research (/research) — async, multi-step research report.             */
/* -------------------------------------------------------------------------- */

/** A cited research report from the async /research endpoint. */
export interface ResearchResult {
  /** The synthesised research report. */
  content: string;
  /** Sources the report drew on. */
  sources: Array<{ title: string; url: string }>;
}

interface ResearchCreateResponse {
  request_id?: string;
  status?: string;
}

interface ResearchStatusResponse {
  status?: "pending" | "in_progress" | "completed" | "failed";
  content?: string | Record<string, unknown>;
  sources?: Array<{ title?: string; url?: string }>;
}

const RESEARCH_POLL_INTERVAL_MS = 6_000;
// Generous runaway backstop only — callers wait for research to complete. Kept
// under the Trigger task's maxDuration (3600s) so a true Tavily hang can't
// outlive the run; normal research finishes well within this.
const RESEARCH_TIMEOUT_MS = 600_000; // ~10 minutes

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deep research via Tavily's async /research endpoint. Kicks off a research
 * task, then polls until it completes (bounded by a timeout). Returns a cited
 * report. Slower and more credit-hungry than `webSearch`/`newsSearch` — use it
 * sparingly for the single hardest question. Throws on failure/timeout so the
 * caller (a tool) can degrade gracefully.
 */
export async function research(
  input: string,
  opts: {
    model?: "mini" | "pro" | "auto";
    outputLength?: "short" | "standard" | "long";
    includeDomains?: string[];
    excludeDomains?: string[];
  } = {},
): Promise<ResearchResult> {
  const apiKey = requireEnv("TAVILY_API_KEY");
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const created = await fetchJson<ResearchCreateResponse>(RESEARCH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input,
      model: opts.model ?? "auto",
      output_length: opts.outputLength ?? "standard",
      ...(opts.includeDomains ? { include_domains: opts.includeDomains } : {}),
      ...(opts.excludeDomains ? { exclude_domains: opts.excludeDomains } : {}),
    }),
  });

  const requestId = created.request_id;
  if (!requestId) {
    throw new Error("Tavily research: no request_id returned");
  }

  const deadline = Date.now() + RESEARCH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(RESEARCH_POLL_INTERVAL_MS);

    const status = await fetchJson<ResearchStatusResponse>(
      `${RESEARCH_URL}/${requestId}`,
      { headers },
    );

    if (status.status === "completed") {
      const content =
        typeof status.content === "string"
          ? status.content
          : JSON.stringify(status.content ?? "");
      return {
        content,
        sources: (status.sources ?? []).map((s) => ({
          title: s.title ?? "",
          url: s.url ?? "",
        })),
      };
    }
    if (status.status === "failed") {
      throw new Error("Tavily research task failed");
    }
  }

  throw new Error("Tavily research timed out");
}
