export const REPO = 'prestonbrown/helixscreen';

/** Published (non-draft) GitHub releases, newest publish date first. */
export function publishedNewestFirst(releases) {
  const when = (r) => Date.parse(r.published_at ?? r.created_at);
  return releases.filter((r) => !r.draft).sort((a, b) => when(b) - when(a));
}
