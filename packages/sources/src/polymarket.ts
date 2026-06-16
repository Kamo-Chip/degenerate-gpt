import { fetchJson } from "./http.js";

/**
 * Polymarket Gamma API (https://gamma-api.polymarket.com) — fully public, no key.
 * Used by the Market agent as read-only signal: prediction-market implied
 * probabilities. PAPER TRADING ONLY — we never place orders, only read prices.
 */

const BASE = "https://gamma-api.polymarket.com";

export interface MarketOutcome {
  label: string;
  /** Implied probability in [0, 1] (Polymarket prices are already probabilities). */
  probability: number;
}

export interface PolymarketMarket {
  eventTitle: string;
  question: string;
  outcomes: MarketOutcome[];
  volume: number;
  active: boolean;
  closed: boolean;
}

interface RawMarket {
  question?: string;
  outcomes?: string;
  outcomePrices?: string;
  volumeNum?: number;
  active?: boolean;
  closed?: boolean;
}
interface RawEvent {
  title?: string;
  markets?: RawMarket[];
}
interface SearchResponse {
  events?: RawEvent[];
}

function parseJsonArray(s: string | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function toMarket(eventTitle: string, m: RawMarket): PolymarketMarket | null {
  const labels = parseJsonArray(m.outcomes);
  const prices = parseJsonArray(m.outcomePrices).map(Number);
  if (labels.length === 0 || labels.length !== prices.length) return null;

  const outcomes: MarketOutcome[] = labels.map((label, i) => ({
    label,
    probability: Number.isFinite(prices[i]) ? (prices[i] as number) : 0,
  }));

  return {
    eventTitle,
    question: m.question ?? eventTitle,
    outcomes,
    volume: m.volumeNum ?? 0,
    active: m.active ?? false,
    closed: m.closed ?? false,
  };
}

/**
 * Free-text search over active Polymarket markets. Returns the most liquid
 * matching markets (empty array if none) — safe for an LLM tool to call freely.
 */
export async function searchMarkets(
  query: string,
  limit = 8,
): Promise<PolymarketMarket[]> {
  const url =
    `${BASE}/public-search?` +
    new URLSearchParams({
      q: query,
      events_status: "active",
      limit_per_type: "10",
    }).toString();

  const data = await fetchJson<SearchResponse>(url);

  const markets: PolymarketMarket[] = [];
  for (const event of data.events ?? []) {
    for (const raw of event.markets ?? []) {
      const m = toMarket(event.title ?? "", raw);
      if (m && m.active && !m.closed) markets.push(m);
    }
  }

  markets.sort((a, b) => b.volume - a.volume);
  return markets.slice(0, limit);
}

/**
 * Best-effort lookup of a market relevant to a specific fixture. Prefers a
 * market whose question mentions both teams; otherwise returns the most liquid
 * market mentioning either team. Returns null when nothing relevant is found.
 */
export async function findMatchMarket(
  teamA: string,
  teamB: string,
): Promise<PolymarketMarket | null> {
  const markets = await searchMarkets(`${teamA} ${teamB} World Cup`);
  if (markets.length === 0) return null;

  const a = teamA.toLowerCase();
  const b = teamB.toLowerCase();
  const mentions = (m: PolymarketMarket, t: string) =>
    `${m.eventTitle} ${m.question}`.toLowerCase().includes(t);

  const both = markets.find((m) => mentions(m, a) && mentions(m, b));
  if (both) return both;

  return markets.find((m) => mentions(m, a) || mentions(m, b)) ?? null;
}
