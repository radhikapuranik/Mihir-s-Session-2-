/**
 * Optional current/topical reference (a news angle or industry data point) to ground a
 * draft so it doesn't read like it was written in a vacuum.
 *
 * No search API is wired up yet. This returns undefined until one is added - drafting still
 * works fine without it, just without an external reference. To wire one in later (e.g. a news
 * or web search API), implement the lookup here and return a short string summarizing the
 * relevant reference, keyed off the note's topic.
 */
export async function findTopicalReference(_note: string): Promise<string | undefined> {
  return undefined;
}
