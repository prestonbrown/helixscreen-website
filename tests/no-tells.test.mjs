import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, lstatSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

// Scope: the CSS *we* author, and every page whose markup and copy we write.
//
// These assertions deliberately do NOT scan all of dist/. That directory also
// contains Starlight's and Pagefind's stylesheets, which ship 19 box-shadow
// declarations and 8px/10px radii of their own — vendor code this project does
// not control. Likewise the banned-copy check never reads doc pages: those are
// authored in the helixscreen repo and synced, so their prose is not ours to
// gate.
const SRC = 'src';

// Every page whose markup and copy we write. Doc pages are deliberately absent:
// they are authored in the helixscreen repo and synced, so their prose is not
// ours to gate. Vendor CSS (Starlight, Pagefind) stays out for the same reason
// it always has — it ships shadows and 8px radii this project does not control.
const AUTHORED_PAGES = [
  join('dist', 'index.html'),
  join('dist', 'printers', 'index.html'),
  join('dist', 'whats-new', 'index.html'),
  join('dist', 'contact', 'index.html'),
];
const LANDING = AUTHORED_PAGES[0];

function readAuthoredPages() {
  return AUTHORED_PAGES.filter(existsSync).map((p) => [p, readFileSync(p, 'utf8')]);
}

// lstat, not stat: a symlink under src/ must not be followed (cycle risk,
// and it would mean scanning something outside this repo's authored tree).
// Unreadable entries (a broken symlink, a permissions edge case) are skipped
// rather than crashing the whole gate.
function collect(dir, exts, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    let stat;
    try {
      stat = lstatSync(p);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) collect(p, exts, acc);
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

// readAuthoredPages filters to files that exist, so a typo'd path would
// silently gate nothing. This keeps the set honest.
test('every authored page is present to be gated', () => {
  const missing = AUTHORED_PAGES.filter((p) => !existsSync(p));
  assert.deepEqual(missing, [], `built pages missing from dist/: ${missing.join(', ')}`);
});

// tokens.css intentionally carries `box-shadow: none !important` (and the
// same for text-shadow below) as the enforcement mechanism for "no shadows,
// ever" — a global reset, not a violation. A single regex with a negative
// lookahead here (`(?!none)`) re-matched that reset: `\s*` backtracks to
// satisfy the lookahead one position early, then the trailing character
// class re-consumes the very "none" the lookahead was meant to exclude.
// Match-then-filter avoids the backtracking trap entirely.
test('no shadows in authored CSS', () => {
  const hits = (authoredCss().match(/box-shadow\s*:[^;}]*/gi) ?? [])
    .filter((d) => !/^\s*box-shadow\s*:\s*none\b/i.test(d));
  assert.deepEqual(hits, [], `found shadows: ${hits.slice(0, 3).join(' | ')}`);
});

// Same enforcement pattern as box-shadow, and the same reset line in
// tokens.css resets this property too — a naive "any text-shadow" regex
// would hit the same false positive, so this uses the same match-then-filter
// shape rather than a lookahead.
test('no text-shadow in authored CSS', () => {
  const hits = (authoredCss().match(/text-shadow\s*:[^;}]*/gi) ?? [])
    .filter((d) => !/^\s*text-shadow\s*:\s*none\b/i.test(d));
  assert.deepEqual(hits, [], `found text-shadow: ${hits.slice(0, 3).join(' | ')}`);
});

// `filter: drop-shadow(...)` is a visually-identical route to the same old
// screenshot glow this rework removed — and it would apply to exactly the
// `.plinth` framing that replaced it. box-shadow/text-shadow resets don't
// touch `filter` at all, so this needs its own check.
test('no drop-shadow filters in authored CSS', () => {
  assert.doesNotMatch(authoredCss(), /\bfilter\s*:[^;}]*drop-shadow/i);
});

test('no gradient-filled text', () => {
  const css = authoredCss();
  assert.doesNotMatch(css, /-webkit-text-fill-color\s*:\s*transparent/i);
  // `background-clip: text` (prefixed or not) is the standard, unprefixed
  // way to do gradient-filled text — arguably more common than the
  // -webkit-text-fill-color pairing above. This design system has no
  // legitimate use for it at all, so the property is flagged outright
  // rather than trying to detect it paired with a transparent color.
  assert.doesNotMatch(css, /\b(-webkit-)?background-clip\s*:\s*text\b/i);
});

// The two tests above catch gradients used specifically to fill text, and
// the "deleted decorative classes" test below catches the removed
// `.hero-gradient` class by name — but neither catches a `linear-gradient`,
// `radial-gradient`, or `conic-gradient` used anywhere else (a band, a
// button, a card background under a new class name). The spec bans gradient
// fills outright, so the property itself is flagged, prefixed or not, in
// both the CSS we author and the page we build from it.
test('no gradient fills anywhere in authored CSS or any authored page', () => {
  const gradientRe = /(-webkit-|-moz-)?\b(linear|radial|conic)-gradient\s*\(/i;
  assert.doesNotMatch(authoredCss(), gradientRe, 'authored CSS contains a gradient fill');
  for (const [path, html] of readAuthoredPages()) {
    assert.doesNotMatch(html, gradientRe, `${path} contains a gradient fill`);
  }
});

// Radius is authored on two surfaces here: literal CSS `border-radius`
// values, and Tailwind's `rounded-*` utility classes in .astro markup. Both
// must be checked — this codebase writes radius almost exclusively as the
// class `rounded-[var(--hx-radius)]`, which never produces literal
// `border-radius: Npx` text, so a CSS-only check has nothing to match and a
// contributor writing `rounded-lg` sails through untouched.
//
// Utility-class px values come from Tailwind's default scale
// (node_modules/tailwindcss/theme.css: xs=2px, sm=4px, md=6px, lg=8px,
// xl=12px, 2xl=16px, 3xl=24px, 4xl=32px; bare `rounded` = --radius = 4px).
// `var(--hx-radius)` — as a literal CSS value or inside the arbitrary class
// form `rounded-[var(--hx-radius)]` — is the one asserted-safe indirection
// (the schema caps it at 3px) and always passes. An unrecognized length unit
// or utility suffix is flagged conservatively rather than silently passed.
//
// RADIUS_SCALE_PX is a hand-copied snapshot of Tailwind's default radius
// scale, taken from node_modules/tailwindcss/theme.css (`--radius-xs`
// through `--radius-4xl`, plus the bare `--radius` used by unsuffixed
// `rounded`). It is not read from that file at runtime — a test that
// crashes because a dependency's internal file layout changed is worse than
// a stale constant. Re-check this table by hand against theme.css on any
// Tailwind major-version upgrade.
const RADIUS_SCALE_PX = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32, full: Infinity };

// Assumes a 16px root font size when converting rem/em to px — true for
// this site (no root font-size override), but worth stating since it's not
// derived from anything at runtime.
function lengthToPx(token) {
  if (/^var\(/i.test(token)) return 0;
  const m = token.match(/^(-?\d*\.?\d+)(px|rem|em|%)?$/i);
  if (!m) return Infinity; // e.g. calc(...) — can't evaluate statically, flag it
  const num = parseFloat(m[1]);
  const unit = (m[2] ?? 'px').toLowerCase();
  if (unit === 'rem' || unit === 'em') return num * 16;
  if (unit === '%') return num > 0 ? Infinity : 0; // not measurable in px; any nonzero % is suspect
  return num;
}

// Tailwind's directional/corner infixes: `rounded-{dir}-{size}`, e.g.
// `rounded-t-lg`, `rounded-tl-[var(--hx-radius)]`. The two-letter corner
// tokens are tried before the one-letter side tokens so `tl-xl` isn't
// misread as side `t` plus a leftover `l-xl` — though in practice the
// required `-` immediately after the token already prevents that ambiguity
// (`tr-xl` doesn't start with `t-`). Strips the direction and leaves the
// size suffix (`lg`, `none`, `[var(--hx-radius)]`, …) for the existing
// scale/arbitrary-value logic to evaluate unchanged.
const RADIUS_DIRECTIONS = ['tl', 'tr', 'bl', 'br', 'ss', 'se', 'es', 'ee', 't', 'b', 'l', 'r', 's', 'e'];

function stripRadiusDirection(suffix) {
  for (const dir of RADIUS_DIRECTIONS) {
    if (suffix.startsWith(`${dir}-`)) return suffix.slice(dir.length + 1);
  }
  return suffix;
}

function cssRadiusHits(css) {
  const hits = [];
  const re = /border-radius\s*:\s*([^;}]+)/gi;
  let m;
  while ((m = re.exec(css))) {
    const value = m[1].trim();
    // Shorthand can carry up to 4 values (and an optional `/` for
    // horizontal/vertical radii) — the offending value is not always first,
    // e.g. `border-radius: 0 0 8px 8px`.
    const max = value
      .split('/')
      .flatMap((half) => half.trim().split(/\s+/))
      .filter(Boolean)
      .reduce((acc, tok) => Math.max(acc, lengthToPx(tok)), 0);
    if (max > 3) hits.push(`border-radius: ${value}`);
  }
  return hits;
}

function classRadiusHits(css) {
  const hits = [];
  // Stops the suffix at whitespace/quotes (class-attribute boundaries), and
  // the trailing lookahead keeps a bare `rounded` from matching inside an
  // unrelated identifier like `roundedCorners`.
  const re = /\brounded(?:-([^\s"'`]+))?(?![a-zA-Z0-9])/g;
  let m;
  while ((m = re.exec(css))) {
    const rawSuffix = m[1];
    const suffix = rawSuffix === undefined ? undefined : stripRadiusDirection(rawSuffix);
    let px;
    if (suffix === undefined) px = 4; // bare `rounded` = --radius = 0.25rem
    else if (suffix in RADIUS_SCALE_PX) px = RADIUS_SCALE_PX[suffix];
    else {
      const arb = suffix.match(/^\[(.+)\]$/);
      px = arb ? lengthToPx(arb[1].trim()) : Infinity; // unrecognized suffix — flag it
    }
    if (px > 3) hits.push(m[0]);
  }
  return hits;
}

test('no radius above the 3px the theme schema allows', () => {
  const css = authoredCss();
  const hits = [...cssRadiusHits(css), ...classRadiusHits(css)];
  assert.deepEqual(hits, [], `radius too large: ${hits.slice(0, 5).join(' | ')}`);
});

const DELETED_CLASSES = ['gradient-text', 'mesh-bg', 'mesh-drift', 'hero-gradient', 'screenshot-glow', 'scroll-indicator', 'fade-bounce'];

test('deleted decorative classes do not reappear in authored CSS', () => {
  const css = authoredCss();
  for (const cls of DELETED_CLASSES) {
    assert.ok(!css.includes(cls), `${cls} is back in authored CSS`);
  }
});

test('deleted decorative classes do not reappear on any authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    for (const cls of DELETED_CLASSES) {
      assert.ok(!html.includes(cls), `${path} reintroduces .${cls}`);
    }
  }
});

const BANNED_COPY = [
  'beautiful, customizable, community-driven',
  'built by makers, for makers',
  'your printer deserves',
  'multi-material, mastered',
  'seamless', 'effortless', 'unleash',
];

// Marketing prose gets wrapped in inline tags (`<em>`, `<strong>`) and the
// build can introduce line breaks mid-phrase, so a banned phrase can survive
// on the rendered page while failing a raw substring match against the HTML.
// Stripping tags and collapsing whitespace before matching closes both gaps.
test('banned copy does not appear on any authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    for (const phrase of BANNED_COPY) {
      assert.ok(!text.includes(phrase), `${path} contains banned copy: "${phrase}"`);
    }
  }
});

test('Space Grotesk is gone from authored styles', () => {
  assert.ok(!/space.?grotesk/i.test(authoredCss()), 'Space Grotesk still referenced in authored CSS');
});

test('Space Grotesk is gone from every authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    assert.doesNotMatch(html, /space.?grotesk/i, `${path} still loads Space Grotesk`);
  }
});

// `ink-subtle` maps to the app's `text_subtle`, a hint-text token meant for a touch
// panel at large sizes. Every use of it on this site was 10-12px, where it measures
// 4.02:1 on canvas and 2.88:1 on overlay — both under AA's 4.5:1. Three tiers
// (ink, ink-muted, accent) carry enough hierarchy, so it is simply not used for text.
// Scoped to all of src/, not just components/marketing/: the layout and the
// page itself (src/layouts/MarketingLayout.astro, src/pages/index.astro) can
// use it just as easily. (The generated theme CSS carries `--hx-text-subtle`,
// a different string, so widening the scope does not false-positive there.)
test('ink-subtle is not used for text anywhere in src', () => {
  const files = collect(SRC, ['.astro']);
  const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('ink-subtle'));
  assert.deepEqual(offenders, [], `ink-subtle used in: ${offenders.join(', ')}`);
});

// `alert` (--hx-danger, #D94848) is 4.15:1 on the default canvas — under the 4.5:1
// AA floor for small text. It is fine as a border, where the 3:1 non-text bar
// applies, but it must not carry text. The contrast gate below cannot catch this
// on its own: it walks a hand-built pair list, and a token nothing declares a pair
// for is simply never checked. This is how the whats-new "withdrawn" marker
// shipped at 4.15:1 in the first place.
test('alert is not used for text anywhere in src', () => {
  const files = collect(SRC, ['.astro']);
  const offenders = files.filter((f) => readFileSync(f, 'utf8').includes('text-alert'));
  assert.deepEqual(offenders, [], `text-alert used in: ${offenders.join(', ')}`);
});

test('the headline is present exactly once on the landing page', () => {
  const matches = landing().match(/Everything your printer knows, on the screen it already has\./g) ?? [];
  assert.equal(matches.length, 1);
});

// --- WCAG contrast gate, default theme only --------------------------------
//
// The `ink-subtle` test above is a contrast ruling too, just a blunt one
// ("never use this token for text"). This extends the same ruling to a live
// computation: read the DEFAULT theme's actual hex values out of the
// generated CSS — never hardcoded here, since themes.generated.css is
// regenerated from the app on every build — and fail if a foreground/
// background pair this page actually renders small text with falls under
// AA's 4.5:1 threshold.
//
// Scoped to `[data-hx-theme="helixscreen"][data-theme="dark"]` only: that's the
// theme+mode every first-time visitor sees, and the one this gate exists to
// hold. The other 31 theme×mode combinations are the app's own palettes, a
// design decision for the site owner, not this branch's to enforce.
//
// SMALL_TEXT_PAIRS is a hand-built inventory of which foreground token rides
// on which background token, for every place the page sets text under the
// ~24px/18pt large-text threshold. Headings (text-2xl and up) are exempt:
// they clear the large-text 3:1 bar comfortably even in the one case
// (`ink` on `canvas`) they'd also need to pass at the stricter 4.5:1. This
// list can't be derived from a generic HTML/CSS scan — Tailwind classes
// don't carry their ancestor's background with them — so add to it by hand
// whenever a new small-text color/background combination is introduced.
const THEMES_CSS = join('src', 'styles', 'themes.generated.css');
const THEME_VARS = {
  canvas: '--hx-screen-bg',
  overlay: '--hx-overlay-bg',
  card: '--hx-card-bg',
  ink: '--hx-text',
  'ink-muted': '--hx-text-muted',
  secondary: '--hx-secondary',
  ok: '--hx-success',
  warn: '--hx-warning',
};

function defaultThemeTokens() {
  const css = readFileSync(THEMES_CSS, 'utf8');
  const block = css.match(/\[data-hx-theme="helixscreen"\]\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error('could not find the helixscreen/dark block in themes.generated.css');
  const body = block[1];
  const tokens = {};
  for (const [name, varName] of Object.entries(THEME_VARS)) {
    const m = body.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
    if (!m) throw new Error(`${varName} not found in the helixscreen/dark block`);
    tokens[name] = m[1];
  }
  return tokens;
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// [pair name, foreground token, background token, where it's used]
const SMALL_TEXT_PAIRS = [
  ['ink on canvas',        'ink',       'canvas',  'body copy, table cells, Figure annotation'],
  ['ink-muted on canvas',  'ink-muted', 'canvas',  'the great majority of body/caption/label text'],
  ['ink-muted on overlay', 'ink-muted', 'overlay', 'Hero $ prompt, SiteNav mobile menu links'],
  ['secondary on canvas',  'secondary', 'canvas',  'inline links: Hero install guide, GetInTouch bugs@/security@'],
  ['warn on canvas',       'warn',      'canvas',  'Hero and Spotlight eyebrow labels, whats-new "withdrawn" marker'],
  ['ok on canvas',         'ok',        'canvas',  'ComparisonTable/SpecGrid "ok"-tone values'],
  ['ink on card',          'ink',       'card',    'PlatformTable <dt> platform name'],
  ['ink-muted on card',    'ink-muted', 'card',    'PlatformTable <dd> architecture, ThemeDemo body text'],
];

test('default theme (helixscreen/dark) clears AA 4.5:1 for every small-text pair the landing page uses', () => {
  const tokens = defaultThemeTokens();
  const failures = SMALL_TEXT_PAIRS
    .map(([name, fg, bg, where]) => ({ name, where, ratio: contrastRatio(tokens[fg], tokens[bg]) }))
    .filter(({ ratio }) => ratio < 4.5);
  assert.deepEqual(
    failures,
    [],
    failures.map((f) => `${f.name} (${f.where}): ${f.ratio.toFixed(2)}:1`).join('; ')
  );
});

// Docs pages went a whole phase without the theme system; a reader who picked a
// theme on the landing page landed on a differently-coloured site. These three
// assertions are the tripwire for that regressing.
const DOCS_PAGE = join('dist', 'guide', 'index.html');

test('docs pages carry the no-flash theme script', () => {
  const html = readFileSync(DOCS_PAGE, 'utf8');
  assert.match(html, /localStorage\.getItem\('hx-theme'\)/);
  assert.match(html, /setAttribute\('data-hx-theme'/);
});

test('docs pages carry the theme switcher', () => {
  const html = readFileSync(DOCS_PAGE, 'utf8');
  // Match the rendered control, not the bare substring: the component's inlined
  // script mentions `.hx-theme-select` as a selector, so a substring match still
  // passes when the class has been stripped off the <select> and nothing works.
  assert.match(html, /<select class="hx-theme-select[\s"]/);
});

// Starlight renders ThemeSelect in both the header and the mobile drawer. An id
// anywhere in that component would be duplicated, and every getElementById would
// bind the second instance to the first one's node, leaving it rendered but inert.
test('the theme switcher uses no ids, because it is rendered more than once', () => {
  const html = readFileSync(DOCS_PAGE, 'utf8');
  assert.doesNotMatch(html, /id="hx-(theme-select|mode-toggle|mode-label)"/);
  // Count the rendered element, not the bare substring: the component's scoped
  // <style> block mentions `hx-switcher` several times on its own, so a substring
  // count passes even when nothing rendered at all.
  const instances = (html.match(/<div class="hx-switcher[\s"]/g) ?? []).length;
  assert.equal(instances, 2, `expected the switcher in header and mobile drawer, found ${instances}`);
});

test('the forced-dark override is gone from docs pages', () => {
  const html = readFileSync(DOCS_PAGE, 'utf8');
  assert.doesNotMatch(html, /dataset\.theme = 'dark'/);
});
