import { scoreNote, draftLinkedInPost } from "./gemini.js";
import { loadVoiceSkill } from "./voiceSkill.js";
import { findNewsAngle } from "./newsAngle.js";
import { appendSourcesBlock } from "./sourcesBlock.js";

const SCORE_THRESHOLD = 6;
const COMPANY_NAME = "Skinstinct";

export type PipelineResult =
  | { status: "rejected"; score: number; reason: string; message: string }
  | { status: "drafted"; draft: string };

/**
 * Runs one incoming note through the full pipeline: merged relevance-and-quality gate
 * -> (if it passes) news angle sourced from the note's own content -> draft with a
 * sources block appended. Never publishes anything - the caller delivers the result
 * back to Meera for review.
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
  const finalDraft = appendSourcesBlock(draft, newsArticle, usedArticle, usedNewsFact);

  return { status: "drafted", draft: finalDraft };
}
