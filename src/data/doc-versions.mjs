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
// Promoting 1.1 to stable: set `current` to { slug: '1.1', label: '1.1 (stable)',
// tagPrefix: 'v1.1.', prerelease: false } and replace `others` with
// [{ slug: '1.0', label: '1.0', tagPrefix: 'v1.0.', prerelease: false, fallbackRef: 'v1.0.3' }].
// The next sync then writes 1.0 under /1.0/ and 1.1 at the root.

export const DOC_VERSIONS = {
  current: { slug: '1.0', label: '1.0 (stable)', tagPrefix: 'v1.0.', prerelease: false, fallbackRef: 'main' },
  others: [
    { slug: '1.1', label: '1.1 (beta)', tagPrefix: 'v1.1.', prerelease: true, fallbackRef: 'main' },
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
