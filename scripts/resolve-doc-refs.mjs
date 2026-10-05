#!/usr/bin/env node
// Resolves the helixscreen ref each documentation version syncs from and
// prints one NAME=ref line per version, the names sync-docs.sh reads.
//
// Usage: node scripts/resolve-doc-refs.mjs [--override "1.0=main 1.1=main"]
// An override pins a version by slug and skips the release lookup for it.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DOC_VERSIONS, refEnvVar } from '../src/data/doc-versions.mjs';
import { REPO, publishedNewestFirst } from './releases.mjs';

/** Newest published release whose tag carries the version's prefix, else its fallback ref. */
export function pickDocRef(releases, version) {
  const hit = publishedNewestFirst(releases).find(
    (r) => r.tag_name.startsWith(version.tagPrefix) && (version.prerelease || !r.prerelease),
  );
  return hit ? hit.tag_name : version.fallbackRef;
}

/** "1.0=main 1.1=v1.1.0" -> { '1.0': 'main', '1.1': 'v1.1.0' }. Unknown slugs throw. */
export function parseOverrides(text, versions = DOC_VERSIONS) {
  const slugs = new Set([versions.current, ...versions.others].map((v) => v.slug));
  const out = {};
  for (const pair of String(text ?? '').split(/[\s,]+/).filter(Boolean)) {
    const [slug, ref] = pair.split('=');
    if (!slugs.has(slug) || !ref) throw new Error(`bad override "${pair}": expected <slug>=<ref>, slugs ${[...slugs].join(', ')}`);
    out[slug] = ref;
  }
  return out;
}

/** [[envVar, ref], ...] for every configured version, current first. */
export function resolveDocRefs(releases, overrides = {}, versions = DOC_VERSIONS) {
  return [versions.current, ...versions.others].map((v) => [
    refEnvVar(v.slug, versions),
    overrides[v.slug] ?? pickDocRef(releases, v),
  ]);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const i = process.argv.indexOf('--override');
  const overrides = parseOverrides(i === -1 ? '' : process.argv[i + 1]);
  let releases = [];
  try {
    // ponytail: newest 100 releases only; paginate if a release line ever goes 100 releases without a tag.
    const slim = '[.[] | {tag_name, draft, prerelease, published_at, created_at}]';
    releases = JSON.parse(
      execFileSync('gh', ['api', `repos/${REPO}/releases?per_page=100`, '--jq', slim], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  } catch (err) {
    const detail = String(err.stderr ?? '').trim().split('\n').pop() || err.message;
    console.error(`[resolve-doc-refs] release lookup failed (${detail}); using fallback refs.`);
  }
  for (const [name, ref] of resolveDocRefs(releases, overrides)) console.log(`${name}=${ref}`);
}
