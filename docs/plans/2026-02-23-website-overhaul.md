# HelixScreen Website Major Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the landing page with updated content, bolder branding, 4 new feature sections, scroll animations, and build a docs pipeline that syncs user documentation from the helixscreen source tree.

**Architecture:** Astro + Starlight static site. Marketing landing page at `/` with custom components. Docs at `/docs/*` powered by Starlight's content collections. A shell script syncs markdown from `../helixscreen/docs/user/` → `src/content/docs/` with frontmatter injection and path rewriting.

**Tech Stack:** Astro 5.17, Starlight 0.37, Tailwind CSS v4, vanilla JS (IntersectionObserver for scroll animations)

**Design doc:** `docs/plans/2026-02-23-website-overhaul-design.md`

---

## Task 1: Copy missing screenshots from helixscreen

**Files:**
- Copy from: `../helixscreen/docs/images/user/ams.png`, `controls-fan-detail.png`, `print-detail.png`, `print-select-list.png`, `wizard-connection.png`, `wizard-hardware.png`
- Copy to: `src/assets/images/screenshots/`

**Step 1: Copy the missing images**

```bash
cp ../helixscreen/docs/images/user/ams.png src/assets/images/screenshots/
cp ../helixscreen/docs/images/user/controls-fan-detail.png src/assets/images/screenshots/
cp ../helixscreen/docs/images/user/print-detail.png src/assets/images/screenshots/
cp ../helixscreen/docs/images/user/print-select-list.png src/assets/images/screenshots/
cp ../helixscreen/docs/images/user/wizard-connection.png src/assets/images/screenshots/
cp ../helixscreen/docs/images/user/wizard-hardware.png src/assets/images/screenshots/
```

**Step 2: Commit**

```bash
git add src/assets/images/screenshots/ams.png src/assets/images/screenshots/controls-fan-detail.png src/assets/images/screenshots/print-detail.png src/assets/images/screenshots/print-select-list.png src/assets/images/screenshots/wizard-connection.png src/assets/images/screenshots/wizard-hardware.png
git commit -m "chore: copy missing screenshots from helixscreen source"
```

---

## Task 2: Add scroll animation CSS and utility classes to marketing.css

**Files:**
- Modify: `src/styles/marketing.css`

**Step 1: Add scroll animation keyframes and gradient text utilities**

Add these to `marketing.css` after the existing `@layer components` block:

```css
/* ── Scroll animations ── */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(24px);
}

.animate-on-scroll.is-visible {
  animation: fade-in-up 0.6s ease-out forwards;
}

/* Stagger delays for child elements */
.animate-on-scroll.delay-1 { animation-delay: 0.1s; }
.animate-on-scroll.delay-2 { animation-delay: 0.2s; }
.animate-on-scroll.delay-3 { animation-delay: 0.3s; }

/* ── Gradient text ── */
.gradient-text {
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent-light) 50%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Screenshot hover effect ── */
.screenshot-hover {
  transition: transform 0.3s ease, filter 0.3s ease;
}
.screenshot-hover:hover {
  transform: scale(1.02);
}
```

**Step 2: Verify dev server renders correctly**

```bash
npm run dev
```
Open http://localhost:4321 and confirm no CSS errors.

**Step 3: Commit**

```bash
git add src/styles/marketing.css
git commit -m "style: add scroll animations, gradient text, screenshot hover utilities"
```

---

## Task 3: Update Hero component — new copy, gradient text, bolder typography

**Files:**
- Modify: `src/components/marketing/Hero.astro`

**Step 1: Update the Hero component**

Changes to make:
- Headline: change to `The touchscreen UI your printer deserves.`
- Add `gradient-text` class to the `<h1>`
- Increase font sizes: `text-4xl sm:text-5xl md:text-6xl`
- Subline: change to `Beautiful, customizable, and community-driven. Open source, built for every Klipper printer.`
- Update "Get Started" href from `/getting-started/overview/` to `/docs/installation/`
- Add Discord link next to GitHub CTA

The `<h1>` should become:
```html
<h1 class="font-heading font-semibold text-4xl sm:text-5xl md:text-6xl leading-tight gradient-text mb-5">
  The touchscreen UI your printer deserves.
</h1>
```

The subline:
```html
<p class="text-text-secondary text-base sm:text-lg mb-10 max-w-xl">
  Beautiful, customizable, and community-driven. Open source, built for every Klipper printer.
</p>
```

**Step 2: Verify in browser**

Check that gradient text renders correctly, responsive sizing works, and CTAs link correctly.

**Step 3: Commit**

```bash
git add src/components/marketing/Hero.astro
git commit -m "feat(hero): bold new copy, gradient text, updated CTAs"
```

---

## Task 4: Add ThemeStrip component and update ProductReveal section

**Files:**
- Create: `src/components/marketing/ThemeStrip.astro`
- Modify: `src/pages/index.astro` (to add ThemeStrip after ProductReveal)

**Step 1: Create ThemeStrip component**

This shows a row of small screenshots demonstrating different color themes. We'll use `settings-theme.png` as the main image and the home screenshot repeated with CSS filter overlays to simulate different theme looks. Actually, better approach: use the `settings-theme.png` which shows the theme picker UI.

Create `src/components/marketing/ThemeStrip.astro`:

```astro
---
import { Image } from 'astro:assets';
import themeImg from '../../assets/images/screenshots/settings-theme.png';

const themes = [
  { name: 'Nord', color: '#81A1C1' },
  { name: 'Catppuccin', color: '#CBA6F7' },
  { name: 'Dracula', color: '#BD93F9' },
  { name: 'Gruvbox', color: '#D79921' },
  { name: 'Tokyo Night', color: '#7AA2F7' },
  { name: 'Rose Pine', color: '#C4A7E7' },
  { name: 'Solarized', color: '#268BD2' },
  { name: 'Everforest', color: '#A7C080' },
];
---

<div class="flex flex-col items-center mt-8">
  <p class="text-text-muted text-sm mb-4">16 built-in themes, dark & light</p>
  <div class="flex flex-wrap justify-center gap-3">
    {themes.map((theme) => (
      <div class="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full">
        <span class="w-2.5 h-2.5 rounded-full" style={`background-color: ${theme.color};`}></span>
        <span class="text-text-secondary text-xs font-heading">{theme.name}</span>
      </div>
    ))}
  </div>
</div>
```

**Step 2: Add ThemeStrip to index.astro after ProductReveal**

In `src/pages/index.astro`, import ThemeStrip and place it right after the ProductReveal component:

```astro
import ThemeStrip from '../components/marketing/ThemeStrip.astro';
```

Place `<ThemeStrip />` right after the closing `/>` of `<ProductReveal />`.

**Step 3: Verify in browser, commit**

```bash
git add src/components/marketing/ThemeStrip.astro src/pages/index.astro
git commit -m "feat: add theme strip showing 16 color themes"
```

---

## Task 5: Update StatsStrip with new numbers (5 stats)

**Files:**
- Modify: `src/components/marketing/StatsStrip.astro`

**Step 1: Update the stats array**

Change the `stats` array to:
```javascript
const stats = [
  { value: '~10 MB', label: 'RAM footprint' },
  { value: '31', label: 'Panels' },
  { value: '16', label: 'Themes' },
  { value: '63', label: 'Printer profiles' },
  { value: '5', label: 'AMS backends' },
];
```

**Step 2: Update grid to 5 columns on desktop**

Change `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-5` on the grid div.

**Step 3: Add scroll animation class**

Add `animate-on-scroll` class to each stat div.

**Step 4: Commit**

```bash
git add src/components/marketing/StatsStrip.astro
git commit -m "feat(stats): update to 31 panels, 16 themes, 63 printers, 5 AMS backends"
```

---

## Task 6: Update existing FeatureStory content and add 4 new feature sections

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Import new screenshot images**

Add these imports to the frontmatter of `index.astro`:
```javascript
import settingsThemeImg from '../assets/images/screenshots/settings-theme.png';
import controlsImg from '../assets/images/screenshots/controls.png';
import advancedHistoryImg from '../assets/images/screenshots/advanced-history.png';
import advancedSpoolmanImg from '../assets/images/screenshots/advanced-spoolman.png';
import controlsPidImg from '../assets/images/screenshots/controls-pid.png';
```

**Step 2: Update existing feature copy**

Update the AMS section:
- Title: `"Multi-material, mastered"` (was "simplified")
- Body: `"The most complete multi-material support in any touchscreen UI. Five backends — Happy Hare, AFC Box Turtle, tool changers, ValgACE, and more. 3D tube rendering for filament paths, animated toolheads, buffer health monitoring, and per-slot context menus. Every system, one beautiful interface."`

Update the Calibration section:
- Body: `"Input shaper with interactive frequency response charts, PID tuning with live temperature graphs, Prusa-style Z-offset with animated visual meter, screws tilt with color-coded turn directions, and automatic probe detection for Cartographer, Beacon, Tap, BLTouch, and more."`

**Step 3: Add 4 new FeatureStory sections after Calibration**

After the Calibration FeatureStory, add:

```astro
<!-- Feature story: Themes -->
<FeatureStory
  image={settingsThemeImg}
  alt="Theme selector showing 16 color themes with dark and light variants"
  title="Make it yours"
  body="16 built-in color themes — Nord, Catppuccin, Dracula, Gruvbox, and more — each with dark and light variants. Switch themes live with no restart. Adjust brightness, customize your home panel widgets, and make HelixScreen feel like home."
  reversed
/>

<!-- Feature story: LED & Lighting -->
<FeatureStory
  image={controlsImg}
  alt="Controls panel showing LED lighting options and device management"
  title="Light up your build"
  body="Five lighting backends: Klipper native LEDs, output pins, WLED network strips, animated led_effects, and macro-controlled devices. Set up auto-state lighting so your LEDs change with your printer — idle, heating, printing, paused, error, and complete — all configurable per state."
/>

<!-- Feature story: Spoolman & Filament -->
<FeatureStory
  image={advancedSpoolmanImg}
  alt="Spoolman spool management with filament database"
  title="Know your filament"
  body="Full Spoolman integration with a 3-step spool creation wizard, 48 built-in material profiles with temperature ranges and drying parameters, weight polling, and a 3D spool visualization. Assign spools to AMS slots, track consumption, and get material compatibility warnings."
  reversed
/>

<!-- Feature story: Print History & Timelapse -->
<FeatureStory
  image={advancedHistoryImg}
  alt="Print history dashboard showing statistics and trends"
  title="Track every print"
  body="A full print history dashboard with total prints, success rate, print time, and filament usage statistics. Moonraker-Timelapse integration with per-layer and hyperlapse modes, auto-rendering, and video management — all from the touchscreen."
/>
```

**Step 4: Verify all 8 feature stories render correctly, commit**

```bash
git add src/pages/index.astro
git commit -m "feat: update feature copy, add themes/LED/spoolman/history sections"
```

---

## Task 7: Update PrinterConstellation platforms

**Files:**
- Modify: `src/components/marketing/PrinterConstellation.astro`

**Step 1: Update the platforms array**

Replace the `platforms` array with:
```javascript
const platforms = [
  { name: 'Raspberry Pi 3/4/5', arch: 'armv7l / aarch64' },
  { name: 'FlashForge AD5M', arch: 'armv7l' },
  { name: 'Creality K1 Series', arch: 'aarch64' },
  { name: 'QIDI', arch: 'aarch64' },
  { name: 'SOVOL', arch: 'aarch64' },
  { name: 'Elegoo CC1', arch: 'aarch64' },
];
```

**Step 2: Update grid to handle 6 platforms**

Change `grid-cols-1 sm:grid-cols-3` to `grid-cols-2 sm:grid-cols-3` on the platform badges grid.

**Step 3: Commit**

```bash
git add src/components/marketing/PrinterConstellation.astro
git commit -m "feat(printers): expand platform badges to 6 platforms"
```

---

## Task 8: Create Community section component

**Files:**
- Create: `src/components/marketing/Community.astro`
- Modify: `src/pages/index.astro`

**Step 1: Create Community.astro**

```astro
---
---
<section class="py-14 md:py-20 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="font-heading text-2xl md:text-4xl font-medium text-text-primary mb-4">
      Built by makers, for makers
    </h2>
    <p class="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto mb-10">
      HelixScreen is open source and shaped by the 3D printing community. Feature requests, bug reports, and contributions drive every release.
    </p>

    <div class="flex flex-wrap justify-center gap-4">
      <a
        href="https://discord.gg/rZ9dB74V"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-ghost"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="shrink-0">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
        </svg>
        Join Discord
      </a>
      <a
        href="https://github.com/prestonbrown/helixscreen"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-ghost"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="shrink-0">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
        </svg>
        View on GitHub
      </a>
      <a
        href="https://github.com/prestonbrown/helixscreen/discussions"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-ghost"
      >
        Discussions
      </a>
    </div>
  </div>
</section>
```

**Step 2: Add Community to index.astro**

Import and place between InstallBlock and Footer:

```astro
import Community from '../components/marketing/Community.astro';
```

Place `<Community />` after `<InstallBlock />` and before `<Footer />`.

**Step 3: Commit**

```bash
git add src/components/marketing/Community.astro src/pages/index.astro
git commit -m "feat: add community section with Discord, GitHub, Discussions links"
```

---

## Task 9: Update Footer and SiteNav with correct doc links

**Files:**
- Modify: `src/components/marketing/Footer.astro`
- Modify: `src/components/marketing/SiteNav.astro`

**Step 1: Update Footer doc links**

Replace the Docs `<ul>` contents with:
```html
<li><a href="/docs/installation/" class="...">Installation</a></li>
<li><a href="/docs/guide/getting-started/" class="...">Getting Started</a></li>
<li><a href="/docs/reference/configuration/" class="...">Configuration</a></li>
<li><a href="/docs/reference/troubleshooting/" class="...">Troubleshooting</a></li>
```

Add Discord to the Community section:
```html
<li>
  <a href="https://discord.gg/rZ9dB74V" target="_blank" rel="noopener noreferrer" class="...">
    Discord
  </a>
</li>
```

Update the tagline column text to: `"Built by makers, for makers."`

**Step 2: Update SiteNav links**

In SiteNav.astro, update all `/getting-started/overview/` hrefs to `/docs/installation/`.
Remove the Gallery link (page doesn't exist yet).

**Step 3: Commit**

```bash
git add src/components/marketing/Footer.astro src/components/marketing/SiteNav.astro
git commit -m "fix: update nav and footer links to new docs routes"
```

---

## Task 10: Update VisualComparison — remove dead link

**Files:**
- Modify: `src/components/marketing/VisualComparison.astro`

**Step 1: Remove the "Full comparison" link**

Remove the `<div class="text-center">` block at the bottom that links to `/compare` (page doesn't exist).

**Step 2: Commit**

```bash
git add src/components/marketing/VisualComparison.astro
git commit -m "fix: remove dead /compare link from visual comparison"
```

---

## Task 11: Add scroll animation JavaScript to MarketingLayout

**Files:**
- Modify: `src/layouts/MarketingLayout.astro`

**Step 1: Add IntersectionObserver script**

Add before the closing `</body>` tag:

```html
<script>
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    observer.observe(el);
  });
</script>
```

**Step 2: Add `animate-on-scroll` classes to key sections**

In FeatureStory.astro, add `animate-on-scroll` to the outer `<section>`.
In StatsStrip.astro, add `animate-on-scroll` to the outer `<section>`.
In Community.astro, add `animate-on-scroll` to the outer `<section>`.
In PrinterConstellation.astro, add `animate-on-scroll` to the outer `<section>`.

**Step 3: Verify animations trigger on scroll, commit**

```bash
git add src/layouts/MarketingLayout.astro src/components/marketing/FeatureStory.astro src/components/marketing/StatsStrip.astro src/components/marketing/Community.astro src/components/marketing/PrinterConstellation.astro
git commit -m "feat: add scroll-triggered fade-in animations"
```

---

## Task 12: Build docs sync script

**Files:**
- Create: `scripts/sync-docs.sh`

**Step 1: Write the sync script**

The script needs to:
1. Find `../helixscreen/docs/user/` (error if not found)
2. Clean `src/content/docs/` (except any manually-created content)
3. For each doc file, determine Starlight sidebar group and order
4. Inject frontmatter with `title` (from first `#` heading) and sidebar config
5. Rewrite image paths: `../../images/user/foo.png` → `~/assets/images/docs/foo.png`
6. Rewrite internal links between docs to website routes
7. Copy referenced images to `src/assets/images/docs/`

Key mapping rules:
- `INSTALL.md` → `src/content/docs/installation.md` (sidebar: Installation, order 1)
- `UPGRADING.md` → `src/content/docs/upgrading.md` (sidebar: Installation, order 2)
- `guide/getting-started.md` → `src/content/docs/guide/getting-started.md` (order 1)
- `guide/home-panel.md` → `guide/home-panel.md` (order 2)
- `guide/printing.md` → (order 3)
- `guide/temperature.md` → (order 4)
- `guide/motion.md` → (order 5)
- `guide/filament.md` → (order 6)
- `guide/calibration.md` → (order 7)
- `guide/advanced.md` → (order 8)
- `guide/tips.md` → (order 9)
- `guide/beta-features.md` → (order 10)
- `guide/settings.md` → `guide/settings/index.md` (order 1 in settings group)
- `guide/settings/*.md` → `guide/settings/*.md` (order 2-8)
- `CONFIGURATION.md` → `reference/configuration.md`
- `TROUBLESHOOTING.md` → `reference/troubleshooting.md`
- `FAQ.md` → `reference/faq.md`
- `PRIVACY_POLICY.md` → `legal/privacy.md`
- `TELEMETRY.md` → `legal/telemetry.md`

The script should strip the first `# Title` line from each file (since Starlight renders the frontmatter title) and rewrite markdown image references.

Skip `CLAUDE.md`, `USER_GUIDE.md` (hub page — the sidebar IS the hub), and `TESTING_INSTALLATION.md` (internal QA doc).

**Step 2: Make executable and test**

```bash
chmod +x scripts/sync-docs.sh
./scripts/sync-docs.sh
```

Verify files appear in `src/content/docs/` with correct frontmatter.

**Step 3: Commit**

```bash
git add scripts/sync-docs.sh
git commit -m "feat: add docs sync script to pull user docs from helixscreen"
```

---

## Task 13: Update Astro config for docs sidebar

**Files:**
- Modify: `astro.config.mjs`

**Step 1: Update Starlight sidebar configuration**

Replace the `sidebar` array with:

```javascript
sidebar: [
  {
    label: 'Installation',
    items: [
      { label: 'Install', slug: 'installation' },
      { label: 'Upgrading', slug: 'upgrading' },
    ],
  },
  {
    label: 'User Guide',
    autogenerate: { directory: 'guide' },
  },
  {
    label: 'Reference',
    autogenerate: { directory: 'reference' },
  },
  {
    label: 'Legal',
    autogenerate: { directory: 'legal' },
  },
],
```

**Step 2: Remove old getting-started content**

Delete `src/content/docs/getting-started/overview.md` (the old stub).

**Step 3: Run sync script and verify**

```bash
./scripts/sync-docs.sh
npm run dev
```

Navigate to `/docs/installation/` and verify Starlight renders the docs correctly with the sidebar.

**Step 4: Commit synced docs and config**

```bash
git add astro.config.mjs src/content/docs/
git rm src/content/docs/getting-started/overview.md
git commit -m "feat: configure Starlight sidebar, sync docs from helixscreen"
```

---

## Task 14: Add `sync-docs` npm script and update build pipeline

**Files:**
- Modify: `package.json`

**Step 1: Add sync-docs script**

Add to `scripts`:
```json
"sync-docs": "./scripts/sync-docs.sh",
"prebuild": "./scripts/sync-docs.sh"
```

This ensures docs are always synced before a production build.

**Step 2: Commit**

```bash
git add package.json
git commit -m "build: add sync-docs script, auto-sync on build"
```

---

## Task 15: Full visual verification and final polish

**Step 1: Run dev server and verify every section**

```bash
npm run dev
```

Walk through the entire page:
- [ ] Hero: gradient text, bold type, correct CTAs
- [ ] ProductReveal + ThemeStrip: screenshot with theme pills below
- [ ] StatsStrip: 5 updated stats
- [ ] 8 Feature Stories: alternating layout, correct images and copy
- [ ] VisualComparison: no dead link
- [ ] PrinterConstellation: 6 platform badges
- [ ] InstallBlock: terminal with correct command
- [ ] Community: Discord, GitHub, Discussions buttons
- [ ] Footer: correct doc links, Discord in community column
- [ ] SiteNav: links to /docs/installation/, no Gallery link
- [ ] Scroll animations: sections fade in on scroll
- [ ] Docs: navigate to /docs/installation/ and verify sidebar + content

**Step 2: Run production build**

```bash
npm run build
```

Fix any build errors.

**Step 3: Commit any final fixes**

```bash
git add -p  # stage selectively
git commit -m "fix: final polish and build fixes"
```
