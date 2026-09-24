import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";
import { MEERA_PROFILE } from "./meeraProfile.js";
import type { NewsArticle } from "./newsAngle.js";

const MODEL_NAME = "gemini-3.6-flash";

function getModel() {
  const client = new GoogleGenerativeAI(config.geminiApiKey);
  return client.getGenerativeModel({ model: MODEL_NAME });
}

function parseJsonResponse<T>(raw: string, context: string): T {
  try {
    const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Could not parse ${context} response from Gemini: ${raw}`);
  }
}

export interface ScoreResult {
  score: number;
  reason: string;
}

/**
 * Single merged gate: is this note worth turning into a LinkedIn post for Meera,
 * given who she is and who she's writing for. Weighs substance (is this a fleshed-out
 * thought) and fit (does it match her brand/audience) as one judgment, not two
 * averaged sub-scores.
 */
export async function scoreNote(note: string): Promise<ScoreResult> {
  const model = getModel();

  const prompt = `You are screening a raw note from a skincare founder to decide whether it's
worth turning into a LinkedIn post for her, on a single combined judgment: substance (is this a
fleshed-out thought with a specific claim, data point, or anecdote to build on - not a logistics
reminder or an abandoned half-sentence) AND fit (does it match her brand, company, image, and
audience below). Reason about both together and produce one score - do not compute two separate
sub-scores and average them.

${MEERA_PROFILE}

Score from 0 (not worth developing at all) to 10 (excellent post material, both substantial and
on-brand). A well-written, substantial note that is simply off-topic for her brand/audience should
score low, same as a fragment with no content.

Respond with strict JSON only, no markdown fences, in this exact shape:
{"score": <integer 0-10>, "reason": "<one line explaining the score>"}

Note to evaluate:
"""
${note}
"""`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const parsed = parseJsonResponse<ScoreResult>(raw, "scoring gate");

  return {
    score: Math.round(Number(parsed.score)),
    reason: parsed.reason ?? "",
  };
}

/**
 * Extracts 3-5 keywords/phrases FROM THE NOTE ITSELF - the specific claims, topics, or
 * angles actually written about, not generic industry terms. Used to search for a
 * genuinely relevant news angle rather than whatever's trending.
 */
export async function extractKeywords(note: string): Promise<string[]> {
  const model = getModel();

  const prompt = `Extract 3 to 5 short keywords or phrases from this note - the specific claims,
topics, or angles it actually discusses. Do not invent generic industry terms that aren't in the
note. These will be used as a search query, so keep each one concise (1-4 words).

Respond with strict JSON only, no markdown fences, in this exact shape:
{"keywords": ["...", "..."]}

Note:
"""
${note}
"""`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const parsed = parseJsonResponse<{ keywords: string[] }>(raw, "keyword extraction");

  return (parsed.keywords ?? []).filter((k) => typeof k === "string" && k.trim().length > 0);
}

export interface DraftOptions {
  note: string;
  voiceSkill: string;
  newsArticle?: NewsArticle;
}

export interface DraftResult {
  draft: string;
  usedArticle: boolean;
  usedNewsFact: boolean;
}

export async function draftLinkedInPost({
  note,
  voiceSkill,
  newsArticle,
}: DraftOptions): Promise<DraftResult> {
  const model = getModel();

  const newsBlock = newsArticle
    ? `\nA news item was found via keyword search - it may or may not actually be relevant to
this note's point:
Headline: ${newsArticle.headline}
Source: ${newsArticle.source}
Date: ${newsArticle.date}

If this news item is genuinely relevant, use it to make the post timely. If it doesn't fit
naturally - including if the keyword match was superficial and the article isn't really about
what this note is about - ignore it entirely. Do not force it in or reference it just because it
was provided.\n`
    : "";

  const prompt = `You are drafting a LinkedIn post for Meera Pillai, founder of the skincare brand
Skinstinct, from one of her raw notes. Follow the voice profile below closely - her sentence
rhythm, her use of specific data/evidence, her structure, and the things she never says. Do not
write generic skincare marketing copy.

VOICE PROFILE:
"""
${voiceSkill}
"""
${newsBlock}
RAW NOTE FROM MEERA:
"""
${note}
"""

Respond with strict JSON only, no markdown fences, in this exact shape:
{"draft": "<the full LinkedIn post text, no preamble, no markdown headers, no hashtags unless her voice profile calls for them>", "usedArticle": <true if the news item above genuinely informed or is referenced by this post in any way, false if it was ignored as irrelevant or no news item was given>, "usedNewsFact": <true only if a specific fact/claim from the news item was pulled into the post body - implies usedArticle is also true - false otherwise>}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const parsed = parseJsonResponse<DraftResult>(raw, "draft");

  return {
    draft: (parsed.draft ?? "").trim(),
    usedArticle: Boolean(parsed.usedArticle),
    usedNewsFact: Boolean(parsed.usedNewsFact),
  };
}
