import { evaluateNote, draftLinkedInPost } from "./gemini.js";
import { loadVoiceSkill } from "./voiceSkill.js";
import { findTopicalReference } from "./topicalReference.js";

export type PipelineResult =
  | { status: "skipped"; reason: string }
  | { status: "drafted"; draft: string };

/**
 * Runs one incoming note through the full pipeline: gate -> (optional topical
 * reference) -> draft. Never publishes anything - the caller is responsible for
 * delivering the draft back to Meera for review.
 */
export async function runPipeline(note: string): Promise<PipelineResult> {
  const gate = await evaluateNote(note);
  if (!gate.worthDeveloping) {
    return { status: "skipped", reason: gate.reason };
  }

  const voiceSkill = loadVoiceSkill();
  const topicalReference = await findTopicalReference(note);

  const draft = await draftLinkedInPost({ note, voiceSkill, topicalReference });
  return { status: "drafted", draft };
}
