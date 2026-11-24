// The documentation versions helixscreen.org publishes. The only file to edit
// when a release line goes stable or a new one opens.
//
// `current` is served at the plain URLs (/installation/, /guide/...). Each
// entry in `others` is served under /<slug>/ from src/content/docs/<slug>/.
//
// Each version is synced from the newest published helixscreen release whose
// tag starts with `tagPrefix` (prereleases count only when `prerelease` is
// true), or from `fallbackRef` when no such release exists yet.
//
// Optional per-version fields: `status` is the short word the site's version
// picker shows after the slug (default: beta for a prerelease line, else
// previous); `note` is a sentence shown under the page title on that version's
// pages.
//
// Promoting a line to stable: make it `current` with a "(stable)" label and
// prerelease: false, and move the previous stable line into `others`, where it
// is served under /<slug>/ from then on.

export const DOC_VERSIONS = {
  current: { slug: '1.1', label: '1.1 (stable)', tagPrefix: 'v1.1.', prerelease: false, fallbackRef: 'main' },
  others: [
    { slug: '1.0', label: '1.0 (previous)', tagPrefix: 'v1.0.', prerelease: false, fallbackRef: 'v1.0.11' },
    {
      slug: '1.2',
      label: '1.2 (alpha)',
      status: 'alpha',
      note: 'These pages describe the 1.2 alpha, the development build published to the dev update channel. Features can change or be missing, and they can differ from the stable release.',
      tagPrefix: 'v1.2.',
      prerelease: true,
      fallbackRef: 'main',
    },
  ],
};

/** URL prefix for a version's docs: '' for the current version, '/<slug>' otherwise. */
export function docsPrefix(slug, versions = DOC_VERSIONS) {
  return slug === versions.current.slug ? '' : `/${slug}`;
}

/** Environment variable that pins the helixscreen ref a version syncs from. */
export function refEnvVar(slug, versions = DOC_VERSIONS) {
  return slug === versions.current.slug ? 'HELIX_DOCS_REF' : `HELIX_DOCS_REF_${slug.replace(/[^A-Za-z0-9]/g, '_')}`;
}

/**
 * Cloudflare Pages `_redirects` body sending the current version's slug to the
 * root, so /<slug>/guide/ resolves for every version. A screen builds its docs
 * link from its own version, and the stable one is served at the plain URLs.
 */
export function currentSlugRedirects(versions = DOC_VERSIONS) {
  const slug = versions.current.slug;
  return `/${slug} / 301\n/${slug}/* /:splat 301\n`;
}
