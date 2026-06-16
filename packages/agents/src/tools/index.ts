import { tavily, polymarket } from "@degenerate-gpt/sources";
import { tool } from "ai";
import { z } from "zod";

/**
 * AI SDK tools wrapping the @degenerate-gpt/sources clients for the research agents. Every
 * tool catches its own errors and returns a serializable result (never throws
 * into the model loop) so the agent can keep researching with other tools.
 */

export const webSearch = tool({
  description:
    "Search the general web for recent, relevant information. Returns title, url and a content snippet for each result.",
  inputSchema: z.object({
    query: z.string().describe("A focused search query."),
  }),
  execute: async ({ query }) => {
    try {
      return { results: await tavily.webSearch(query) };
    } catch (err) {
      return { results: [], error: errorMessage(err) };
    }
  },
});

export const newsSearch = tool({
  description:
    "Search recent news (last ~7 days) for a query. Use for injuries, lineups, form, betting movement and headlines.",
  inputSchema: z.object({
    query: z.string().describe("A focused news query."),
  }),
  execute: async ({ query }) => {
    try {
      return { results: await tavily.newsSearch(query) };
    } catch (err) {
      return { results: [], error: errorMessage(err) };
    }
  },
});

export const polymarketMarket = tool({
  description:
    "Search Polymarket prediction markets (READ-ONLY signal) for implied probabilities related to a query. Each market lists outcomes with a probability in [0,1].",
  inputSchema: z.object({
    query: z.string().describe("Teams or tournament query, e.g. 'France England World Cup'."),
  }),
  execute: async ({ query }) => {
    try {
      const markets = await polymarket.searchMarkets(query);
      return {
        markets: markets.map((m) => ({
          question: m.question,
          eventTitle: m.eventTitle,
          volume: m.volume,
          outcomes: m.outcomes,
        })),
      };
    } catch (err) {
      return { markets: [], error: errorMessage(err) };
    }
  },
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Tool set for the Social ("reads the internet") research agent. */
export const socialTools = { webSearch, newsSearch };

/** Tool set for the Market ("reads the money") research agent. */
export const marketTools = { polymarketMarket, webSearch, newsSearch };
