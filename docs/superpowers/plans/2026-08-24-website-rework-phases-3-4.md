# helixscreen.org Rework — Implementation Plan (Phases 3–4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Starlight's docs chrome under the theme-token system so a reader's theme choice survives the jump from the landing page into the docs, and add the three routes the spec's information architecture calls for.

**Architecture:** Phase 3 resolves an attribute collision (Starlight owns `data-theme` and only ever tests it against the literal `light`), splits the site's theme identity onto `data-hx-theme`, and remaps every `--sl-color-*` onto the `--hx-*` tokens so Starlight inherits themes instead of carrying a second hardcoded palette. Phase 4 adds two generator scripts in the mould of `gen-themes.mjs` — one over the printer detection database, one over `CHANGELOG.md` — and three pages that consume their committed output.

**Tech Stack:** Astro 5.17, Starlight 0.37, Tailwind CSS v4, Node `node:test` (no new test dependency).

**Spec:** `docs/superpowers/specs/2026-08-24-website-rework-design.md`

**Prior plan:** `docs/superpowers/plans/2026-08-24-website-rework.md` (Phases 1–2, shipped)

**Scope:** Phases 3 and 4 of the spec's Delivery Order.

## Global Constraints

Every constraint from the Phases 1–2 plan still binds. Repeated here verbatim because a task's implementer sees only their own task:

- **No shadows and no glows, anywhere.** `shadow_intensity` is 0 in every shipped theme.
- **Borders are 1px. Radius is 3px.** Nothing rounder, from `border_width` / `border_radius_size`.
- **Default theme is `helixscreen`, mode `dark`** — matches `include/theme_loader.h:22`.
- **Authoritative theme count is 18.** Never hardcode it; derive from the generated manifest.
- **Type:** Source Serif 4 for prose and display, IBM Plex Sans for UI chrome and labels, IBM Plex Mono for anything measurable. Space Grotesk is removed entirely.
- **Numbers use `font-variant-numeric: tabular-nums`** wherever they can be compared.
- **Copy rules (binding):** no setup-payoff headlines; no lists of three; no em-dash adjective pileups; every headline a complete sentence. Banned strings: `beautiful, customizable, community-driven`, `built by makers, for makers`, `your printer deserves`, `mastered`, `seamless`, `effortless`, `unleash`.
- **The author appears in sublines, captions, margins and the colophon — never in an `h1`.**
- **Deleted CSS classes must not reappear:** `gradient-text`, `mesh-bg`, `mesh-drift`, `hero-gradient`, `screenshot-glow`, `scroll-indicator`, `fade-bounce`.
- **Sibling repo path:** `../helixscreen`. CI provides it via the symlink at `.github/workflows/deploy.yml:58-61`.

New constraints introduced by these two phases:

- **`data-theme` on `<html>` belongs to Starlight.** Its only permitted values are `dark` and `light`. The site's theme slug lives on `data-hx-theme`. Nothing may write a slug into `data-theme`.
- **Every generator degrades gracefully.** A checkout without `../helixscreen` must still build, by falling back to committed output. Copy the `try` / `console.warn` / `process.exit(0)` shape from `scripts/gen-themes.mjs`.
- **Generated output is committed.** `src/data/*.generated.json` and `src/styles/*.generated.css` are build products AND repo files.
- **Test scripts must run on Node 20 and Node 22.** Local is 20, CI pins 22. `node --test <dir>` resolves a directory on 20 and throws `MODULE_NOT_FOUND` on 22 — always pass explicit globs. This broke a deploy once.
- **Support status is the docs' vocabulary, not the site's.** `Tested` / `Supported` / `Community` / `Preliminary` are defined in `src/content/docs/reference/faq.md` and `src/content/docs/guide/supported-printers.md`, hand-curated per platform. Generated pages must never invent, infer, or restate a status. They link to the docs for it.
- **Printer and theme counts derive from generated manifests.** Never hardcode. The site currently says `80+` in two places; the real listed-model count is derived at build time.

---

## Rulings made before execution

Two things the spec assumed are no longer true. Both were checked against the repo, not guessed.

### Ruling 1 — the `data-theme` collision is real, and forces an attribute split

The spec (§Theme system, "Reach") says the switcher applies to docs pages and Starlight's `--sl-color-*` map onto the token set. It did not anticipate that **Starlight already uses `data-theme` on `<html>`** (`node_modules/@astrojs/starlight/style/props.css:118`) and branches on exactly one value: `:root[data-theme='light']`. Its base `:root` block is the dark palette and applies for every other value.

The site's `ThemeScript.astro:24` writes a theme *slug* into that same attribute. No slug is ever the literal string `light`, so wiring the switcher into docs unchanged would leave **Starlight's chrome permanently dark** — search dialog, asides, badges, code borders, and the `light:sl-hidden` / `dark:sl-hidden` utilities — while the page around it went light. Ten Starlight-authored `[data-theme=light]` selectors are already in the shipped docs bundle.

**Decision:** split the two concerns across two attributes.

| Attribute | Holds | Values |
|---|---|---|
| `data-hx-theme` | the theme slug | one of 18 slugs |
| `data-theme` | the mode | `dark` or `light` — Starlight's own vocabulary |

`data-mode` is retired. `localStorage` keys stay `hx-theme` and `hx-mode` so nobody's saved choice is lost.

*Cost if wrong:* it touches six shipped files and regenerates a committed CSS artifact. The alternative — re-implementing Starlight's ten light-mode selectors against our attribute — is fragile and breaks on every Starlight upgrade. Rejected.

### Ruling 2 — `/printers/` is an index, not a compatibility table

The spec calls `/printers/` a "filterable compatibility table over the 80+ model database" replacing the decorative `PrinterConstellation`. Since the spec was written, upstream published `guide/supported-printers.md` (236 lines) and the FAQ's platform table, which **already** carry curated support status across four levels, feature-by-feature, per platform.

Building a second compatibility table would duplicate curated prose and risk contradicting it — the exact failure a reviewer caught on the landing page last round.

**Decision:** `/printers/` answers the one question the docs deliberately do not — *"is my exact model in the auto-detection database?"* — as a generated, searchable index of all listed models. It carries no status badges, and links to `/guide/supported-printers/` and the FAQ for status. The docs stay the single source of truth for support level.

*Cost if wrong:* the page is thinner than specced. It is also the only surface that can't drift from the database, and it can gain columns later.

### Ruling 3 — `/whats-new/` features curated blocks, and lists the rest

`CHANGELOG.md` holds 203 release sections, but only **two** carry the `<!-- whatsnew ... -->` summary block that is obviously written for this surface. Rendering 203 sections is a wall; rendering two is a thin page.

**Decision:** featured entries come from `whatsnew` blocks (the author's own words, in the voice the spec asks for). Beneath them, a compact release-history table of the twelve most recent versions with dates, flagging `[WITHDRAWN]` where the heading says so, and a link to the full changelog on GitHub. The page grows on its own as more blocks are written.

### Ruling 4 — the printer `note` field stays private

Entries carry two free-text fields: `notes` (14 entries, user-facing caveats such as *"Stock display is a TJC HMI on serial bus"*) and `note` (7 entries, internal detection rationale such as *"The load-cell fingerprint is smart_effector + hx711 + lis2dw"*). Only `notes` is published. `note` is reasoning for the detector's author and reads as leaked internals on a public page.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `src/styles/hx-vars.css` | The `--hx-*` variable layer alone: `:root` fallback + generated theme blocks. Imported by both bundles. |
| `src/components/DocsThemeProvider.astro` | Starlight `ThemeProvider` slot — the no-flash script plus Starlight's picker stub |
| `scripts/gen-printers.mjs` | Turns the detection database into page data |
| `src/data/printers.generated.json` | Generated, committed. Listed models, manufacturers, counts |
| `scripts/gen-whatsnew.mjs` | Turns `CHANGELOG.md` into page data |
| `src/data/whatsnew.generated.json` | Generated, committed. Featured entries + release history |
| `src/pages/printers.astro` | The searchable model index |
| `src/pages/whats-new.astro` | Release notes |
| `src/pages/contact.astro` | Routed by intent |
| `tests/gen-printers.test.mjs` | Unit tests for the printer generator |
| `tests/gen-whatsnew.test.mjs` | Unit tests for the changelog parser |

**Modified**

| Path | Change |
|---|---|
| `scripts/gen-themes.mjs` | Emit the split selector |
| `src/styles/themes.generated.css` | Regenerated with the split selector |
| `src/styles/tokens.css` | Import `hx-vars.css` instead of inlining the fallback |
| `src/styles/starlight-custom.css` | Map `--sl-color-*` onto `--hx-*`; drop 10 hardcoded hexes |
| `src/components/ThemeScript.astro` | Write both attributes |
| `src/components/ThemeSwitcher.astro` | Write both attributes; self-contained styling |
| `src/components/marketing/ThemeDemo.astro` | Observe `data-hx-theme` |
| `src/components/marketing/PlatformTable.astro` | Derived count, link to `/printers/` |
| `src/components/marketing/Hero.astro` | Derived printer count |
| `src/components/marketing/SiteNav.astro` | Links to the new routes |
| `src/components/marketing/GetInTouch.astro` | Accept a `heading` prop so `/contact/` can reuse it |
| `astro.config.mjs` | Swap the two Starlight component overrides |
| `package.json` | Add both generators to `prebuild` |
| `tests/gen-themes.test.mjs` | Assert the split selector |
| `tests/no-tells.test.mjs` | Gate every route, not just the landing page |

**Deleted**

`src/components/ForceDarkTheme.astro`, `src/components/EmptyComponent.astro`.

---

# Phase 3 — Docs chrome

## Task 1: Split the theme attribute

**Files:**
- Modify: `scripts/gen-themes.mjs:33`
- Modify: `src/components/ThemeScript.astro:24-28`
- Modify: `src/components/ThemeSwitcher.astro:38-58`
- Modify: `src/components/marketing/ThemeDemo.astro:33,61`
- Modify: `tests/gen-themes.test.mjs:32,50,51,95,96`
- Modify: `tests/no-tells.test.mjs:277,304`
- Regenerate: `src/styles/themes.generated.css`

**Interfaces:**
- Produces: `<html data-hx-theme="<slug>" data-theme="<dark|light>">`. Every later task reads these names. `localStorage` keys are unchanged: `hx-theme`, `hx-mode`.
- Consumes: nothing.

**Why:** see Ruling 1. Starlight owns `data-theme` and tests it only against `light`.

- [ ] **Step 1: Update the failing tests first**

In `tests/gen-themes.test.mjs`, change the selector expectations. Line 32's helper regex becomes:

```js
    new RegExp(`\\[data-hx-theme="${slug}"\\]\\[data-theme="${mode}"\\] \\{([\\s\\S]*?)\\n\\}`)
```

Lines 50-51:

```js
  assert.match(css, /\[data-hx-theme="gruvbox"\]\[data-theme="dark"\]/);
  assert.match(css, /\[data-hx-theme="gruvbox"\]\[data-theme="light"\]/);
```

Lines 95-96 (the dark-only theme case):

```js
  assert.match(css, /\[data-hx-theme="[a-z-]+"\]\[data-theme="dark"\]/);
  assert.doesNotMatch(css, /\[data-theme="light"\]/);
```

Add one new test asserting the collision can never come back:

```js
test('no theme slug is ever written into data-theme', () => {
  const { css } = buildAll(FIXTURE_DIR);
  // Starlight branches on [data-theme='light'] and treats every other value as
  // dark. A slug in that attribute silently pins Starlight's chrome to dark.
  const slugsInDataTheme = [...css.matchAll(/\[data-theme="([^"]+)"\]/g)]
    .map((m) => m[1])
    .filter((v) => v !== 'dark' && v !== 'light');
  assert.deepEqual(slugsInDataTheme, []);
});
```

In `tests/no-tells.test.mjs`, lines 277 and 304 reference the default block. Update the comment and the regex:

```js
  const block = css.match(/\[data-hx-theme="helixscreen"\]\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL in `gen-themes.test.mjs` and `no-tells.test.mjs` — the generated CSS still emits `[data-theme="gruvbox"][data-mode="dark"]`.

- [ ] **Step 3: Change the generator**

`scripts/gen-themes.mjs:33` currently reads:

```js
      `[data-theme="${slug}"][data-mode="${mode}"] {\n${decls}\n` +
```

Replace with:

```js
      // Starlight owns `data-theme` and only ever tests it against 'light', so the
      // mode lives there and the slug gets its own attribute. Never merge these.
      `[data-hx-theme="${slug}"][data-theme="${mode}"] {\n${decls}\n` +
```

- [ ] **Step 4: Regenerate and confirm the artifact changed**

Run: `node scripts/gen-themes.mjs && head -3 src/styles/themes.generated.css`
Expected: the first selector reads `[data-hx-theme="ayu"][data-theme="dark"] {`

- [ ] **Step 5: Update `ThemeScript.astro`**

Replace lines 24-28 with:

```js
    document.documentElement.setAttribute('data-hx-theme', resolved[0]);
    document.documentElement.setAttribute('data-theme', resolved[1]);
  } catch (e) {
    document.documentElement.setAttribute('data-hx-theme', DEFAULT_THEME);
    document.documentElement.setAttribute('data-theme', DEFAULT_MODE);
```

Update the comment at line 2 to name the contract:

```js
// Must render inside <head> before any paint. Inline and synchronous on purpose.
// Writes two attributes: `data-hx-theme` carries the slug, `data-theme` carries
// the mode. Starlight reads `data-theme` and understands only 'dark' and 'light'.
```

- [ ] **Step 6: Update `ThemeSwitcher.astro`**

In `apply()`, lines 38-39 become:

```js
    root.setAttribute('data-hx-theme', theme);
    root.setAttribute('data-theme', resolved);
```

Lines 53-58 read the new names:

```js
  select.value = root.getAttribute('data-hx-theme') ?? 'helixscreen';
  apply(select.value, root.getAttribute('data-theme') ?? 'dark');

  select.addEventListener('change', () => apply(select.value, root.getAttribute('data-theme')));
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(select.value, next);
  });
```

Leave the `localStorage` keys (`hx-theme`, `hx-mode`) exactly as they are — renaming them would silently discard every existing visitor's saved choice.

- [ ] **Step 7: Update `ThemeDemo.astro`**

Line 33 and line 61 both watch the slug, which now lives elsewhere:

```js
    const current = root.getAttribute('data-hx-theme');
```

```js
  new MutationObserver(syncActive).observe(root, { attributes: true, attributeFilter: ['data-hx-theme'] });
```

Update the comment on lines 56-59 to name `data-hx-theme` rather than `data-theme`.

- [ ] **Step 8: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS, build succeeds.

- [ ] **Step 9: Verify no slug survives in `data-theme` anywhere in the output**

Run:
```bash
grep -o 'data-theme="[^"]*"' dist/index.html | sort -u
```
Expected: only `data-theme="dark"` (or `light`). Any slug here is a bug.

- [ ] **Step 10: Commit**

```bash
git add scripts/gen-themes.mjs src/styles/themes.generated.css src/components tests
git commit -m "refactor(theme): move the theme slug off data-theme so Starlight can use it"
```

---

## Task 2: Share the token layer with Starlight

**Files:**
- Create: `src/styles/hx-vars.css`
- Modify: `src/styles/tokens.css:1-15`
- Modify: `src/styles/starlight-custom.css:14-37`

**Interfaces:**
- Consumes: the `data-hx-theme` / `data-theme` contract from Task 1.
- Produces: `src/styles/hx-vars.css`, importable by any bundle, defining every `--hx-*` variable and nothing else.

**Why:** docs and marketing are currently two disjoint CSS worlds — the docs bundle has 320 `--sl-color-*` references and no `--hx-*`; the marketing bundle has 637 `--hx-*` and no `--sl-color-*`. The docs palette is hardcoded to the *old* marketing colours (`#0C0C0E` / `#161619` / `#2A2A2F`) which no longer match the shipped ground (`#19191C` / `#202023` / `#36363C`).

`tokens.css` cannot simply be imported into `starlight-custom.css`: it begins with `@import 'tailwindcss'`, and `starlight-custom.css` already imports Tailwind's theme and utilities layers alongside `@astrojs/starlight-tailwind`. Importing it twice would duplicate the whole framework into the docs bundle. Hence the variables-only split.

- [ ] **Step 1: Create `src/styles/hx-vars.css`**

Move the generated import and the `:root` fallback out of `tokens.css` verbatim:

```css
/* The --hx-* variable layer, and nothing else.
 *
 * Imported by BOTH bundles: tokens.css (marketing, which also pulls in Tailwind)
 * and starlight-custom.css (docs, which pulls in Tailwind separately via
 * @astrojs/starlight-tailwind). Keep this file free of @import 'tailwindcss'
 * or the framework lands in the docs bundle twice.
 */
@import './themes.generated.css';

/* Fallback so an unstyled root still renders: HelixScreen dark. */
:root {
  --hx-screen-bg: #19191C;  --hx-overlay-bg: #333338;
  --hx-card-bg: #202023;    --hx-elevated-bg: #4A4A52;
  --hx-border: #36363C;     --hx-text: #E8E8EC;
  --hx-text-muted: #B8B8C0; --hx-text-subtle: #787882;
  --hx-primary: #3A7CC8;    --hx-secondary: #6A9CC8;
  --hx-tertiary: #7C6CC8;   --hx-info: #3A7CC8;
  --hx-success: #5CB85C;    --hx-warning: #E8A83A;
  --hx-danger: #D94848;     --hx-focus: #3A7CC8;
  --hx-radius: 3px;         --hx-border-width: 1px;
}
```

- [ ] **Step 2: Point `tokens.css` at it**

Replace `tokens.css` lines 1-15 (the `@import './themes.generated.css';` line and the whole `:root` block) with:

```css
@import 'tailwindcss';
@import './hx-vars.css';
```

Everything from `@theme {` onward stays exactly as it is.

- [ ] **Step 3: Run the build and confirm the marketing page is unchanged**

Run: `npm run build && npm test`
Expected: PASS. This step is a pure refactor — the landing page must render identically.

- [ ] **Step 4: Commit the refactor on its own**

```bash
git add src/styles/hx-vars.css src/styles/tokens.css
git commit -m "refactor(styles): extract the --hx-* variable layer so both bundles can share it"
```

- [ ] **Step 5: Retokenise `starlight-custom.css`**

Replace lines 14-37 (the comment plus the whole hardcoded `:root` block) with the mapping below. Keep lines 1-13 (the layer statement, the Tailwind imports and the font imports) untouched, and add the `hx-vars` import directly after line 12.

```css
@import './hx-vars.css';

/* Starlight's palette, expressed entirely in HelixScreen's tokens.
 *
 * These rules are deliberately UNLAYERED. Starlight declares its own palette
 * inside @layer starlight.base, and unlayered styles outrank every layered
 * style regardless of specificity — which is why a plain :root here beats
 * Starlight's :root[data-theme='light']. One mapping covers both modes,
 * because the --hx-* values themselves change with the mode.
 */
:root {
  --sl-color-accent-low: var(--hx-overlay-bg);
  --sl-color-accent: var(--hx-primary);
  --sl-color-accent-high: var(--hx-secondary);

  /* Starlight's white/black are semantic, not literal: they flip with mode. */
  --sl-color-white: var(--hx-text);
  --sl-color-black: var(--hx-screen-bg);

  --sl-color-gray-1: var(--hx-text);
  --sl-color-gray-2: var(--hx-text-muted);
  --sl-color-gray-3: var(--hx-text-subtle);
  --sl-color-gray-4: var(--hx-border);
  --sl-color-gray-5: var(--hx-border);
  --sl-color-gray-6: var(--hx-card-bg);
  --sl-color-gray-7: var(--hx-overlay-bg);

  --sl-color-text: var(--hx-text);
  --sl-color-text-accent: var(--hx-primary);
  --sl-color-text-invert: var(--hx-screen-bg);

  --sl-color-bg: var(--hx-screen-bg);
  --sl-color-bg-nav: var(--hx-card-bg);
  --sl-color-bg-sidebar: var(--hx-card-bg);
  --sl-color-bg-inline-code: var(--hx-overlay-bg);
  --sl-color-bg-accent: var(--hx-primary);

  --sl-color-hairline: var(--hx-border);
  --sl-color-hairline-light: var(--hx-border);
  --sl-color-hairline-shade: var(--hx-border);
  --sl-color-backdrop-overlay: var(--hx-overlay-bg);

  /* Aside families. The -low variants tint the ground rather than paint it,
   * so an aside reads as itself in both light and dark without a second table. */
  --sl-color-blue: var(--hx-info);
  --sl-color-blue-high: var(--hx-info);
  --sl-color-blue-low: color-mix(in srgb, var(--hx-info) 15%, var(--hx-screen-bg));
  --sl-color-green: var(--hx-success);
  --sl-color-green-high: var(--hx-success);
  --sl-color-green-low: color-mix(in srgb, var(--hx-success) 15%, var(--hx-screen-bg));
  --sl-color-orange: var(--hx-warning);
  --sl-color-orange-high: var(--hx-warning);
  --sl-color-orange-low: color-mix(in srgb, var(--hx-warning) 15%, var(--hx-screen-bg));
  --sl-color-purple: var(--hx-tertiary);
  --sl-color-purple-high: var(--hx-tertiary);
  --sl-color-purple-low: color-mix(in srgb, var(--hx-tertiary) 15%, var(--hx-screen-bg));
  --sl-color-red: var(--hx-danger);
  --sl-color-red-high: var(--hx-danger);
  --sl-color-red-low: color-mix(in srgb, var(--hx-danger) 15%, var(--hx-screen-bg));

  /* Fonts */
  --sl-font: 'IBM Plex Sans', system-ui, sans-serif;
  --sl-font-system: 'IBM Plex Sans', system-ui, sans-serif;
  --sl-font-system-mono: 'IBM Plex Mono', monospace;

  --__sl-font-heading: 'Source Serif 4', Charter, Georgia, serif;
}

/* The app's theme schema sets shadow_intensity to 0. Starlight ships shadows on
 * its search dialog and dropdowns; the docs obey the same rule as everything else. */
* { box-shadow: none !important; text-shadow: none !important; }
```

Leave the existing heading-font rule and the `body` font-smoothing rule at the end of the file as they are.

- [ ] **Step 6: Verify no colour literal survives**

Run:
```bash
grep -nE '#[0-9A-Fa-f]{3,8}\b' src/styles/starlight-custom.css
```
Expected: no output. Every colour in that file must now be a `var()`.

- [ ] **Step 7: Build and confirm the docs bundle learned the tokens**

Run:
```bash
npm run build
DOCS_CSS=$(grep -o '/_astro/[^"]*\.css' dist/guide/index.html | tail -1)
echo "bundle: $DOCS_CSS"
grep -c -- '--hx-' "dist${DOCS_CSS}"
```
Expected: a count in the hundreds, not the 4 incidental hits it had before.

- [ ] **Step 8: Commit**

```bash
git add src/styles/starlight-custom.css
git commit -m "feat(docs): drive Starlight's palette from the HelixScreen theme tokens"
```

---

## Task 3: Give docs pages the switcher

**Files:**
- Create: `src/components/DocsThemeProvider.astro`
- Modify: `src/components/ThemeSwitcher.astro` (styling only)
- Modify: `astro.config.mjs:16-19`
- Delete: `src/components/ForceDarkTheme.astro`, `src/components/EmptyComponent.astro`

**Interfaces:**
- Consumes: `ThemeScript.astro` and the attribute contract from Task 1; the `--hx-*` variables reaching docs from Task 2.
- Produces: a themed docs page. No later task depends on its internals.

**Why:** `ForceDarkTheme.astro` hardcodes `dataset.theme = 'dark'` on every docs page and `EmptyComponent.astro` blanks the theme control, so a reader's choice is discarded at the `/docs/` boundary.

- [ ] **Step 1: Make `ThemeSwitcher` self-contained**

It currently styles itself with Tailwind utilities (`border-hairline`, `text-ink-muted`, `rounded-[var(--hx-radius)]`) that resolve from the `@theme` block in `tokens.css`. That block is **not** in the docs bundle, so those utilities would silently produce nothing there. Replace the markup's classes with a scoped `<style>` so the component works in either bundle.

Replace lines 4-22 of `src/components/ThemeSwitcher.astro`:

```astro
<div class="hx-switcher">
  <label class="hx-sr-only" for="hx-theme-select">Theme</label>
  <select id="hx-theme-select">
    {themes.map((t) => (
      <option value={t.slug} data-modes={t.modes.join(',')}>{t.name}</option>
    ))}
  </select>
  <button id="hx-mode-toggle" type="button" aria-label="Toggle light and dark mode">
    <span id="hx-mode-label">dark</span>
  </button>
</div>

<style>
  /* Self-contained on purpose: this component renders in both the marketing
   * bundle and the Starlight docs bundle, which do not share Tailwind utilities. */
  .hx-switcher {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.75rem;
  }
  .hx-switcher select,
  .hx-switcher button {
    background: transparent;
    color: var(--hx-text-muted);
    border: var(--hx-border-width) solid var(--hx-border);
    border-radius: var(--hx-radius);
    padding: 0.25rem 0.5rem;
    font: inherit;
    cursor: pointer;
  }
  .hx-switcher button[disabled] { cursor: default; opacity: 0.4; }
  .hx-sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
</style>
```

In the script, `toggle.style.opacity` is now handled by the `[disabled]` rule — delete line 43 (`toggle.style.opacity = ...`) and keep `toggle.disabled = modes.length === 1;`.

- [ ] **Step 2: Create `src/components/DocsThemeProvider.astro`**

```astro
---
// Starlight's ThemeProvider slot. Renders inside <head>, before first paint.
// Reuses the marketing no-flash script verbatim so the two surfaces can never
// disagree about how a stored theme resolves.
import ThemeScript from './ThemeScript.astro';
---
<script is:inline>
  // Starlight calls this after its own theme changes. Our switcher owns the
  // control, so there is nothing to sync, but the symbol must exist.
  window.StarlightThemeProvider = { updatePickers() {} };
</script>
<ThemeScript />
```

- [ ] **Step 3: Swap the Starlight component overrides**

`astro.config.mjs` lines 16-19 become:

```js
      components: {
        ThemeProvider: './src/components/DocsThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSwitcher.astro',
      },
```

- [ ] **Step 4: Delete the two components they replaced**

```bash
git rm src/components/ForceDarkTheme.astro src/components/EmptyComponent.astro
```

- [ ] **Step 5: Build and verify a docs page carries the theme machinery**

Run:
```bash
npm run build
grep -c 'hx-theme' dist/guide/index.html
grep -o 'id="hx-theme-select"' dist/guide/index.html
```
Expected: a non-zero count for the first (the inline script reads `localStorage.getItem('hx-theme')`), and one match for the second (the switcher rendered into Starlight's header).

- [ ] **Step 6: Verify the old forced-dark script is gone**

Run: `grep -c "dataset.theme = 'dark'" dist/guide/index.html || true`
Expected: `0`.

- [ ] **Step 7: Add a regression test for docs theme reach**

Append to `tests/no-tells.test.mjs`:

```js
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
  assert.match(html, /id="hx-theme-select"/);
});

test('the forced-dark override is gone from docs pages', () => {
  const html = readFileSync(DOCS_PAGE, 'utf8');
  assert.doesNotMatch(html, /dataset\.theme = 'dark'/);
});
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A src/components astro.config.mjs tests/no-tells.test.mjs
git commit -m "feat(docs): carry the reader's theme choice into the documentation"
```

---

# Phase 4 — New pages

## Task 4: Generate the printer index data

**Files:**
- Create: `scripts/gen-printers.mjs`
- Create: `tests/gen-printers.test.mjs`
- Create (generated, committed): `src/data/printers.generated.json`
- Modify: `package.json` (`prebuild`, and a `gen-printers` script)

**Interfaces:**
- Produces: `buildPrinters(dbPath)` returning
  `{ count: number, manufacturers: [{name, count}], printers: [{id, name, manufacturer, aliases, notes}] }`.
  Tasks 5 and 8 import `src/data/printers.generated.json` and read `count` and `printers`.
- Consumes: `../helixscreen/assets/config/printer_database.json`.

**Ground truth:** the database holds 96 entries. Five carry `show_in_list: false` — they are heuristic-only mod detectors (`kamp_user`, `klippain_shaketune`, `ercf_mmu`, `klicky_probe`, `ellis_print_tuning`), not printers. **91 are real models across 25 manufacturers.** `id`, `name`, `manufacturer` and `image` are present on all entries; everything else is optional.

- [ ] **Step 1: Write the failing test**

Create `tests/gen-printers.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPrinters } from '../scripts/gen-printers.mjs';

function fixture(printers) {
  const dir = mkdtempSync(join(tmpdir(), 'hx-printers-'));
  const path = join(dir, 'printer_database.json');
  writeFileSync(path, JSON.stringify({ version: '2.0', printers }));
  return path;
}

const SAMPLE = [
  { id: 'voron_24', name: 'Voron 2.4', manufacturer: 'Voron' },
  { id: 'voron_0_1', name: 'Voron 0.2', manufacturer: 'Voron', aliases: ['Voron 0.1'] },
  { id: 'ad5m', name: 'FlashForge Adventurer 5M', manufacturer: 'FlashForge' },
  {
    id: 'qidi_plus4', name: 'QIDI Plus 4', manufacturer: 'Qidi',
    notes: 'Stock display is a TJC HMI on serial bus.',
    note: 'The load-cell fingerprint is smart_effector + hx711.',
  },
  { id: 'kamp_user', name: 'KAMP', manufacturer: 'Generic', show_in_list: false },
];

test('drops entries flagged show_in_list:false', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.equal(out.count, 4);
  assert.ok(!out.printers.some((p) => p.id === 'kamp_user'));
});

test('count always equals the number of printers emitted', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.equal(out.count, out.printers.length);
});

test('sorts by manufacturer then model so the page needs no sort of its own', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(
    out.printers.map((p) => p.name),
    ['FlashForge Adventurer 5M', 'QIDI Plus 4', 'Voron 0.2', 'Voron 2.4']
  );
});

test('counts manufacturers, largest first', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(out.manufacturers[0], { name: 'Voron', count: 2 });
  assert.equal(out.manufacturers.reduce((n, m) => n + m.count, 0), out.count);
});

// Ruling 4: `notes` is written for users; `note` is the detector author's
// reasoning and reads as leaked internals on a public page.
test('publishes notes and never publishes note', () => {
  const out = buildPrinters(fixture(SAMPLE));
  const qidi = out.printers.find((p) => p.id === 'qidi_plus4');
  assert.equal(qidi.notes, 'Stock display is a TJC HMI on serial bus.');
  assert.ok(!('note' in qidi));
  assert.ok(!JSON.stringify(out).includes('load-cell fingerprint'));
});

test('aliases default to an empty array rather than undefined', () => {
  const out = buildPrinters(fixture(SAMPLE));
  assert.deepEqual(out.printers.find((p) => p.id === 'voron_24').aliases, []);
  assert.deepEqual(out.printers.find((p) => p.id === 'voron_0_1').aliases, ['Voron 0.1']);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/gen-printers.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/gen-printers.mjs'`.

- [ ] **Step 3: Write the generator**

Create `scripts/gen-printers.mjs`:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Turn the app's printer detection database into page data.
 *
 * Entries flagged `show_in_list: false` are heuristic-only mod detectors
 * (KAMP, Shake&Tune, ERCF, Klicky, Ellis) rather than printers, and the app
 * hides them from its own picker for the same reason.
 */
export function buildPrinters(dbPath) {
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const listed = db.printers.filter((p) => p.show_in_list !== false);

  const printers = listed
    .map((p) => ({
      id: p.id,
      name: p.name,
      manufacturer: p.manufacturer,
      aliases: p.aliases ?? [],
      // `notes` is user-facing caveat text. `note` is the detector author's
      // rationale and stays private — see the plan's Ruling 4.
      notes: p.notes ?? null,
    }))
    .sort(
      (a, b) =>
        a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name)
    );

  const counts = new Map();
  for (const p of printers) {
    counts.set(p.manufacturer, (counts.get(p.manufacturer) ?? 0) + 1);
  }
  const manufacturers = [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { count: printers.length, manufacturers, printers };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dbPath = join(root, '..', 'helixscreen', 'assets', 'config', 'printer_database.json');
  let built;
  try {
    built = buildPrinters(dbPath);
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-printers] ${dbPath} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'printers.generated.json'),
    JSON.stringify(built, null, 2) + '\n'
  );
  console.log(`[gen-printers] wrote ${built.count} printers across ${built.manufacturers.length} manufacturers`);
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `node --test tests/gen-printers.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Generate against the real database**

Run: `node scripts/gen-printers.mjs`
Expected: `[gen-printers] wrote 91 printers across 25 manufacturers`

If the count is not 91, stop and report — the database changed and Ruling 2's framing needs re-checking.

- [ ] **Step 6: Wire it into the build**

In `package.json`, add the script and extend `prebuild`:

```json
    "gen-printers": "node scripts/gen-printers.mjs",
    "prebuild": "./scripts/sync-docs.sh && node scripts/gen-themes.mjs && node scripts/gen-printers.mjs",
```

- [ ] **Step 7: Verify graceful degradation**

Run:
```bash
node -e "
const {buildPrinters}=await import('./scripts/gen-printers.mjs');
try{buildPrinters('/nonexistent/db.json')}catch(e){console.log('throws as expected:',e.code)}
" --input-type=module
```
Expected: `throws as expected: ENOENT` — the CLI catches this and exits 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/gen-printers.mjs tests/gen-printers.test.mjs src/data/printers.generated.json package.json
git commit -m "feat(printers): generate a model index from the detection database"
```

---

## Task 5: The `/printers/` page

**Files:**
- Create: `src/pages/printers.astro`

**Interfaces:**
- Consumes: `src/data/printers.generated.json` from Task 4; `MarketingLayout`, `SiteNav`, `Colophon`.
- Produces: the route `/printers/`. Task 8 links to it.

**Framing (Ruling 2):** this page answers *"is my exact model in the database?"* It carries **no support status**. `Tested` / `Supported` / `Community` / `Preliminary` are curated per platform in the docs, and the page links there rather than restating them.

- [ ] **Step 1: Write the page**

Create `src/pages/printers.astro`:

```astro
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import SiteNav from '../components/marketing/SiteNav.astro';
import Colophon from '../components/marketing/Colophon.astro';
import db from '../data/printers.generated.json';

// One lowercase haystack per row so the filter is a substring test, not a
// per-keystroke walk over three fields and an array.
const rows = db.printers.map((p) => ({
  ...p,
  haystack: [p.name, p.manufacturer, ...p.aliases].join(' ').toLowerCase(),
}));
---
<MarketingLayout
  title="Supported printers — HelixScreen"
  description={`The ${db.count} printer models HelixScreen recognizes automatically, and what happens if yours is not one of them.`}
>
  <SiteNav />
  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <h1 class="text-3xl leading-tight mb-3">
      HelixScreen recognizes {db.count} printers without being told.
    </h1>
    <p class="ui text-sm text-ink-muted mb-3 max-w-[62ch]">
      The setup wizard fingerprints your machine over Moonraker and fills in its name, image,
      bed size, probe type and preset options. This is the whole list, generated from the same
      database the app ships.
    </p>
    <p class="ui text-sm text-ink-muted mb-8 max-w-[62ch]">
      If yours is not here it still works. Every control runs against any Klipper printer with
      Moonraker; a machine outside the database misses only the name, picture and presets.
      For what is verified on real hardware, see
      <a href="/guide/supported-printers/" class="text-secondary underline underline-offset-2">Supported Printers</a>
      and the <a href="/reference/faq/" class="text-secondary underline underline-offset-2">FAQ</a>.
    </p>

    <div class="flex items-baseline gap-3 mb-4">
      <label class="sr-only" for="printer-filter">Filter printers</label>
      <input
        id="printer-filter"
        type="search"
        placeholder="Filter by model or manufacturer"
        autocomplete="off"
        class="ui text-sm bg-transparent text-ink border border-hairline rounded-[var(--hx-radius)] px-3 py-2 w-full max-w-sm"
      />
      <p id="printer-count" class="ui text-xs text-ink-muted tabular shrink-0">
        {db.count} of {db.count}
      </p>
    </div>

    <table class="w-full border-t border-hairline">
      <caption class="sr-only">Printer models in the HelixScreen auto-detection database</caption>
      <thead>
        <tr class="ui text-xs text-ink-muted text-left">
          <th scope="col" class="font-normal py-2 pr-4">Model</th>
          <th scope="col" class="font-normal py-2 pr-4">Manufacturer</th>
          <th scope="col" class="font-normal py-2">Notes</th>
        </tr>
      </thead>
      <tbody id="printer-rows">
        {rows.map((p) => (
          <tr data-haystack={p.haystack} class="border-t border-hairline align-baseline">
            <td class="py-2 pr-4 text-sm text-ink">
              {p.name}
              {p.aliases.length > 0 && (
                <span class="ui text-xs text-ink-muted"> · also {p.aliases.join(', ')}</span>
              )}
            </td>
            <td class="py-2 pr-4 ui text-sm text-ink-muted">{p.manufacturer}</td>
            <td class="py-2 ui text-xs text-ink-muted max-w-[46ch]">{p.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <p id="printer-empty" class="ui text-sm text-ink-muted py-6 hidden">
      Nothing matches that. It will still run — see
      <a href="/installation/" class="text-secondary underline underline-offset-2">the install guide</a>.
    </p>
  </main>
  <Colophon />
</MarketingLayout>

<script>
  const input = document.getElementById('printer-filter');
  const count = document.getElementById('printer-count');
  const empty = document.getElementById('printer-empty');
  const rows = Array.from(document.querySelectorAll('#printer-rows tr'));
  const total = rows.length;

  function filter() {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const hit = q === '' || row.dataset.haystack.includes(q);
      row.hidden = !hit;
      if (hit) shown++;
    }
    count.textContent = `${shown} of ${total}`;
    empty.classList.toggle('hidden', shown > 0);
  }

  input.addEventListener('input', filter);
  // The input can hold a value across a soft reload; never trust it to be empty.
  filter();
</script>
```

- [ ] **Step 2: Build and confirm the route exists with every row**

Run:
```bash
npm run build
grep -c 'data-haystack' dist/printers/index.html
```
Expected: `91`.

- [ ] **Step 3: Confirm the page invents no support status**

Run:
```bash
grep -oE 'Tested|Preliminary|Community' dist/printers/index.html | sort -u
```
Expected: no output. Those words are the docs' vocabulary — this page must only link to them.

- [ ] **Step 4: Commit**

```bash
git add src/pages/printers.astro
git commit -m "feat(printers): add a searchable index of every recognized model"
```

---

## Task 6: Parse the changelog

**Files:**
- Create: `scripts/gen-whatsnew.mjs`
- Create: `tests/gen-whatsnew.test.mjs`
- Create (generated, committed): `src/data/whatsnew.generated.json`
- Modify: `package.json` (`prebuild`, and a `gen-whatsnew` script)

**Interfaces:**
- Produces: `parseChangelog(md)` → `[{version, date, withdrawn, summary}]`, and
  `buildWhatsNew(md, version, historyLimit)` →
  `{ version, featured: [{version, date, lead, bullets}], history: [{version, date, withdrawn}] }`.
  Task 7 imports `src/data/whatsnew.generated.json`.
- Consumes: `../helixscreen/CHANGELOG.md` and `../helixscreen/VERSION.txt`.

**Ground truth:** 203 release sections. Headings look like `## [0.99.115] - 2026-08-20`, sometimes suffixed `[WITHDRAWN]`. Two releases carry a `<!-- whatsnew ... -->` block: a lead line, a blank line, then `- ` bullets. See Ruling 3.

- [ ] **Step 1: Write the failing test**

Create `tests/gen-whatsnew.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog, buildWhatsNew } from '../scripts/gen-whatsnew.mjs';

const MD = `# Changelog

Preamble prose that is not a release.

## [0.99.115] - 2026-08-20

<!-- whatsnew
The second 1.0 release candidate. Highlights:

- Printers are no longer guessed at from thin evidence
- Buttons no longer send macros your printer does not have
-->

**This is the second 1.0 release candidate.**

### Added

- A thing.

## [0.99.110] - 2026-08-11 [WITHDRAWN]

### Fixed

- Something that turned out to be worse.

## [0.99.108] - 2026-08-09

### Fixed

- An ordinary fix with no summary block.

## [Unreleased]

- Not a release; has no date.
`;

test('reads every dated release heading', () => {
  const releases = parseChangelog(MD);
  assert.deepEqual(releases.map((r) => r.version), ['0.99.115', '0.99.110', '0.99.108']);
});

test('ignores headings with no date, such as Unreleased', () => {
  assert.ok(!parseChangelog(MD).some((r) => r.version === 'Unreleased'));
});

test('flags withdrawn releases', () => {
  const releases = parseChangelog(MD);
  assert.equal(releases.find((r) => r.version === '0.99.110').withdrawn, true);
  assert.equal(releases.find((r) => r.version === '0.99.115').withdrawn, false);
});

test('pulls the lead and the bullets out of a whatsnew block', () => {
  const r = parseChangelog(MD).find((x) => x.version === '0.99.115');
  assert.equal(r.summary.lead, 'The second 1.0 release candidate. Highlights:');
  assert.deepEqual(r.summary.bullets, [
    'Printers are no longer guessed at from thin evidence',
    'Buttons no longer send macros your printer does not have',
  ]);
});

test('a release without a whatsnew block has no summary', () => {
  assert.equal(parseChangelog(MD).find((r) => r.version === '0.99.108').summary, null);
});

test('features only summarised releases, and never a withdrawn one', () => {
  const out = buildWhatsNew(MD, '0.99.115');
  assert.deepEqual(out.featured.map((f) => f.version), ['0.99.115']);
});

test('history is capped and keeps withdrawn releases visible', () => {
  const out = buildWhatsNew(MD, '0.99.115', 2);
  assert.deepEqual(out.history.map((h) => h.version), ['0.99.115', '0.99.110']);
  assert.equal(out.history[1].withdrawn, true);
});

test('a changelog with no whatsnew block yields no featured entries, not a crash', () => {
  const out = buildWhatsNew('# Changelog\n\n## [1.0.0] - 2026-09-01\n\n### Added\n\n- Everything.\n', '1.0.0');
  assert.deepEqual(out.featured, []);
  assert.equal(out.history.length, 1);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/gen-whatsnew.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the parser**

Create `scripts/gen-whatsnew.mjs`:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read release sections out of a Keep-a-Changelog file.
 *
 * A heading looks like `## [0.99.115] - 2026-08-20`, optionally suffixed
 * `[WITHDRAWN]`. Headings without a date (`## [Unreleased]`) are not releases
 * and are dropped.
 */
export function parseChangelog(md) {
  return md
    .split(/^## \[/m)
    .slice(1)
    .map((raw) => {
      const nl = raw.indexOf('\n');
      const head = nl === -1 ? raw : raw.slice(0, nl);
      const body = nl === -1 ? '' : raw.slice(nl + 1);

      const heading = head.match(/^([^\]]+)\]\s*-\s*(\S+)(.*)$/);
      if (!heading) return null;
      const [, version, date, rest] = heading;

      const block = body.match(/<!--\s*whatsnew\s*([\s\S]*?)-->/);
      let summary = null;
      if (block) {
        const lines = block[1].split('\n').map((l) => l.trim()).filter(Boolean);
        summary = {
          lead: lines.find((l) => !l.startsWith('- ')) ?? null,
          bullets: lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()),
        };
      }

      return { version, date, withdrawn: /WITHDRAWN/i.test(rest), summary };
    })
    .filter(Boolean);
}

export function buildWhatsNew(md, version, historyLimit = 12) {
  const releases = parseChangelog(md);
  return {
    version,
    // A withdrawn release is one we asked people not to run. It keeps its row in
    // the history so the record stays honest, but it is never featured.
    featured: releases
      .filter((r) => r.summary && !r.withdrawn)
      .map((r) => ({
        version: r.version,
        date: r.date,
        lead: r.summary.lead,
        bullets: r.summary.bullets,
      })),
    history: releases.slice(0, historyLimit).map((r) => ({
      version: r.version,
      date: r.date,
      withdrawn: r.withdrawn,
    })),
  };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = join(root, '..', 'helixscreen');
  let built;
  try {
    built = buildWhatsNew(
      readFileSync(join(src, 'CHANGELOG.md'), 'utf8'),
      readFileSync(join(src, 'VERSION.txt'), 'utf8').trim()
    );
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-whatsnew] ${src} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'whatsnew.generated.json'),
    JSON.stringify(built, null, 2) + '\n'
  );
  console.log(`[gen-whatsnew] version ${built.version}, ${built.featured.length} featured, ${built.history.length} in history`);
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/gen-whatsnew.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Generate against the real changelog**

Run: `node scripts/gen-whatsnew.mjs`
Expected: `[gen-whatsnew] version 0.99.115, 2 featured, 12 in history`

- [ ] **Step 6: Wire it into the build**

```json
    "gen-whatsnew": "node scripts/gen-whatsnew.mjs",
    "prebuild": "./scripts/sync-docs.sh && node scripts/gen-themes.mjs && node scripts/gen-printers.mjs && node scripts/gen-whatsnew.mjs",
```

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-whatsnew.mjs tests/gen-whatsnew.test.mjs src/data/whatsnew.generated.json package.json
git commit -m "feat(whats-new): parse release summaries out of the changelog"
```

---

## Task 7: The `/whats-new/` page

**Files:**
- Create: `src/pages/whats-new.astro`

**Interfaces:**
- Consumes: `src/data/whatsnew.generated.json` from Task 6.
- Produces: the route `/whats-new/`. Task 8 links to it.

- [ ] **Step 1: Write the page**

Create `src/pages/whats-new.astro`:

```astro
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import SiteNav from '../components/marketing/SiteNav.astro';
import Colophon from '../components/marketing/Colophon.astro';
import data from '../data/whatsnew.generated.json';

const CHANGELOG = 'https://github.com/prestonbrown/helixscreen/blob/main/CHANGELOG.md';
---
<MarketingLayout
  title="What's new — HelixScreen"
  description="Release notes for HelixScreen, written before each release ships."
>
  <SiteNav />
  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <h1 class="text-3xl leading-tight mb-3">Every release is written down before it ships.</h1>
    <p class="ui text-sm text-ink-muted mb-12 max-w-[62ch]">
      The current build is
      <span class="font-mono tabular text-ink">{data.version}</span>.
      What follows is the short version of the recent ones. The
      <a href={CHANGELOG} target="_blank" rel="noopener noreferrer" class="text-secondary underline underline-offset-2">full changelog</a>
      has every fix in every release.
    </p>

    {data.featured.map((r) => (
      <article class="border-t border-hairline py-8">
        <div class="flex items-baseline gap-3 mb-3">
          <h2 class="font-mono tabular text-lg text-ink">{r.version}</h2>
          <p class="ui text-xs text-ink-muted tabular">{r.date}</p>
        </div>
        {r.lead && <p class="text-base text-ink mb-4 max-w-[62ch]">{r.lead}</p>}
        <ul class="max-w-[62ch]">
          {r.bullets.map((b) => (
            <li class="ui text-sm text-ink-muted py-1.5 border-b border-hairline last:border-b-0">{b}</li>
          ))}
        </ul>
      </article>
    ))}

    <section class="border-t border-hairline pt-8 mt-8">
      <h2 class="text-xl mb-4">Recent releases</h2>
      <table class="w-full max-w-lg">
        <caption class="sr-only">The most recent HelixScreen releases</caption>
        <tbody>
          {data.history.map((h) => (
            <tr class="border-b border-hairline">
              <td class="font-mono tabular text-sm text-ink py-2">{h.version}</td>
              <td class="ui text-xs text-ink-muted tabular py-2">{h.date}</td>
              <td class="ui text-xs py-2 text-right">
                {h.withdrawn && <span class="text-alert">withdrawn</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="ui text-xs text-ink-muted mt-4 max-w-[62ch]">
        A withdrawn release is one that shipped and was pulled. It stays on the list because
        deleting it would not make it not have happened.
      </p>
    </section>
  </main>
  <Colophon />
</MarketingLayout>
```

- [ ] **Step 2: Build and check the page**

Run:
```bash
npm run build
grep -c 'withdrawn' dist/whats-new/index.html
```
Expected: at least `3` (the two withdrawn rows in the current history window plus the explanatory note).

- [ ] **Step 3: Commit**

```bash
git add src/pages/whats-new.astro
git commit -m "feat(whats-new): add release notes generated from the changelog"
```

---

## Task 8: `/contact/`, and wire the new routes in

**Files:**
- Create: `src/pages/contact.astro`
- Modify: `src/components/marketing/GetInTouch.astro:41-42`
- Modify: `src/components/marketing/SiteNav.astro:16-19,63-66`
- Modify: `src/components/marketing/PlatformTable.astro:11-21`
- Modify: `src/components/marketing/Hero.astro:6-10`

**Interfaces:**
- Consumes: the routes from Tasks 5 and 7; `printers.generated.json` from Task 4.
- Produces: `/contact/`, and navigation reaching all three new routes.

**Note:** the nav currently points at `#printers` and `#touch`. Those are fragments — they resolve on the landing page and go nowhere on any other page. Both nav lists must move to real routes.

- [ ] **Step 1: Let `GetInTouch` render as a standalone page**

Add a prop so the same routing table can carry an `h1` on `/contact/` and an `h2` on the landing page. Replace the frontmatter's closing `---` and lines 41-46 with:

```astro
interface Props {
  /** `h1` on the standalone /contact/ page, `h2` as a landing-page section. */
  headingLevel?: 'h1' | 'h2';
}
const { headingLevel = 'h2' } = Astro.props;
const Heading = headingLevel;
---
<section id="touch" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-hairline">
  <Heading class="text-3xl leading-tight mb-3">Tell me what it's missing.</Heading>
  <p class="ui text-sm text-ink-muted mb-8 max-w-[62ch]">
    Most of what HelixScreen does now exists because somebody asked for it. Pick whichever
    of these fits — they all reach me.
  </p>
```

The `routes` array and everything from line 47 down stay exactly as they are.

- [ ] **Step 2: Create `src/pages/contact.astro`**

```astro
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import SiteNav from '../components/marketing/SiteNav.astro';
import GetInTouch from '../components/marketing/GetInTouch.astro';
import Colophon from '../components/marketing/Colophon.astro';
---
<MarketingLayout
  title="Contact — HelixScreen"
  description="How to report a bug, ask for a feature, get a question answered, or reach the author of HelixScreen."
>
  <SiteNav />
  <main>
    <GetInTouch headingLevel="h1" />
  </main>
  <Colophon />
</MarketingLayout>
```

- [ ] **Step 3: Point both nav lists at real routes**

Desktop nav, `SiteNav.astro` lines 16-19:

```astro
      <a href="/installation/" class="hover:text-ink">Install</a>
      <a href="/guide/getting-started/" class="hover:text-ink">Docs</a>
      <a href="/printers/" class="hover:text-ink">Printers</a>
      <a href="/whats-new/" class="hover:text-ink">What's new</a>
      <a href="/contact/" class="hover:text-ink">Contact</a>
```

Mobile menu, lines 63-66:

```astro
      <a href="/installation/" class="text-ink-muted hover:text-ink transition-colors py-2">Install</a>
      <a href="/guide/getting-started/" class="text-ink-muted hover:text-ink transition-colors py-2">Docs</a>
      <a href="/printers/" class="text-ink-muted hover:text-ink transition-colors py-2">Printers</a>
      <a href="/whats-new/" class="text-ink-muted hover:text-ink transition-colors py-2">What's new</a>
      <a href="/contact/" class="text-ink-muted hover:text-ink transition-colors py-2">Contact</a>
```

- [ ] **Step 4: Derive the printer count instead of asserting `80+`**

`PlatformTable.astro` — add the import to the frontmatter:

```js
import printers from '../../data/printers.generated.json';
```

and replace lines 12-21 of the markup:

```astro
  <h2 class="text-2xl mb-2">It probably already knows your printer.</h2>
  <p class="ui text-sm text-ink-muted mb-3 max-w-[62ch]">
    {printers.count} models in the auto-detection database, spanning Voron, Creality, QIDI,
    Anycubic, FlashForge, Sovol, RatRig, FLSUN, Elegoo, Prusa and Snapmaker. Anything running
    Klipper and Moonraker works even if it is not in the list — the wizard discovers
    what your machine can do.
  </p>
  <p class="ui text-xs text-ink-muted mb-6 max-w-[62ch]">
    800×480 and 1024×600 are the best-tested landscape sizes; 480×320 runs but is tight.
    <a href="/printers/" class="text-secondary underline underline-offset-2">See the whole list</a>.
  </p>
```

`Hero.astro` — add the same import and replace the third rail entry (line 9):

```js
  { value: String(printers.count), label: 'printers it recognizes without being told' },
```

- [ ] **Step 5: Build and verify no `80+` survives**

Run:
```bash
npm run build
grep -o '80+' dist/index.html || echo "clean"
```
Expected: `clean`.

- [ ] **Step 6: Verify every nav link resolves to a built page**

Run:
```bash
for r in installation guide/getting-started printers whats-new contact; do
  [ -f "dist/$r/index.html" ] && echo "ok   /$r/" || echo "DEAD /$r/"
done
```
Expected: five `ok` lines, no `DEAD`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/contact.astro src/components/marketing
git commit -m "feat(site): add /contact/ and route the nav through the new pages"
```

---

## Task 9: Widen the verification gate

**Files:**
- Modify: `tests/no-tells.test.mjs`

**Interfaces:**
- Consumes: every route built by Tasks 5, 7 and 8.
- Produces: nothing downstream. This is the phase's gate.

**Why:** the gate's own header says its landing-page-only scope was a phase-2 decision — *"widening this gate to dist/ belongs in that phase, not this one."* This is that phase. Three new authored pages exist and none of them are currently checked for banned copy, deleted classes, or Space Grotesk.

The gate widens to the pages **we author**, and no further. Doc pages stay out: their prose is written in the helixscreen repo and is not ours to gate. Vendor CSS from Starlight and Pagefind stays out for the same reason it always was — it ships shadows and 8px radii this project does not control.

- [ ] **Step 1: Replace the single landing-page constant with the authored set**

Replace `const LANDING = join('dist', 'index.html');` with:

```js
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
```

Update the file's header comment: it still claims the gate reads only the landing page.

- [ ] **Step 2: Add the guard that stops a page silently escaping the gate**

`readAuthoredPages` filters to files that exist, so a typo in a path would quietly gate nothing. Assert the set is whole:

```js
test('every authored page is present to be gated', () => {
  const missing = AUTHORED_PAGES.filter((p) => !existsSync(p));
  assert.deepEqual(missing, [], `built pages missing from dist/: ${missing.join(', ')}`);
});
```

- [ ] **Step 3: Loop the page-scoped assertions over the set**

Three tests currently read `LANDING` directly. Rewrite each to iterate, reporting which page failed:

```js
test('banned copy does not appear on any authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    for (const phrase of BANNED_COPY) {
      assert.ok(!text.includes(phrase), `${path} contains banned copy: "${phrase}"`);
    }
  }
});

test('deleted decorative classes do not reappear on any authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    for (const cls of DELETED_CLASSES) {
      assert.ok(!html.includes(cls), `${path} reintroduces .${cls}`);
    }
  }
});

test('Space Grotesk is gone from every authored page', () => {
  for (const [path, html] of readAuthoredPages()) {
    assert.doesNotMatch(html, /space.?grotesk/i, `${path} still loads Space Grotesk`);
  }
});
```

Keep the existing gradient check reading `LANDING` **and** extend it the same way. Keep the headline-count test on `LANDING` alone — the hero headline belongs to the landing page and appearing elsewhere would be the bug.

- [ ] **Step 4: Run the suite and expect real failures**

Run: `npm test`
Expected: PASS. If a new page trips the copy gate, the copy is wrong — fix the page, never the gate.

- [ ] **Step 5: Verify the gate actually covers the new pages**

Temporarily append `<p>seamless</p>` to `src/pages/contact.astro`'s `<main>`, rebuild, and run `npm test`.
Expected: FAIL naming `dist/contact/index.html`. **Revert the edit** and re-run to confirm PASS.

A gate that cannot be made to fail on demand is not a gate. Do not skip this step.

- [ ] **Step 6: Confirm the whole build is clean end to end**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/no-tells.test.mjs
git commit -m "test: gate every authored page, not only the landing page"
```

---

## Self-Review

**Spec coverage.** Phase 3 of the spec's delivery order asks for Starlight retokenised (Task 2), `ForceDarkTheme.astro` removed (Task 3), and the switcher in the `ThemeSelect` slot (Task 3). Task 1 is not in the spec — it is forced by the `data-theme` collision the spec did not know about, and Ruling 1 records why. Phase 4 asks for `/printers/` (Tasks 4-5), `/whats-new/` (Tasks 6-7) and `/contact/` (Task 8). The spec's "Verification" section asks the banned-construction grep to cover the built output; Task 9 widens it as far as authored pages, and says why doc pages and vendor CSS stay out.

**Deviations, all recorded above:** `/printers/` is an index rather than a compatibility table (Ruling 2, because the docs now own support status); `/whats-new/` features two curated blocks plus a history table rather than 203 sections (Ruling 3); the printer `note` field is not published (Ruling 4).

**Type consistency.** `buildPrinters` returns `{count, manufacturers, printers}` and Tasks 5 and 8 read `db.count` / `db.printers` / `p.aliases` / `p.notes`. `buildWhatsNew` returns `{version, featured, history}` and Task 7 reads `data.version` / `data.featured[].lead` / `.bullets` / `data.history[].withdrawn`. The attribute contract from Task 1 — `data-hx-theme` for the slug, `data-theme` for the mode — is consumed by Tasks 2 and 3 and by no other task.

**Ordering.** Task 1 must land before Task 2, which must land before Task 3. Task 4 must land before Tasks 5 and 8. Task 6 must land before Task 7. Task 9 is last because it asserts on every page the earlier tasks build. Phase 3 and Phase 4 are otherwise independent and either could ship alone.

**Known risk.** `color-mix()` in Task 2 is Baseline-2023 and has no fallback here; a browser without it drops the aside tint to transparent, leaving the coloured border and icon to carry the aside. That degradation is acceptable and deliberate.
