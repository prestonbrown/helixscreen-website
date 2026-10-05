import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DOC_VERSIONS, docsPrefix, refEnvVar } from '../src/data/doc-versions.mjs';
import { docExists, presentSidebar, versionConfig } from '../src/data/docs-sidebar.mjs';
import { parseOverrides, pickDocRef, resolveDocRefs } from '../scripts/resolve-doc-refs.mjs';

const STABLE = { slug: '1.0', tagPrefix: 'v1.0.', prerelease: false, fallbackRef: 'main' };
const BETA = { slug: '1.1', tagPrefix: 'v1.1.', prerelease: true, fallbackRef: 'main' };
const rel = (tag_name, published_at, extra = {}) => ({ tag_name, published_at, draft: false, prerelease: tag_name.includes('-'), ...extra });
const RELEASES = [
  rel('v1.1.0-beta.3', '2026-09-30T00:00:00Z'),
  rel('v1.0.3', '2026-09-20T00:00:00Z'),
  rel('v1.1.0-beta.4', '2026-10-04T00:00:00Z', { draft: true }),
  rel('v1.0.4-rc.1', '2026-10-01T00:00:00Z'),
  rel('v1.1.0-beta.2', '2026-09-10T00:00:00Z'),
  rel('v1.0.2', '2026-09-25T00:00:00Z'),
];

test('stable version takes the newest published non-prerelease with its prefix', () => {
  // v1.0.2 was published after v1.0.3 here: publish date decides, not the tag.
  assert.equal(pickDocRef(RELEASES, STABLE), 'v1.0.2');
  assert.equal(pickDocRef(RELEASES.filter((r) => r.tag_name !== 'v1.0.2'), STABLE), 'v1.0.3');
});

test('beta version takes prereleases but never a draft', () => {
  assert.equal(pickDocRef(RELEASES, BETA), 'v1.1.0-beta.3');
});

test('a version with no release yet falls back to its fallback ref', () => {
  assert.equal(pickDocRef(RELEASES, { ...BETA, tagPrefix: 'v1.2.' }), 'main');
  assert.equal(pickDocRef([], STABLE), 'main');
});

test('a prefix never matches a longer minor version', () => {
  assert.equal(pickDocRef([rel('v1.10.0', '2026-10-01T00:00:00Z')], BETA), 'main');
});

test('overrides pin versions by slug and reject unknown slugs', () => {
  assert.deepEqual(parseOverrides('1.1=main'), { '1.1': 'main' });
  assert.deepEqual(parseOverrides(''), {});
  assert.throws(() => parseOverrides('2.0=main'), /bad override/);
  assert.throws(() => parseOverrides('1.1'), /bad override/);
});

test('every configured version gets one env var, current first', () => {
  const refs = resolveDocRefs(RELEASES, { '1.1': 'main' });
  assert.equal(refs[0][0], 'HELIX_DOCS_REF');
  assert.deepEqual(refs.find(([name]) => name === 'HELIX_DOCS_REF_1_1'), ['HELIX_DOCS_REF_1_1', 'main']);
  assert.equal(refs.length, 1 + DOC_VERSIONS.others.length);
});

test('promoting 1.1 moves it to the root and 1.0 under /1.0/', () => {
  const swapped = {
    current: { ...BETA, prerelease: false },
    others: [{ ...STABLE, fallbackRef: 'v1.0.3' }],
  };
  assert.equal(docsPrefix('1.1', swapped), '');
  assert.equal(docsPrefix('1.0', swapped), '/1.0');
  assert.equal(refEnvVar('1.1', swapped), 'HELIX_DOCS_REF');
  assert.equal(refEnvVar('1.0', swapped), 'HELIX_DOCS_REF_1_0');
  // A stable 1.1 ignores its betas.
  assert.equal(pickDocRef(RELEASES, swapped.current), 'main');
});

test('the shipped config serves 1.1 under /1.1/ and the current version at the root', () => {
  assert.equal(docsPrefix(DOC_VERSIONS.current.slug), '');
  assert.equal(docsPrefix('1.1'), '/1.1');
});

const SIDEBAR = [
  { label: 'Install', items: [{ label: 'Install', slug: 'installation' }] },
  {
    label: 'Settings',
    items: [
      { label: 'Overview', slug: 'guide/settings' },
      { label: 'Display & Sound', slug: 'guide/settings/display-sound' },
      { label: 'Display', slug: 'guide/settings/display' },
    ],
  },
  { label: 'Gone', items: [{ label: 'Nothing', slug: 'guide/nothing' }] },
  { label: 'External', link: 'https://example.com' },
  { label: 'Developer Docs', items: [{ label: 'Overview', slug: 'dev' }, { label: 'Setup', slug: 'dev/setup' }] },
];

function docsTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'helix-docs-'));
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), '---\ntitle: x\n---\n');
  }
  return root;
}

test('docExists accepts a page file or a directory index', () => {
  const root = docsTree(['installation.md', 'guide/settings/index.md']);
  try {
    assert.ok(docExists(root, 'installation'));
    assert.ok(docExists(root, 'guide/settings'));
    assert.ok(!docExists(root, 'guide/settings/display'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('presentSidebar drops missing pages and the groups they empty, keeps links', () => {
  const have = new Set(['installation', 'guide/settings', 'guide/settings/display-sound']);
  const out = presentSidebar(SIDEBAR, (s) => have.has(s));
  assert.deepEqual(out.map((g) => g.label), ['Install', 'Settings', 'External']);
  assert.deepEqual(out[1].items.map((i) => i.slug), ['guide/settings', 'guide/settings/display-sound']);
});

test('a version sidebar lists its own pages and excludes the root developer docs', () => {
  const root = docsTree([
    'installation.md',
    'guide/settings/display-sound.md',
    'dev/index.md',
    'dev/setup.md',
    '1.1/installation.md',
    '1.1/guide/settings/index.md',
    '1.1/guide/settings/display.md',
  ]);
  try {
    const { sidebar, excluded } = versionConfig(root, '1.1', SIDEBAR);
    assert.deepEqual(sidebar.find((g) => g.label === 'Settings').items.map((i) => i.slug), [
      'guide/settings',
      'guide/settings/display',
    ]);
    assert.deepEqual(excluded, ['dev', 'dev/setup']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Built-site checks. They run after `astro build`, like no-tells.test.mjs.
const DIST_VERSION = join('dist', '1.1');

function htmlFiles(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

// Links inside the rendered page body, not the sidebar or header chrome.
function contentLinks(html) {
  const body = html.split('class="sl-markdown-content"')[1] ?? '';
  return [...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
}

const DOC_ROOTS = /^\/(installation|upgrading|guide|reference|legal)([/#]|$)/;

test('1.1 pages link to other docs pages within /1.1/', { skip: !existsSync(DIST_VERSION) }, () => {
  const links = htmlFiles(DIST_VERSION).flatMap((f) => contentLinks(readFileSync(f, 'utf8')).map((l) => [f, l]));
  assert.ok(links.some(([, l]) => l.startsWith('/1.1/guide/')), 'no versioned links found: the scan read nothing');
  assert.deepEqual(links.filter(([, l]) => DOC_ROOTS.test(l)).map(([f, l]) => `${f}: ${l}`), []);
});

test('root docs pages never link into /1.1/', { skip: !existsSync(DIST_VERSION) }, () => {
  const roots = ['installation', 'upgrading', 'guide', 'reference', 'legal'].map((d) => join('dist', d)).filter(existsSync);
  const strays = roots.flatMap((d) => htmlFiles(d)).flatMap((f) =>
    contentLinks(readFileSync(f, 'utf8')).filter((l) => l.startsWith('/1.1/')).map((l) => `${f}: ${l}`),
  );
  assert.deepEqual(strays, []);
});

test('docs pages carry both the version picker and the theme switcher', { skip: !existsSync(DIST_VERSION) }, () => {
  for (const f of [join('dist', 'guide', 'printing', 'index.html'), join(DIST_VERSION, 'guide', 'printing', 'index.html')]) {
    const html = readFileSync(f, 'utf8');
    assert.match(html, /<starlight-version-select/, f);
    assert.match(html, /class="hx-switcher/, f);
  }
});
