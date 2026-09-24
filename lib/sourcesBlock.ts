import type { NewsArticle } from "./newsAngle.js";

const VERIFY_FLAG = "⚠️ Check this before publishing — you are the author of this claim.";

/**
 * Appends a sources block (and verify flag, if a fact from the article was pulled into
 * the post body) to a draft. Omits the block entirely when no article was used - never
 * shows an empty one.
 */
export function appendSourcesBlock(
  draft: string,
  article: NewsArticle | undefined,
  usedArticle: boolean,
  usedNewsFact: boolean
): string {
  if (!article || !usedArticle) return draft;

  const sourceLine = `- ${article.headline} — ${article.source}, ${article.date} — ${article.url}`;
  const sourcesBlock = `---\nSources:\n${sourceLine}`;

  const verifyLine = usedNewsFact ? `${VERIFY_FLAG}\n\n` : "";

  return `${draft}\n\n${verifyLine}${sourcesBlock}`;
}
