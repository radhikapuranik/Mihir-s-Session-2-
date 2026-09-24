import { scoreNote, draftLinkedInPost } from "./gemini.js";
import { loadVoiceSkill } from "./voiceSkill.js";
import { findNewsAngle, type NewsArticle } from "./newsAngle.js";
import { appendVerifyFlag } from "./sourcesBlock.js";

const SCORE_THRESHOLD = 6;
const COMPANY_NAME = "Skinstinct";

export type PipelineResult =
  | { status: "rejected"; score: number; reason: string; message: string }
  | {
      status: "drafted";
      score: number;
      reason: string;
      draft: string;
      newsArticle: NewsArticle | undefined;
      usedArticle: boolean;
    };

/**
 * Runs one incoming note through the full pipeline: merged relevance-and-quality gate
 * -> (if it passes) news angle sourced from the note's own content -> draft. Never
 * publishes anything - the caller delivers the result back to Meera for review, and
 * decides how to present the score/news-article diagnostics alongside it.
 */
export async function runPipeline(note: string): Promise<PipelineResult> {
  const { score, reason } = await scoreNote(note);

  if (score < SCORE_THRESHOLD) {
    const trimmedReason = reason.trim().replace(/[.!?]+$/, "");
    const message = `This one doesn't feel like a fit for ${COMPANY_NAME}'s LinkedIn right now — ${trimmedReason}. Happy to revisit if you want to add more context.`;
    return { status: "rejected", score, reason, message };
  }

  const voiceSkill = loadVoiceSkill();
  const newsArticle = await findNewsAngle(note);

  const { draft, usedArticle, usedNewsFact } = await draftLinkedInPost({
    note,
    voiceSkill,
    newsArticle,
  });
  const finalDraft = appendVerifyFlag(draft, usedNewsFact);

  return { status: "drafted", score, reason, draft: finalDraft, newsArticle, usedArticle };
}
