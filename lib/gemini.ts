import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

const MODEL_NAME = "gemini-2.0-flash";

function getModel() {
  const client = new GoogleGenerativeAI(config.geminiApiKey);
  return client.getGenerativeModel({ model: MODEL_NAME });
}

export interface GateResult {
  worthDeveloping: boolean;
  reason: string;
}

/**
 * First pass: most Telegram notes are fragments, not post material.
 * This is a cheap gate before the more expensive drafting call.
 */
export async function evaluateNote(note: string): Promise<GateResult> {
  const model = getModel();

  const prompt = `You are screening raw notes from a skincare founder for whether they contain
enough substance to become a full LinkedIn post - a specific claim, a piece of data, a concrete
anecdote, or an argument that could be developed further.

Reject notes that are just fragments, reminders, one-word observations, logistics, or thoughts
with no real content to build on.

Respond with strict JSON only, no markdown fences, in this exact shape:
{"worthDeveloping": true or false, "reason": "one sentence explaining why"}

Note to evaluate:
"""
${note}
"""`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as GateResult;
    return {
      worthDeveloping: Boolean(parsed.worthDeveloping),
      reason: parsed.reason ?? "",
    };
  } catch {
    throw new Error(`Could not parse gate response from Gemini: ${raw}`);
  }
}

export interface DraftOptions {
  note: string;
  voiceSkill: string;
  topicalReference?: string;
}

export async function draftLinkedInPost({
  note,
  voiceSkill,
  topicalReference,
}: DraftOptions): Promise<string> {
  const model = getModel();

  const referenceBlock = topicalReference
    ? `\nCurrent/topical reference to optionally ground the piece in (use only if it genuinely
strengthens the argument - do not force it in):\n"""\n${topicalReference}\n"""\n`
    : "";

  const prompt = `You are drafting a LinkedIn post for Meera Pillai, founder of the skincare brand
Skinstinct, from one of her raw notes. Follow the voice profile below closely - her sentence
rhythm, her use of specific data/evidence, her structure, and the things she never says. Do not
write generic skincare marketing copy.

VOICE PROFILE:
"""
${voiceSkill}
"""
${referenceBlock}
RAW NOTE FROM MEERA:
"""
${note}
"""

Write the full LinkedIn post draft only - no preamble, no explanation, no markdown headers, no
hashtags unless her voice profile calls for them. Output just the post text.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
