import { XMLParser } from "fast-xml-parser";
import { extractKeywords } from "./gemini.js";

export interface NewsArticle {
  headline: string;
  source: string;
  date: string;
  url: string;
}

interface RawRssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: { "#text"?: string } | string;
}

async function fetchGoogleNewsRss(query: string): Promise<NewsArticle[]> {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Google News RSS request failed (${res.status})`);
  }
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const items: RawRssItem[] = parsed?.rss?.channel?.item ?? [];
  const itemList = Array.isArray(items) ? items : [items];

  return itemList
    .filter((item): item is RawRssItem => Boolean(item?.title && item?.link))
    .map((item) => ({
      headline: String(item.title),
      source: typeof item.source === "string" ? item.source : item.source?.["#text"] ?? "",
      date: item.pubDate ?? "",
      url: String(item.link),
    }));
}

const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "for", "to", "and", "or", "is", "are", "at", "by", "with",
]);

function significantWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Keyword phrases rarely appear verbatim in a headline ("FDA sunscreen rules" won't match
 * "FDA Approves New Sunscreen Ingredient"), so this scores by how many significant words
 * from the extracted keywords show up in each headline, not exact phrase containment.
 */
function pickMostRelevantArticle(
  articles: NewsArticle[],
  keywords: string[]
): NewsArticle | undefined {
  if (articles.length === 0) return undefined;

  const keywordWords = new Set(keywords.flatMap(significantWords));
  if (keywordWords.size === 0) return undefined;

  let best: { article: NewsArticle; score: number } | undefined;
  for (const article of articles) {
    const headlineWords = new Set(significantWords(article.headline));
    const score = [...keywordWords].filter((word) => headlineWords.has(word)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { article, score };
    }
  }

  return best?.article;
}

/**
 * Extracts keywords from the note's own content, searches Google News RSS (no API key
 * needed) for each, and picks the single article that best matches the note's actual
 * point - not just whatever ranks first. Returns undefined if nothing relevant turns up.
 */
export async function findNewsAngle(note: string): Promise<NewsArticle | undefined> {
  const keywords = await extractKeywords(note);
  if (keywords.length === 0) return undefined;

  const query = keywords.join(" OR ");
  const articles = await fetchGoogleNewsRss(query);

  return pickMostRelevantArticle(articles, keywords);
}
