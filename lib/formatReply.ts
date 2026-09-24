import type { PipelineResult } from "./pipeline.js";

function formatLinksSection(result: Extract<PipelineResult, { status: "drafted" }>): string {
  const { newsArticle, usedArticle } = result;

  if (!newsArticle) {
    return "Links:\nNo relevant Google News article found for this note.";
  }

  if (!usedArticle) {
    return `Links:\nFound "${newsArticle.headline}" (${newsArticle.source}) via Google News, but it wasn't relevant enough to the note's point to use.`;
  }

  return `Links:\n- ${newsArticle.headline} — ${newsArticle.source}, ${newsArticle.date} — ${newsArticle.url}`;
}

/**
 * Builds the full Telegram reply for a pipeline result, including a score header (so
 * it's visible that the merged gate actually ran and what it decided) and, for drafts,
 * an always-present Links section showing whether Google News turned up anything and
 * whether it was used - not just silently present/absent.
 */
export function formatReply(result: PipelineResult): string {
  if (result.status === "rejected") {
    return `Score: ${result.score}/10 — below the posting threshold.\nReason: ${result.reason}\n\n${result.message}`;
  }

  const scoreHeader = `The note sent is scored above the passing grade and is worth posting.\nScore: ${result.score}/10 — ${result.reason}`;

  return `${scoreHeader}\n\nDraft ready for review:\n\n${result.draft}\n\n${formatLinksSection(result)}`;
}
