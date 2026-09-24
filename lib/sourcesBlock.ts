const VERIFY_FLAG = "⚠️ Check this before publishing — you are the author of this claim.";

/**
 * Appends the verify-before-publishing flag to a draft, but only when a specific fact
 * from a news article was actually pulled into the post body (usedNewsFact).
 */
export function appendVerifyFlag(draft: string, usedNewsFact: boolean): string {
  if (!usedNewsFact) return draft;
  return `${draft}\n\n${VERIFY_FLAG}`;
}
