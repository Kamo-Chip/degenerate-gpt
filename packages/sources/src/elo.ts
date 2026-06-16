import { fetchText } from "./http.js";

/**
 * eloratings.net national-team Elo. There is no official JSON API; the site is a
 * thin SPA over a public TSV (`World.tsv`, columns: rank, rank, code, rating, …).
 * This is **best-effort enrichment** for the Stats agent — every failure path
 * returns null so stats still works without it.
 *
 * The default URL is overridable via ELO_RATINGS_TSV_URL in case the file moves.
 */

const DEFAULT_TSV_URL = "https://www.eloratings.net/World.tsv";

/**
 * Map national-team names (as returned by football-data.org) to the
 * eloratings.net country codes used in the TSV. Mostly ISO 3166-1 alpha-2, with
 * site-specific exceptions (England = EN not GB, Scotland = SQ). Several teams
 * have alias entries to tolerate spelling variants. Covers the 48-team 2026
 * World Cup field (the three hosts + qualifiers). Unmapped teams -> null.
 */
const NAME_TO_CODE: Record<string, string> = {
  // Hosts
  "united states": "US",
  usa: "US",
  canada: "CA",
  mexico: "MX",

  // AFC
  australia: "AU",
  iraq: "IQ",
  iran: "IR",
  "ir iran": "IR",
  japan: "JP",
  jordan: "JO",
  "south korea": "KR",
  "korea republic": "KR",
  qatar: "QA",
  "saudi arabia": "SA",
  uzbekistan: "UZ",

  // CAF
  algeria: "DZ",
  "cabo verde": "CV",
  "cape verde": "CV",
  "congo dr": "CD",
  "dr congo": "CD",
  "democratic republic of congo": "CD",
  "ivory coast": "CI",
  "côte d'ivoire": "CI",
  "cote d'ivoire": "CI",
  egypt: "EG",
  ghana: "GH",
  morocco: "MA",
  senegal: "SN",
  "south africa": "ZA",
  tunisia: "TN",

  // Concacaf
  "curaçao": "CW",
  curacao: "CW",
  haiti: "HT",
  panama: "PA",

  // CONMEBOL
  argentina: "AR",
  brazil: "BR",
  colombia: "CO",
  ecuador: "EC",
  paraguay: "PY",
  uruguay: "UY",

  // OFC
  "new zealand": "NZ",

  // UEFA
  austria: "AT",
  belgium: "BE",
  "bosnia and herzegovina": "BA",
  "bosnia-herzegovina": "BA",
  bosnia: "BA",
  croatia: "HR",
  czechia: "CZ",
  "czech republic": "CZ",
  england: "EN",
  france: "FR",
  germany: "DE",
  netherlands: "NL",
  norway: "NO",
  portugal: "PT",
  scotland: "SQ",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  "türkiye": "TR",
  turkiye: "TR",
  turkey: "TR",
};

let ratingsCache: Map<string, number> | null = null;

async function loadRatings(): Promise<Map<string, number>> {
  if (ratingsCache) return ratingsCache;
  const url = process.env.ELO_RATINGS_TSV_URL ?? DEFAULT_TSV_URL;
  const tsv = await fetchText(url);
  const map = new Map<string, number>();
  for (const line of tsv.split("\n")) {
    const cols = line.split("\t");
    const code = cols[2]?.trim();
    const rating = Number(cols[3]);
    if (code && Number.isFinite(rating)) map.set(code, rating);
  }
  ratingsCache = map;
  return map;
}

/** Current Elo for a national team, or null if unknown / fetch fails. */
export async function getNationalElo(teamName: string): Promise<number | null> {
  try {
    const code = NAME_TO_CODE[teamName.trim().toLowerCase()];
    if (!code) return null;
    const ratings = await loadRatings();
    return ratings.get(code) ?? null;
  } catch {
    return null;
  }
}
