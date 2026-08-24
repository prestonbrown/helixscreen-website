# helixscreen.org Rework — Implementation Plan (Phases 1–2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild helixscreen.org's landing page on a design system generated from HelixScreen's own theme files, so the site stops reading as machine-generated and ships before 1.0.

**Architecture:** A build step reads the 18 theme JSON files from the helixscreen repo and emits CSS custom-property blocks plus a manifest. A token layer maps those to semantic site variables and hard-codes the structural rules the app's own theme schema mandates — 1px borders, 3px radius, zero shadow. The landing page is rebuilt from eleven sections deliberately varied in shape, replacing eight identical alternating blocks. A header control switches themes at runtime and persists the choice.

**Tech Stack:** Astro 5.17, Tailwind CSS v4, Node 20 `node:test` (no new test dependency), Source Serif 4 + IBM Plex Sans/Mono via fontsource.

**Spec:** `docs/superpowers/specs/2026-08-24-website-rework-design.md`

**Scope:** Phases 1–2 of the spec's Delivery Order. Phase 3 (docs chrome) and phase 4 (`/printers/`, `/whats-new/`, `/contact/`) get their own plans.

## Global Constraints

- **No shadows and no glows, anywhere.** `shadow_intensity` is 0 in every shipped theme.
- **Borders are 1px. Radius is 3px.** Nothing rounder, from `border_width` / `border_radius_size`.
- **Default theme is `helixscreen`, mode `dark`** — matches `include/theme_loader.h:22`.
- **Authoritative theme count is 18.** Never hardcode it; derive from the generated manifest.
- **Type:** Source Serif 4 for prose and display, IBM Plex Sans for UI chrome and labels, IBM Plex Mono for anything measurable. Space Grotesk is removed entirely.
- **Numbers use `font-variant-numeric: tabular-nums`** wherever they can be compared.
- **Copy rules (binding):** no setup-payoff headlines; no lists of three; no em-dash adjective pileups; every headline a complete sentence. Banned strings: `beautiful, customizable, community-driven`, `built by makers, for makers`, `your printer deserves`, `mastered`, `seamless`, `effortless`, `unleash`.
- **The author appears in sublines, captions, margins and the colophon — never in an `h1`.**
- **Headline is fixed:** "Everything your printer knows, on the screen it already has."
- **Deleted CSS classes must not reappear:** `gradient-text`, `mesh-bg`, `mesh-drift`, `hero-gradient`, `screenshot-glow`, `scroll-indicator`, `fade-bounce`.
- **Sibling repo path:** `../helixscreen`. CI provides it via the symlink at `.github/workflows/deploy.yml:61`.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `scripts/gen-themes.mjs` | Pure functions + CLI that turn theme JSON into CSS and a manifest |
| `src/styles/themes.generated.css` | Generated, committed. One block per theme per mode |
| `src/data/themes.generated.json` | Generated, committed. `[{slug,name,modes}]` — the count source |
| `src/styles/tokens.css` | Semantic token layer, structural rules, base element styles |
| `src/components/ThemeScript.astro` | Inline no-flash script, must be in `<head>` |
| `src/components/ThemeSwitcher.astro` | The header control |
| `src/components/marketing/SpecGrid.astro` | Four-across hairline spec grid |
| `src/components/marketing/MarginRail.astro` | Left rail carrying figures |
| `src/components/marketing/Figure.astro` | Screenshot on a card plinth, optional annotation |
| `src/components/marketing/ComparisonTable.astro` | Against KlipperScreen and GuppyScreen |
| `src/components/marketing/CapabilityGrid.astro` | Six dense cells |
| `src/components/marketing/Spotlight.astro` | Full-width multi-material section |
| `src/components/marketing/PlatformTable.astro` | Printers and platforms |
| `src/components/marketing/ThemeDemo.astro` | Recolours the page you're on |
| `src/components/marketing/GetInTouch.astro` | Routed by intent |
| `src/components/marketing/Colophon.astro` | Quiet signed footer |
| `tests/gen-themes.test.mjs` | Unit tests for the generator |
| `tests/no-tells.test.mjs` | Greps `dist/` for banned CSS and copy |

**Modified**

| Path | Change |
|---|---|
| `package.json` | Add `@fontsource/source-serif-4`, drop `@fontsource/space-grotesk`, add `gen-themes` to `prebuild`, add `test` |
| `src/layouts/MarketingLayout.astro` | Token layer, theme script, drop blanket scroll animation |
| `src/components/marketing/SiteNav.astro` | Rebuilt with theme switcher and version |
| `src/components/marketing/Hero.astro` | Rebuilt: rail + headline + spec grid + install |
| `src/pages/index.astro` | Reassembled from the eleven sections |
| `src/styles/marketing.css` | Strip the decorative classes |

**Deleted**

`src/components/marketing/ProductReveal.astro`, `FeatureStory.astro`, `StatsStrip.astro`, `ThemeStrip.astro`, `WhySwitch.astro`, `PrinterConstellation.astro`, `VisualComparison.astro`, `Community.astro`, `Footer.astro`, `InstallBlock.astro`.

---

## Task 1: Theme generation pipeline

**Files:**
- Create: `scripts/gen-themes.mjs`
- Create: `tests/gen-themes.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `PALETTE_KEYS: string[]` (16 entries), `cssVarName(key: string) => string`, `themeBlocks(slug: string, theme: object) => string`, `buildAll(themesDir: string) => {css: string, manifest: Array<{slug: string, name: string, modes: string[]}>}`. Task 2 consumes the CSS variable names; Task 4 consumes the manifest shape.

- [ ] **Step 1: Write the failing test**

Create `tests/gen-themes.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_KEYS, cssVarName, themeBlocks } from '../scripts/gen-themes.mjs';

const DUAL = {
  name: 'Gruvbox',
  dark: { screen_bg: '#282828', overlay_bg: '#3C3836', card_bg: '#504945',
    elevated_bg: '#665C54', border: '#7C6F64', text: '#EBDBB2',
    text_muted: '#D5C4A1', text_subtle: '#928374', primary: '#83A598',
    secondary: '#D3869B', tertiary: '#8EC07C', info: '#83A598',
    success: '#B8BB26', warning: '#FABD2F', danger: '#FB4934', focus: '#83A598' },
  light: { screen_bg: '#FBF1C7', overlay_bg: '#EBDBB2', card_bg: '#D5C4A1',
    elevated_bg: '#BDAE93', border: '#A89984', text: '#3C3836',
    text_muted: '#504945', text_subtle: '#665C54', primary: '#458588',
    secondary: '#B16286', tertiary: '#689D6A', info: '#458588',
    success: '#79740E', warning: '#B57614', danger: '#CC241D', focus: '#458588' },
  border_radius_size: 3, border_width: 1, shadow_intensity: 0,
};

const DARK_ONLY = { name: 'Dracula', dark: DUAL.dark, border_radius_size: 3, border_width: 1 };

test('exposes exactly the 16 palette keys the app defines', () => {
  assert.equal(PALETTE_KEYS.length, 16);
  assert.ok(PALETTE_KEYS.includes('screen_bg'));
  assert.ok(PALETTE_KEYS.includes('focus'));
});

test('converts snake_case keys to prefixed kebab-case custom properties', () => {
  assert.equal(cssVarName('screen_bg'), '--hx-screen-bg');
  assert.equal(cssVarName('text_muted'), '--hx-text-muted');
});

test('emits one selector block per supported mode', () => {
  const css = themeBlocks('gruvbox', DUAL);
  assert.match(css, /\[data-theme="gruvbox"\]\[data-mode="dark"\]/);
  assert.match(css, /\[data-theme="gruvbox"\]\[data-mode="light"\]/);
});

test('emits every palette key in each block', () => {
  const css = themeBlocks('gruvbox', DUAL);
  for (const key of PALETTE_KEYS) {
    assert.ok(css.includes(cssVarName(key)), `missing ${key}`);
  }
});

test('a dark-only theme emits no light block', () => {
  const css = themeBlocks('dracula', DARK_ONLY);
  assert.match(css, /\[data-mode="dark"\]/);
  assert.doesNotMatch(css, /\[data-mode="light"\]/);
});

test('emits structural rules and never a shadow', () => {
  const css = themeBlocks('gruvbox', DUAL);
  assert.match(css, /--hx-radius:\s*3px/);
  assert.match(css, /--hx-border-width:\s*1px/);
  assert.doesNotMatch(css, /shadow/i);
});

test('defaults structural values when a theme omits them', () => {
  const css = themeBlocks('bare', { name: 'Bare', dark: DUAL.dark });
  assert.match(css, /--hx-radius:\s*3px/);
  assert.match(css, /--hx-border-width:\s*1px/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gen-themes.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/gen-themes.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/gen-themes.mjs`:

```js
#!/usr/bin/env node
// Generates CSS custom-property blocks and a manifest from HelixScreen's own
// theme files, so the website renders in the same palettes the app ships.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PALETTE_KEYS = [
  'screen_bg', 'overlay_bg', 'card_bg', 'elevated_bg',
  'border', 'text', 'text_muted', 'text_subtle',
  'primary', 'secondary', 'tertiary', 'info',
  'success', 'warning', 'danger', 'focus',
];

const DEFAULT_RADIUS = 3;
const DEFAULT_BORDER_WIDTH = 1;

export function cssVarName(key) {
  return `--hx-${key.replace(/_/g, '-')}`;
}

export function themeBlocks(slug, theme) {
  const blocks = [];
  for (const mode of ['dark', 'light']) {
    const palette = theme[mode];
    if (!palette) continue;
    const decls = PALETTE_KEYS
      .map((key) => `  ${cssVarName(key)}: ${palette[key]};`)
      .join('\n');
    const radius = theme.border_radius_size ?? DEFAULT_RADIUS;
    const borderWidth = theme.border_width ?? DEFAULT_BORDER_WIDTH;
    blocks.push(
      `[data-theme="${slug}"][data-mode="${mode}"] {\n${decls}\n` +
      `  --hx-radius: ${radius}px;\n` +
      `  --hx-border-width: ${borderWidth}px;\n}`
    );
  }
  return blocks.join('\n\n');
}

export function buildAll(themesDir) {
  const files = readdirSync(themesDir).filter((f) => f.endsWith('.json')).sort();
  const cssParts = [];
  const manifest = [];
  for (const file of files) {
    const slug = basename(file, '.json');
    const theme = JSON.parse(readFileSync(join(themesDir, file), 'utf8'));
    const modes = ['dark', 'light'].filter((m) => theme[m]);
    if (modes.length === 0) continue;
    cssParts.push(themeBlocks(slug, theme));
    manifest.push({ slug, name: theme.name ?? slug, modes });
  }
  const header =
    '/* GENERATED by scripts/gen-themes.mjs from the helixscreen repo. Do not edit. */\n\n';
  return { css: header + cssParts.join('\n\n') + '\n', manifest };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const themesDir = join(root, '..', 'helixscreen', 'assets', 'config', 'themes', 'defaults');
  let built;
  try {
    built = buildAll(themesDir);
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-themes] ${themesDir} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }
  writeFileSync(join(root, 'src', 'styles', 'themes.generated.css'), built.css);
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'themes.generated.json'),
    JSON.stringify(built.manifest, null, 2) + '\n'
  );
  console.log(`[gen-themes] wrote ${built.manifest.length} themes`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gen-themes.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire into package.json**

In `package.json`, add to `scripts`:

```json
"gen-themes": "node scripts/gen-themes.mjs",
"test": "node --test tests/",
"prebuild": "./scripts/sync-docs.sh && node scripts/gen-themes.mjs"
```

- [ ] **Step 6: Generate and sanity-check the real output**

Run: `npm run gen-themes`
Expected: `[gen-themes] wrote 18 themes`

Run: `node -e "const m=require('./src/data/themes.generated.json'); console.log(m.length, m.filter(t=>t.modes.length===1).map(t=>t.slug).join(','))"`
Expected: `18 dracula,hazard,midnight,yami`

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-themes.mjs tests/gen-themes.test.mjs package.json \
  src/styles/themes.generated.css src/data/themes.generated.json
git commit -m "feat(theme): generate site palettes from helixscreen theme files"
```

---

## Task 2: Token layer and structural rules

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/marketing.css`

**Interfaces:**
- Consumes: `--hx-*` custom properties from Task 1.
- Produces: Tailwind utility colours (`bg-canvas`, `text-primary`, `border-hairline`, …) and the base element styles every later component uses.

- [ ] **Step 1: Write the token layer**

Create `src/styles/tokens.css`:

```css
@import 'tailwindcss';
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

@theme {
  --color-canvas: var(--hx-screen-bg);
  --color-overlay: var(--hx-overlay-bg);
  --color-card: var(--hx-card-bg);
  --color-elevated: var(--hx-elevated-bg);
  --color-hairline: var(--hx-border);
  --color-ink: var(--hx-text);
  --color-ink-muted: var(--hx-text-muted);
  --color-ink-subtle: var(--hx-text-subtle);
  --color-accent: var(--hx-primary);
  --color-ok: var(--hx-success);
  --color-warn: var(--hx-warning);
  --color-alert: var(--hx-danger);

  --font-prose: 'Source Serif 4', Charter, Georgia, serif;
  --font-ui: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --radius-token: var(--hx-radius);
}

@layer base {
  body {
    background-color: var(--hx-screen-bg);
    color: var(--hx-text);
    font-family: var(--font-prose);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Structural rules from the app's own theme schema. Not negotiable. */
  * { box-shadow: none !important; text-shadow: none !important; }

  h1, h2, h3, h4, h5, h6 { font-family: var(--font-prose); font-weight: 600; letter-spacing: -0.02em; }
  code, pre, .tabular { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .ui { font-family: var(--font-ui); }

  a { color: inherit; }
  ::selection { background: var(--hx-primary); color: var(--hx-screen-bg); }
  :focus-visible { outline: 2px solid var(--hx-focus); outline-offset: 2px; }
}

@layer components {
  .rule { border: 0; border-top: var(--hx-border-width) solid var(--hx-border); }

  .btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.7rem 1.25rem;
    border: var(--hx-border-width) solid var(--hx-border);
    border-radius: var(--hx-radius);
    font-family: var(--font-ui); font-size: 0.875rem;
    text-decoration: none; transition: border-color 0.15s, background-color 0.15s;
  }
  .btn:hover { border-color: var(--hx-primary); background: var(--hx-overlay-bg); }
  .btn-strong { border-color: var(--hx-primary); color: var(--hx-primary); }
  .btn-strong:hover { background: var(--hx-primary); color: var(--hx-screen-bg); }

  /* Screenshots separate from the ground by plinth + hairline, never by glow. */
  .plinth {
    background: var(--hx-card-bg);
    border: var(--hx-border-width) solid var(--hx-border);
    border-radius: var(--hx-radius);
    padding: 0.5rem;
  }
  .plinth img { display: block; width: 100%; border-radius: 0; }
}
```

- [ ] **Step 2: Strip the decorative classes from marketing.css**

Replace the whole contents of `src/styles/marketing.css` with:

```css
/* Marketing-page styles. Design tokens live in tokens.css, which is generated
   from the helixscreen theme files. */
@import './tokens.css';

/* Pagefind search overlay, themed through the token layer. */
#pagefind-search {
  --pagefind-ui-primary: var(--hx-primary);
  --pagefind-ui-text: var(--hx-text);
  --pagefind-ui-background: var(--hx-card-bg);
  --pagefind-ui-border: var(--hx-border);
  --pagefind-ui-tag: var(--hx-screen-bg);
  --pagefind-ui-border-width: 1px;
  --pagefind-ui-border-radius: var(--hx-radius);
  --pagefind-ui-font: var(--font-ui);
  padding: 1rem;
}

#pagefind-search .pagefind-ui__results-area {
  max-height: 60vh;
  overflow-y: auto;
}
```

- [ ] **Step 3: Verify the deleted classes are gone**

Run: `grep -nE "gradient-text|mesh-bg|mesh-drift|hero-gradient|screenshot-glow|scroll-indicator|fade-bounce" src/styles/*.css`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/marketing.css
git commit -m "feat(design): token layer from helixscreen theme schema, drop decorative CSS"
```

---

## Task 3: Typography swap

**Files:**
- Modify: `package.json`, `src/layouts/MarketingLayout.astro`, `src/styles/starlight-custom.css`

**Interfaces:**
- Consumes: `--font-prose` / `--font-ui` / `--font-mono` from Task 2.
- Produces: the three faces actually loaded in the browser.

- [ ] **Step 1: Install Source Serif 4, remove Space Grotesk**

```bash
npm install @fontsource/source-serif-4
npm uninstall @fontsource/space-grotesk
```

- [ ] **Step 2: Verify the font files exist**

Run: `ls node_modules/@fontsource/source-serif-4/files/*.woff2 | head -3`
Expected: at least one `.woff2`. If the package name resolves differently, use `@fontsource-variable/source-serif-4` and adjust the imports in step 3.

- [ ] **Step 3: Swap the imports in `src/layouts/MarketingLayout.astro`**

Replace the seven `@fontsource` import lines at the top of the frontmatter with:

```js
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '../styles/marketing.css';
```

- [ ] **Step 4: Remove Space Grotesk from Starlight CSS**

In `src/styles/starlight-custom.css`, delete the three `@import '@fontsource/space-grotesk/…'` lines and replace every `'Space Grotesk', system-ui, sans-serif` occurrence with `'Source Serif 4', Charter, Georgia, serif`.

- [ ] **Step 5: Verify no Space Grotesk remains**

Run: `grep -rn "space-grotesk\|Space Grotesk" src/ package.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/layouts/MarketingLayout.astro src/styles/starlight-custom.css
git commit -m "feat(type): Source Serif 4 for prose, drop Space Grotesk"
```

---

## Task 4: Theme switcher

**Files:**
- Create: `src/components/ThemeScript.astro`, `src/components/ThemeSwitcher.astro`
- Modify: `src/layouts/MarketingLayout.astro`

**Interfaces:**
- Consumes: `src/data/themes.generated.json` from Task 1.
- Produces: `<ThemeScript />` for `<head>`, `<ThemeSwitcher />` for the header. Sets `data-theme` and `data-mode` on `<html>`; persists to `localStorage` keys `hx-theme` and `hx-mode`.

- [ ] **Step 1: Write the no-flash script**

Create `src/components/ThemeScript.astro`:

```astro
---
// Must render inside <head> before any paint. Inline and synchronous on purpose.
---
<script is:inline>
  (function () {
    try {
      var t = localStorage.getItem('hx-theme') || 'helixscreen';
      var m = localStorage.getItem('hx-mode') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.setAttribute('data-mode', m);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'helixscreen');
      document.documentElement.setAttribute('data-mode', 'dark');
    }
  })();
</script>
```

- [ ] **Step 2: Write the switcher**

Create `src/components/ThemeSwitcher.astro`:

```astro
---
import themes from '../data/themes.generated.json';
---
<div class="relative ui text-xs">
  <label class="sr-only" for="hx-theme-select">Theme</label>
  <select
    id="hx-theme-select"
    class="bg-transparent border border-hairline rounded-[var(--hx-radius)] px-2 py-1 text-ink-muted"
  >
    {themes.map((t) => (
      <option value={t.slug} data-modes={t.modes.join(',')}>{t.name}</option>
    ))}
  </select>
  <button
    id="hx-mode-toggle"
    type="button"
    class="ml-1 border border-hairline rounded-[var(--hx-radius)] px-2 py-1 text-ink-muted"
    aria-label="Toggle light and dark mode"
  >
    <span id="hx-mode-label">dark</span>
  </button>
</div>

<script>
  const select = document.getElementById('hx-theme-select');
  const toggle = document.getElementById('hx-mode-toggle');
  const label = document.getElementById('hx-mode-label');
  const root = document.documentElement;

  function modesFor(slug) {
    const opt = select.querySelector(`option[value="${slug}"]`);
    return (opt?.dataset.modes ?? 'dark').split(',');
  }

  function apply(theme, mode) {
    const modes = modesFor(theme);
    const resolved = modes.includes(mode) ? mode : modes[0];
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-mode', resolved);
    label.textContent = resolved;
    // A dark-only theme cannot be toggled; say so rather than no-op silently.
    toggle.disabled = modes.length === 1;
    toggle.style.opacity = modes.length === 1 ? '0.4' : '1';
    try {
      localStorage.setItem('hx-theme', theme);
      localStorage.setItem('hx-mode', resolved);
    } catch (e) { /* private mode: choice just won't persist */ }
  }

  select.value = root.getAttribute('data-theme') ?? 'helixscreen';
  apply(select.value, root.getAttribute('data-mode') ?? 'dark');

  select.addEventListener('change', () => apply(select.value, root.getAttribute('data-mode')));
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
    apply(select.value, next);
  });
</script>
```

- [ ] **Step 3: Mount the script in the layout**

In `src/layouts/MarketingLayout.astro`, import `ThemeScript` and place `<ThemeScript />` as the **first** child of `<head>`. Remove the `IntersectionObserver` block that adds `is-visible` to `.animate-on-scroll` — the blanket scroll animation is deleted.

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open the site, switch to Dracula.
Expected: page recolours; the mode toggle greys out and stays on `dark`. Reload — Dracula persists with no flash of the default theme.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeScript.astro src/components/ThemeSwitcher.astro src/layouts/MarketingLayout.astro
git commit -m "feat(theme): runtime theme switcher with no-flash restore"
```

---

## Task 5: Header and page shell

**Files:**
- Modify: `src/components/marketing/SiteNav.astro`

**Interfaces:**
- Consumes: `<ThemeSwitcher />` from Task 4.
- Produces: the header used by `index.astro`.

- [ ] **Step 1: Rebuild the nav**

Replace `src/components/marketing/SiteNav.astro` with a header that keeps the existing `SiteSearch` and mobile-menu behaviour but: uses `font-ui` for links, drops `.btn-primary`'s gradient in favour of `.btn-strong`, adds `<ThemeSwitcher />` and a `1.0` version marker, and replaces the `nav-scrolled` blur with a plain hairline bottom border that appears on scroll.

```astro
---
import { Image } from 'astro:assets';
import SiteSearch from './SiteSearch.astro';
import ThemeSwitcher from '../ThemeSwitcher.astro';
import logo from '../../assets/images/logo/helix-icon-64.png';
---
<header id="site-nav" class="sticky top-0 z-50 bg-canvas">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 h-14">
    <a href="/" class="flex items-center gap-2 shrink-0">
      <Image src={logo} alt="" width={24} class="h-6 w-auto" />
      <span class="font-prose font-semibold text-ink">HelixScreen</span>
    </a>
    <nav class="hidden md:flex items-center gap-5 ui text-sm text-ink-muted">
      <a href="/installation/" class="hover:text-ink">Install</a>
      <a href="/guide/getting-started/" class="hover:text-ink">Docs</a>
      <a href="#printers" class="hover:text-ink">Printers</a>
      <a href="#touch" class="hover:text-ink">Contact</a>
    </nav>
    <div class="ml-auto flex items-center gap-3">
      <SiteSearch />
      <ThemeSwitcher />
      <span class="ui text-xs text-alert border border-alert rounded-[var(--hx-radius)] px-2 py-1 tabular">1.0</span>
    </div>
  </div>
  <hr class="rule opacity-0 transition-opacity" id="nav-rule" />
</header>

<script>
  const rule = document.getElementById('nav-rule');
  const onScroll = () => { rule.style.opacity = window.scrollY > 8 ? '1' : '0'; };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
</script>
```

- [ ] **Step 2: Verify no gradient button survives**

Run: `grep -rn "btn-primary\|linear-gradient" src/components/marketing/SiteNav.astro`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/SiteNav.astro
git commit -m "feat(nav): rebuild header with theme switcher, drop gradient button"
```

---

## Task 6: Hero

**Files:**
- Create: `src/components/marketing/MarginRail.astro`, `src/components/marketing/SpecGrid.astro`
- Modify: `src/components/marketing/Hero.astro`

**Interfaces:**
- Consumes: token classes from Task 2.
- Produces: `<MarginRail items={[{value,label,note}]} />`, `<SpecGrid rows={[{k,v,tone?}]} />` where `tone` is `'ok' | 'subtle' | undefined`. Tasks 7–10 reuse both.

- [ ] **Step 1: Write MarginRail**

```astro
---
interface Item { value: string; label: string; note?: string }
const { items } = Astro.props as { items: Item[] };
---
<aside class="ui text-xs text-ink-subtle space-y-6">
  {items.map((i) => (
    <p>
      <span class="block tabular text-base text-ink">{i.value}</span>
      <span class="block text-ink-muted">{i.label}</span>
      {i.note && <span class="block mt-1">{i.note}</span>}
    </p>
  ))}
  <slot />
</aside>
```

- [ ] **Step 2: Write SpecGrid**

```astro
---
interface Row { k: string; v: string; tone?: 'ok' | 'subtle' }
const { rows } = Astro.props as { rows: Row[] };
const toneClass = (t?: string) =>
  t === 'ok' ? 'text-ok' : t === 'subtle' ? 'text-ink-subtle' : 'text-ink';
---
<div class="grid grid-cols-2 md:grid-cols-4 border-t border-b border-hairline">
  {rows.map((r, i) => (
    <div class:list={['py-3 pr-4', i % 4 !== 3 && 'md:border-r md:border-hairline']}>
      <span class="ui block text-[10px] uppercase tracking-[0.13em] text-ink-subtle mb-1">{r.k}</span>
      <span class:list={['tabular text-[15px]', toneClass(r.tone)]}>{r.v}</span>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Rebuild the Hero**

Replace `src/components/marketing/Hero.astro`:

```astro
---
import MarginRail from './MarginRail.astro';
import SpecGrid from './SpecGrid.astro';

const rail = [
  { value: '11,778', label: 'commits since October 2025', note: 'About 98% mine. The rest are why it runs on printers I do not own.' },
  { value: '~15 MB', label: 'resident on an armv7 printer board', note: 'No X11, no browser, no desktop underneath.' },
  { value: '80+', label: 'printers it recognises without being told' },
];

const spec = [
  { k: 'RAM', v: '~15 MB' },
  { k: 'Disk', v: '~75 MB' },
  { k: 'Dependencies', v: 'none', tone: 'ok' as const },
  { k: 'X11 / browser', v: 'not required', tone: 'subtle' as const },
  { k: 'Panels', v: '30' },
  { k: 'Themes', v: '18' },
  { k: 'MM backends', v: '7' },
  { k: 'License', v: 'GPL-3.0' },
];

const install = 'curl -sSL https://raw.githubusercontent.com/prestonbrown/helixscreen/main/scripts/install.sh | sh';
---
<section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-[190px_1fr] gap-10 pt-16 pb-14">
  <MarginRail items={rail} />

  <div>
    <p class="ui text-[11px] uppercase tracking-[0.16em] text-warn mb-5">Klipper touch interface</p>
    <h1 class="text-4xl md:text-5xl leading-[1.1] max-w-[19ch] mb-5">
      Everything your printer knows, on the screen it already has.
    </h1>
    <p class="text-lg leading-relaxed text-ink-muted max-w-[56ch] mb-8">
      I started this because my Adventurer 5M Pro could not show me a bed mesh — I only
      wanted to see how bad it was. Things snowballed. Ten months on it is a complete
      touch interface, and it is hitting 1.0.
    </p>

    <SpecGrid rows={spec} />

    <div class="mt-8 flex items-center gap-2 border border-hairline border-l-2 border-l-alert rounded-[var(--hx-radius)] bg-overlay px-4 py-3">
      <span class="font-mono text-sm text-alert select-none">$</span>
      <code id="install-command" class="font-mono text-sm text-ink overflow-x-auto whitespace-nowrap">{install}</code>
      <button id="copy-btn" type="button" class="ml-auto ui text-[10px] uppercase tracking-[0.1em] text-ink-subtle hover:text-ink" aria-label="Copy install command">Copy</button>
    </div>
    <p class="ui text-sm text-ink-subtle mt-4">
      Rather read first? <a href="/installation/" class="text-accent underline underline-offset-2">The install guide</a>
      covers every supported board, and remote-screen setup if the printer lives on the floor.
    </p>
  </div>
</section>

<script>
  const btn = document.getElementById('copy-btn');
  const cmd = document.getElementById('install-command');
  btn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cmd?.textContent ?? '');
      btn.textContent = 'Copied';
    } catch { btn.textContent = 'Failed'; }
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
</script>
```

- [ ] **Step 4: Verify the headline and banned copy**

Run: `grep -c "Everything your printer knows, on the screen it already has." src/components/marketing/Hero.astro`
Expected: `1`

Run: `grep -niE "deserves|mastered|seamless|effortless|unleash|beautiful, customizable" src/components/marketing/Hero.astro`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/Hero.astro src/components/marketing/MarginRail.astro src/components/marketing/SpecGrid.astro
git commit -m "feat(hero): rail, spec grid and install command in first person"
```

---

## Task 7: Origin figure and comparison table

**Files:**
- Create: `src/components/marketing/Figure.astro`, `src/components/marketing/ComparisonTable.astro`

**Interfaces:**
- Consumes: `.plinth` from Task 2.
- Produces: `<Figure image alt caption annotation? />`, `<ComparisonTable />`. Tasks 8–9 reuse `Figure`.

- [ ] **Step 1: Write Figure**

```astro
---
import { Image } from 'astro:assets';
import type { ImageMetadata } from 'astro';
interface Props { image: ImageMetadata; alt: string; caption: string; annotation?: string }
const { image, alt, caption, annotation } = Astro.props;
---
<figure class="grid md:grid-cols-[1fr_170px] gap-6 items-center">
  <div>
    <div class="plinth">
      <Image src={image} alt={alt} widths={[480, 768, 1024]} sizes="(max-width: 768px) 92vw, 60vw" />
    </div>
    <figcaption class="ui text-[11px] text-ink-subtle mt-2">{caption}</figcaption>
  </div>
  {annotation && (
    <p class="ui text-xs italic text-alert leading-relaxed">
      <svg width="34" height="20" viewBox="0 0 34 20" aria-hidden="true" class="block mb-2">
        <path d="M32 10 C 20 10, 14 6, 3 4" stroke="currentColor" stroke-width="1.3" fill="none"/>
        <path d="M3 4 l 8 0 l -6 -4" stroke="currentColor" stroke-width="1.3" fill="none"/>
      </svg>
      {annotation}
    </p>
  )}
</figure>
```

- [ ] **Step 2: Write ComparisonTable**

```astro
---
const rows = [
  { k: 'RAM, armv7',                 me: '~15 MB',                    ks: '~50 MB',       gs: '~20 MB' },
  { k: 'Needs X11 or a browser',     me: 'no', meTone: 'ok',          ks: 'yes', ksTone: 'no', gs: 'no', gsTone: 'ok' },
  { k: 'Bed mesh in 3D, rotatable',  me: 'yes', meTone: 'ok',         ks: 'flat heatmap', ksTone: 'no', gs: 'flat heatmap', gsTone: 'no' },
  { k: 'Input shaper graphs on-device', me: 'yes', meTone: 'ok',      ks: 'no', ksTone: 'no', gs: 'no', gsTone: 'no' },
  { k: 'Exclude object, tap-to-skip', me: 'yes', meTone: 'ok',        ks: 'no', ksTone: 'no', gs: 'no', gsTone: 'no' },
  { k: 'Multi-material backends',    me: '7',                         ks: '1',            gs: '1' },
  { k: 'Ultrawide and portrait',     me: 'alpha — runs, looks wrong', meTone: 'no', ks: 'no', ksTone: 'no', gs: 'no', gsTone: 'no' },
];
const tone = (t?: string) => (t === 'ok' ? 'text-ok' : t === 'no' ? 'text-ink-subtle' : 'text-ink-muted');
---
<section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
  <h2 class="text-2xl mb-2">What it does that yours does not</h2>
  <p class="ui text-sm text-ink-subtle mb-6">
    Figures are resident set size on an armv7 printer board, not install size.
  </p>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse font-mono text-xs min-w-[560px]">
      <thead>
        <tr>
          <th class="text-left ui text-[10px] uppercase tracking-[0.13em] text-ink-subtle font-normal pb-2 border-b border-hairline w-[38%]"></th>
          <th class="text-left ui text-[10px] uppercase tracking-[0.13em] text-alert font-normal pb-2 border-b border-hairline">HelixScreen</th>
          <th class="text-left ui text-[10px] uppercase tracking-[0.13em] text-ink-subtle font-normal pb-2 border-b border-hairline">KlipperScreen</th>
          <th class="text-left ui text-[10px] uppercase tracking-[0.13em] text-ink-subtle font-normal pb-2 border-b border-hairline">GuppyScreen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr>
            <td class="ui text-[13px] text-ink py-2.5 pr-4 border-b border-hairline/40">{r.k}</td>
            <td class:list={['py-2.5 pr-4 border-b border-hairline/40 tabular font-semibold', tone(r.meTone) === 'text-ink-muted' ? 'text-ink' : tone(r.meTone)]}>{r.me}</td>
            <td class:list={['py-2.5 pr-4 border-b border-hairline/40 tabular', tone(r.ksTone)]}>{r.ks}</td>
            <td class:list={['py-2.5 pr-4 border-b border-hairline/40 tabular', tone(r.gsTone)]}>{r.gs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
```

- [ ] **Step 3: Verify the honest row survives**

Run: `grep -c "alpha — runs, looks wrong" src/components/marketing/ComparisonTable.astro`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/Figure.astro src/components/marketing/ComparisonTable.astro
git commit -m "feat(landing): annotated figure and comparison table"
```

---

## Task 8: Capability grid and multi-material spotlight

**Files:**
- Create: `src/components/marketing/CapabilityGrid.astro`, `src/components/marketing/Spotlight.astro`

**Interfaces:**
- Consumes: `Figure` from Task 7.
- Produces: `<CapabilityGrid />`, `<Spotlight />`.

- [ ] **Step 1: Write CapabilityGrid — six cells, screenshots on plinths**

```astro
---
import { Image } from 'astro:assets';
import zoffset from '../../assets/images/screenshots/advanced-zoffset.png';
import shaper from '../../assets/images/screenshots/advanced-shaper.png';
import printSelect from '../../assets/images/screenshots/print-select.png';
import history from '../../assets/images/screenshots/advanced-history.png';
import spoolman from '../../assets/images/screenshots/advanced-spoolman.png';
import controls from '../../assets/images/screenshots/controls.png';

const cells = [
  { img: zoffset,     t: 'Z-offset you can actually see', b: 'A live visual meter while you set first-layer height, rather than nudging a number and hoping.' },
  { img: shaper,      t: 'Input shaper without a laptop', b: 'Frequency response charts render on the printer. Run the test, read the graph, apply the result, all on the screen.' },
  { img: printSelect, t: 'Files with real thumbnails',    b: 'Live 3D previews and metadata, fast enough to scroll through hundreds of files.' },
  { img: history,     t: 'Every print, recorded',         b: 'Success rate, print time and filament used, plus Moonraker-Timelapse capture and playback.' },
  { img: spoolman,    t: 'Spoolman, properly integrated', b: '48 material profiles with drying parameters, weight polling, and spools assigned to AMS slots.' },
  { img: controls,    t: 'Lighting that follows the job', b: 'Klipper LEDs, output pins, WLED, led_effects and macros, switching per printer state.' },
];
---
<section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-hairline">
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
    {cells.map((c) => (
      <article>
        <div class="plinth mb-4">
          <Image src={c.img} alt="" widths={[320, 480]} sizes="(max-width: 640px) 92vw, 30vw" />
        </div>
        <h3 class="text-lg mb-1.5">{c.t}</h3>
        <p class="text-sm leading-relaxed text-ink-muted">{c.b}</p>
      </article>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Write Spotlight — one full-width section on the deepest feature**

```astro
---
import { Image } from 'astro:assets';
import ams from '../../assets/images/screenshots/ams.png';
import ercf from '../../assets/images/ams/ercf.svg';
import boxTurtle from '../../assets/images/ams/box_turtle.svg';
import tradrack from '../../assets/images/ams/tradrack.svg';
import threeMs from '../../assets/images/ams/3ms.svg';
import nightOwl from '../../assets/images/ams/night_owl.svg';
import kms from '../../assets/images/ams/kms.svg';
import quattro from '../../assets/images/ams/quattro_box.svg';
import vivid from '../../assets/images/ams/btt_vivid.svg';
import mmx from '../../assets/images/ams/mmx.svg';

const icons = [
  { src: ercf, alt: 'ERCF' }, { src: boxTurtle, alt: 'Box Turtle' },
  { src: tradrack, alt: 'TradRack' }, { src: threeMs, alt: '3MS' },
  { src: nightOwl, alt: 'Night Owl' }, { src: kms, alt: 'KMS' },
  { src: quattro, alt: 'Quattro Box' }, { src: vivid, alt: 'BTT Vivid' },
  { src: mmx, alt: 'MMX' },
];
const url = (s: any) => (typeof s === 'string' ? s : s.src);
---
<section class="border-t border-b border-hairline bg-overlay">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-12 items-center">
    <div class="plinth">
      <Image src={ams} alt="Multi-material panel with filament slots and status" widths={[480, 768, 1024]} sizes="(max-width: 1024px) 92vw, 46vw" />
    </div>
    <div>
      <p class="ui text-[11px] uppercase tracking-[0.16em] text-warn mb-4">Multi-material</p>
      <h2 class="text-3xl leading-tight mb-4">Seven multi-material systems, one interface.</h2>
      <p class="text-base leading-relaxed text-ink-muted mb-4">
        Happy Hare, AFC, ACE, AD5X IFS, Creality CFS, Snapmaker U1 with RFID spool
        recognition, and tool changers. Filament paths render as 3D tubes, toolheads
        animate as they move, and buffer health is on screen while it prints.
      </p>
      <p class="text-base leading-relaxed text-ink-muted mb-6">
        I did not set out to support seven of them. People kept asking, and the ones who
        owned the hardware sent patches.
      </p>
      <div class="flex flex-wrap gap-4 items-center">
        {icons.map((i) => (
          <img src={url(i.src)} alt={i.alt} width="34" height="34" class="opacity-60 hover:opacity-100 transition-opacity" />
        ))}
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Verify no list-of-three copy crept in**

Run: `grep -nE "\w+, \w+ and \w+\.|\w+, \w+, and \w+\." src/components/marketing/CapabilityGrid.astro`
Expected: review each hit by hand; enumerated technical lists (backends, LED drivers) are facts and are allowed. Rhetorical adjective triples are not. Rewrite any that are adjectives.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/CapabilityGrid.astro src/components/marketing/Spotlight.astro
git commit -m "feat(landing): capability grid and multi-material spotlight"
```

---

## Task 9: Platform table and theme demo

**Files:**
- Create: `src/components/marketing/PlatformTable.astro`, `src/components/marketing/ThemeDemo.astro`

**Interfaces:**
- Consumes: `src/data/themes.generated.json` from Task 1.
- Produces: `<PlatformTable />` (anchor `#printers`), `<ThemeDemo />`.

- [ ] **Step 1: Write PlatformTable**

```astro
---
const platforms = [
  { name: 'Raspberry Pi 3 / 4 / 5',       arch: 'armhf, aarch64' },
  { name: 'FlashForge AD5M / AD5X',       arch: 'armv7-a, MIPS32' },
  { name: 'Creality K1 / K2 series',      arch: 'MIPS32, ARM' },
  { name: 'QIDI',                         arch: 'aarch64' },
  { name: 'Sovol',                        arch: 'aarch64' },
  { name: 'Elegoo Centauri Carbon',       arch: 'armv7-a' },
  { name: 'Snapmaker U1',                 arch: 'aarch64' },
];
---
<section id="printers" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-hairline">
  <h2 class="text-2xl mb-2">It probably already knows your printer.</h2>
  <p class="ui text-sm text-ink-subtle mb-6 max-w-[62ch]">
    80+ models in the auto-detection database, spanning Voron, Creality, QIDI, Anycubic,
    FlashForge, Sovol, RatRig, FLSUN, Elegoo, Prusa and Snapmaker. Anything running
    Klipper and Moonraker works even if it is not in the list — the wizard discovers
    what your machine can do.
  </p>
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-hairline">
    {platforms.map((p) => (
      <div class="border-b border-hairline py-3 pr-4">
        <span class="ui text-sm text-ink block">{p.name}</span>
        <span class="font-mono text-[11px] text-ink-subtle tabular">{p.arch}</span>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Write ThemeDemo — the page recolours itself**

```astro
---
import themes from '../../data/themes.generated.json';
---
<section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-hairline">
  <h2 class="text-2xl mb-2">{themes.length} themes ship with it. This page is running one.</h2>
  <p class="ui text-sm text-ink-subtle mb-6 max-w-[62ch]">
    The palettes below are read straight out of the app's own theme files. Pick one and
    this page changes with it, because it is the same data the printer's screen uses.
  </p>
  <div class="flex flex-wrap gap-2">
    {themes.map((t) => (
      <button
        type="button"
        data-theme-pick={t.slug}
        class="ui text-[11px] text-ink-muted border border-hairline rounded-[var(--hx-radius)] px-3 py-1.5 hover:border-accent"
      >{t.name}</button>
    ))}
  </div>
</section>

<script>
  document.querySelectorAll('[data-theme-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slug = btn.getAttribute('data-theme-pick');
      const select = document.getElementById('hx-theme-select');
      if (select) {
        select.value = slug;
        select.dispatchEvent(new Event('change'));
      }
    });
  });
</script>
```

- [ ] **Step 3: Verify the count is derived, not hardcoded**

Run: `grep -nE "\b1[5-9] (built-in )?themes\b" src/components/marketing/*.astro`
Expected: no output — the count comes from `themes.length`.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/PlatformTable.astro src/components/marketing/ThemeDemo.astro
git commit -m "feat(landing): platform table and live theme demo"
```

---

## Task 10: Get in touch and colophon

**Files:**
- Create: `src/components/marketing/GetInTouch.astro`, `src/components/marketing/Colophon.astro`

**Interfaces:**
- Consumes: token classes.
- Produces: `<GetInTouch />` (anchor `#touch`), `<Colophon />`.

- [ ] **Step 1: Write GetInTouch — routed by intent, not a row of logos**

```astro
---
const routes = [
  { intent: 'Something is broken',      action: 'Open a bug report',  href: 'https://github.com/prestonbrown/helixscreen/issues/new?labels=bug',  note: 'Include your printer model and the log. I read all of them.' },
  { intent: 'I want it to do something it does not', action: 'Start a discussion', href: 'https://github.com/prestonbrown/helixscreen/discussions', note: 'Feature requests live here so other people can pile on.' },
  { intent: 'I have a question',        action: 'Ask on Discord',     href: 'https://discord.gg/RZCT2StKhr', note: 'Fastest answer, usually from someone who is not me.' },
  { intent: 'Anything else',            action: 'hello@helixscreen.org', href: 'mailto:hello@helixscreen.org', note: 'Goes straight to me.' },
];
---
<section id="touch" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-hairline">
  <h2 class="text-2xl mb-2">Tell me what it is missing.</h2>
  <p class="ui text-sm text-ink-subtle mb-8 max-w-[62ch]">
    Most of what HelixScreen does now exists because somebody asked for it. Pick whichever
    of these fits — they all reach me.
  </p>
  <div class="border-t border-hairline">
    {routes.map((r) => (
      <div class="grid md:grid-cols-[1fr_auto] gap-2 md:gap-8 items-baseline py-4 border-b border-hairline">
        <div>
          <p class="text-base text-ink">{r.intent}</p>
          <p class="ui text-xs text-ink-subtle mt-1">{r.note}</p>
        </div>
        <a href={r.href} class="btn btn-strong shrink-0" rel="noopener noreferrer">{r.action}</a>
      </div>
    ))}
  </div>
  <p class="ui text-xs text-ink-subtle mt-6">
    Security issues go to <a href="mailto:security@helixscreen.org" class="text-accent underline underline-offset-2">security@helixscreen.org</a> instead.
  </p>
</section>
```

- [ ] **Step 2: Write Colophon**

```astro
---
const year = new Date().getFullYear();
---
<footer class="border-t border-hairline">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-[1fr_auto] gap-8 items-end">
    <div>
      <p class="text-base text-ink-muted max-w-[52ch] leading-relaxed">
        HelixScreen is written and maintained by Preston Brown, with patches from fifteen
        other people who owned printers I did not. It is GPL-3.0, and the source is the
        same code that runs on the screen.
      </p>
      <p class="ui text-xs text-ink-subtle mt-4">
        <a href="https://github.com/prestonbrown/helixscreen" class="hover:text-ink">Source</a>
        <span class="mx-2">·</span>
        <a href="https://github.com/prestonbrown/helixscreen/blob/main/LICENSE" class="hover:text-ink">GPL-3.0</a>
        <span class="mx-2">·</span>
        <a href="/legal/privacy/" class="hover:text-ink">Privacy</a>
        <span class="mx-2">·</span>
        <a href="/legal/telemetry/" class="hover:text-ink">Telemetry</a>
        <span class="mx-2">·</span>
        <a href="mailto:hello@helixscreen.org" class="hover:text-ink">hello@helixscreen.org</a>
      </p>
    </div>
    <p class="ui text-xs text-ink-subtle tabular">© {year}</p>
  </div>
</footer>
```

- [ ] **Step 3: Verify banned strings absent**

Run: `grep -rniE "built by makers|makers, for makers|deserves|community-driven" src/components/marketing/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/GetInTouch.astro src/components/marketing/Colophon.astro
git commit -m "feat(landing): intent-routed contact section and signed colophon"
```

---

## Task 11: Assemble the page and delete dead code

**Files:**
- Modify: `src/pages/index.astro`, `src/components/marketing/InstallBlock.astro`
- Delete: nine components listed in File Structure

**Interfaces:**
- Consumes: every component from Tasks 5–10.
- Produces: the finished landing page.

- [ ] **Step 1: Rewrite index.astro**

```astro
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import SiteNav from '../components/marketing/SiteNav.astro';
import Hero from '../components/marketing/Hero.astro';
import Figure from '../components/marketing/Figure.astro';
import ComparisonTable from '../components/marketing/ComparisonTable.astro';
import CapabilityGrid from '../components/marketing/CapabilityGrid.astro';
import Spotlight from '../components/marketing/Spotlight.astro';
import PlatformTable from '../components/marketing/PlatformTable.astro';
import ThemeDemo from '../components/marketing/ThemeDemo.astro';
import GetInTouch from '../components/marketing/GetInTouch.astro';
import Colophon from '../components/marketing/Colophon.astro';
import bedMesh from '../assets/images/screenshots/controls-bed-mesh.png';
---
<MarketingLayout title="HelixScreen — a Klipper touch interface">
  <SiteNav />
  <main>
    <Hero />

    <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <Figure
        image={bedMesh}
        alt="Bed mesh rendered as a rotatable 3D surface"
        caption="Bed mesh · cartographer · 7×7"
        annotation="this is the panel that started it. everything else came after."
      />
    </section>

    <ComparisonTable />
    <CapabilityGrid />
    <Spotlight />
    <PlatformTable />
    <ThemeDemo />
    <GetInTouch />
  </main>
  <Colophon />
</MarketingLayout>
```

- [ ] **Step 2: Delete the superseded components**

```bash
git rm src/components/marketing/ProductReveal.astro \
       src/components/marketing/FeatureStory.astro \
       src/components/marketing/StatsStrip.astro \
       src/components/marketing/ThemeStrip.astro \
       src/components/marketing/WhySwitch.astro \
       src/components/marketing/PrinterConstellation.astro \
       src/components/marketing/VisualComparison.astro \
       src/components/marketing/Community.astro \
       src/components/marketing/Footer.astro \
       src/components/marketing/InstallBlock.astro
```

`InstallBlock` goes too — the install command now lives in the Hero, and the fake macOS traffic lights were one of the tells.

- [ ] **Step 3: Verify nothing still imports a deleted component**

Run: `grep -rnE "ProductReveal|FeatureStory|StatsStrip|ThemeStrip|WhySwitch|PrinterConstellation|VisualComparison|Community|Footer|InstallBlock" src/`
Expected: no output.

- [ ] **Step 4: Build**

Run: `npx astro build`
Expected: exits 0 with no unresolved-import errors.

- [ ] **Step 5: Commit**

```bash
git add -A src/pages/index.astro src/components/marketing/
git commit -m "feat(landing): assemble the rebuilt page, remove superseded components"
```

---

## Task 12: Verification gate

**Files:**
- Create: `tests/no-tells.test.mjs`

**Interfaces:**
- Consumes: built output in `dist/`.
- Produces: the regression gate that keeps the tells from returning.

- [ ] **Step 1: Write the failing test**

Create `tests/no-tells.test.mjs`:

```js
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

test('no shadows in authored CSS', () => {
  const hits = authoredCss().match(/box-shadow\s*:\s*(?!none)[^;}!]+/g) ?? [];
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
```

- [ ] **Step 2: Run it against the current build**

Run: `npx astro build && node --test tests/no-tells.test.mjs`
Expected: all pass. The scoping to authored CSS plus the landing page is deliberate and documented in the file's header comment — do not widen it to all of `dist/`, which carries Starlight and Pagefind CSS that this phase does not touch.

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: both files pass, 14 tests total.

- [ ] **Step 4: Manual check across themes**

Run `npm run dev`, then for `helixscreen`, `nord`, `dracula` (dark-only), `solarized` (light) and `everforest`:
- text remains legible against its ground
- screenshots stay visually separated from the background by the plinth
- the mode toggle disables on `dracula`
- reloading preserves the choice with no flash

- [ ] **Step 5: Commit**

```bash
git add tests/no-tells.test.mjs
git commit -m "test: gate the build against the tells the rework removed"
```

---

## Self-Review

**Spec coverage.** Design system → Tasks 1–3. Theme system incl. count-derivation → Tasks 1, 4, 9. Landing composition, all eleven sections → Tasks 5–11 (header T5; hero T6; origin figure T7 via `index.astro`; comparison T7; capability grid T8; spotlight T8; platform table T9; theme demo T9; install — folded into the Hero, deliberately, replacing `InstallBlock`; get in touch T10; colophon T10). Deletions → Tasks 2, 3, 11. Verification → Task 12. Copy rules → Global Constraints, enforced in T6/T8/T10 steps and T12.

**Deliberate spec deviations.** The spec listed install as its own section 9; folding it into the hero removes a near-duplicate CTA and lets `InstallBlock.astro` be deleted along with its fake traffic lights. Flag on review if the standalone section is wanted back.

**Not covered here, by design.** Docs chrome (spec phase 3), `/printers/`, `/whats-new/`, `/contact/` (phase 4), and the Cloudflare email routes, which need credentials this plan cannot assume.

**Type consistency.** `PALETTE_KEYS`, `cssVarName`, `themeBlocks`, `buildAll` are used identically in Tasks 1 and 2. The manifest shape `{slug,name,modes}` is produced in Task 1 and consumed unchanged in Tasks 4 and 9. `SpecGrid` rows are `{k,v,tone?}` in Tasks 6 and 7. `Figure` props `{image,alt,caption,annotation?}` in Tasks 7 and 11. `localStorage` keys `hx-theme`/`hx-mode` and the element id `hx-theme-select` are shared by Tasks 4 and 9.
