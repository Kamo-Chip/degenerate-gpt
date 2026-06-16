import { fetchJson, requireEnv } from "./http.js";

/**
 * Tavily search API — one provider for both general web and news search, with
 * LLM-friendly snippets. Used as a tool by the Social and Market research
 * agents. Reads TAVILY_API_KEY lazily.
 */

const SEARCH_URL = "https://api.tavily.com/search";

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
    search_depth: "basic",
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
