import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// Scope: the CSS *we* author, and the landing page we build from it.
//
// These assertions deliberately do NOT scan all of dist/. That directory also
// contains Starlight's and Pagefind's stylesheets, which ship 19 box-shadow
// declarations and 8px/10px radii of their own — vendor code this phase does not
// touch. Spec phase 3 brings the docs chrome under the token system; widening
// this gate to dist/ belongs in that phase, not this one. Likewise the banned-copy
// check reads only the landing page: doc pages are authored in the helixscreen
// repo, and their prose is not ours to gate.
const SRC = 'src';
const LANDING = join('dist', 'index.html');

function collect(dir, exts, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collect(p, exts, acc);
    else if (exts.includes(extname(p))) acc.push(p);
  }
  return acc;
}

// Authored styles: standalone stylesheets plus inline <style> in components.
// themes.generated.css is excluded — it is generated and asserted in Task 1.
const authoredCss = () =>
  collect(SRC, ['.css', '.astro'])
    .filter((f) => !f.endsWith('themes.generated.css'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

const landing = () => {
  if (!existsSync(LANDING)) throw new Error('run `npx astro build` before this test');
  return readFileSync(LANDING, 'utf8');
};

// tokens.css intentionally carries `box-shadow: none !important` as the
// enforcement mechanism for "no shadows, ever" — a global reset, not a
// violation. A single regex with a negative lookahead here (`(?!none)`)
// re-matched that reset: `\s*` backtracks to satisfy the lookahead one
// position early, then the trailing character class re-consumes the very
// "none" the lookahead was meant to exclude. Match-then-filter avoids the
// backtracking trap entirely.
test('no shadows in authored CSS', () => {
  const hits = (authoredCss().match(/box-shadow\s*:[^;}]*/g) ?? [])
    .filter((d) => !/^\s*box-shadow\s*:\s*none\b/i.test(d));
  assert.deepEqual(hits, [], `found shadows: ${hits.slice(0, 3).join(' | ')}`);
});

test('no gradient-filled text', () => {
  assert.doesNotMatch(authoredCss(), /-webkit-text-fill-color\s*:\s*transparent/);
});

test('no radius above the 3px the theme schema allows', () => {
  const hits = authoredCss().match(/border-radius\s*:\s*(\d+)px/g) ?? [];
  const bad = hits.filter((h) => Number(h.match(/(\d+)px/)[1]) > 3);
  assert.deepEqual(bad, [], `radius too large: ${bad.slice(0, 5).join(' | ')}`);
});

test('deleted decorative classes do not reappear', () => {
  const all = authoredCss() + landing();
  for (const cls of ['gradient-text', 'mesh-bg', 'mesh-drift', 'hero-gradient', 'screenshot-glow', 'scroll-indicator', 'fade-bounce']) {
    assert.ok(!all.includes(cls), `${cls} is back`);
  }
});

test('banned copy does not appear on the landing page', () => {
  const html = landing().toLowerCase();
  for (const phrase of [
    'beautiful, customizable, community-driven',
    'built by makers, for makers',
    'your printer deserves',
    'multi-material, mastered',
    'seamless', 'effortless', 'unleash',
  ]) {
    assert.ok(!html.includes(phrase), `banned copy present: "${phrase}"`);
  }
});

test('Space Grotesk is gone from authored styles and the landing page', () => {
  assert.ok(!/space.?grotesk/i.test(authoredCss() + landing()), 'Space Grotesk still referenced');
});

// `ink-subtle` maps to the app's `text_subtle`, a hint-text token meant for a touch
// panel at large sizes. Every use of it on this site was 10-12px, where it measures
// 4.02:1 on canvas and 2.88:1 on overlay — both under AA's 4.5:1. Three tiers
// (ink, ink-muted, accent) carry enough hierarchy, so it is simply not used for text.
test('ink-subtle is not used for text in landing components', () => {
  const files = collect(join(SRC, 'components', 'marketing'), ['.astro']);
  const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('ink-subtle'));
  assert.deepEqual(offenders, [], `ink-subtle used in: ${offenders.join(', ')}`);
});

test('the headline is present exactly once on the landing page', () => {
  const matches = landing().match(/Everything your printer knows, on the screen it already has\./g) ?? [];
  assert.equal(matches.length, 1);
});
