# HelixScreen Website Major Overhaul — Design

**Date**: 2026-02-23
**Status**: Approved

## Context

The helixscreen project has grown massively since the initial website draft (3 commits). The website is significantly behind: stats are stale, major features are missing, and a complete user documentation tree exists in `../helixscreen/docs/user/` that isn't surfaced at all. The site currently has only a landing page and a stub docs page.

## Goals

1. Overhaul the landing page with updated content, bolder branding, and new feature sections
2. Build a docs pipeline that syncs user documentation from the helixscreen source tree
3. Add visual polish: scroll animations, gradient text, theme showcase, animated stats

## Design Decisions

- **Tone**: Confident and bold, but community-rooted. "The touchscreen UI your printer deserves." Emphasize beauty, customization, flexibility, and community-driven development.
- **Docs sync**: Local build script (`scripts/sync-docs.sh`) that reads `../helixscreen/docs/user/`, adds Starlight frontmatter, rewrites paths, outputs to `src/content/docs/`. No submodules, no CI trigger yet.
- **Scope**: Landing page + docs only. No gallery page, compare page, blog, or developer docs.

## Docs Pipeline

### Source → Target Mapping

| Source (`../helixscreen/docs/user/`) | Website Path |
|--------------------------------------|-------------|
| `INSTALL.md` | `/docs/installation/` |
| `UPGRADING.md` | `/docs/upgrading/` |
| `guide/getting-started.md` | `/docs/guide/getting-started/` |
| `guide/home-panel.md` | `/docs/guide/home-panel/` |
| `guide/printing.md` | `/docs/guide/printing/` |
| `guide/temperature.md` | `/docs/guide/temperature/` |
| `guide/motion.md` | `/docs/guide/motion/` |
| `guide/filament.md` | `/docs/guide/filament/` |
| `guide/calibration.md` | `/docs/guide/calibration/` |
| `guide/advanced.md` | `/docs/guide/advanced/` |
| `guide/settings.md` | `/docs/guide/settings/` |
| `guide/beta-features.md` | `/docs/guide/beta-features/` |
| `guide/tips.md` | `/docs/guide/tips/` |
| `guide/settings/appearance.md` | `/docs/guide/settings/appearance/` |
| `guide/settings/printer.md` | `/docs/guide/settings/printer/` |
| `guide/settings/notifications.md` | `/docs/guide/settings/notifications/` |
| `guide/settings/motion.md` | `/docs/guide/settings/motion/` |
| `guide/settings/system.md` | `/docs/guide/settings/system/` |
| `guide/settings/help-about.md` | `/docs/guide/settings/help-about/` |
| `guide/settings/led-settings.md` | `/docs/guide/settings/led-settings/` |
| `CONFIGURATION.md` | `/docs/reference/configuration/` |
| `TROUBLESHOOTING.md` | `/docs/reference/troubleshooting/` |
| `FAQ.md` | `/docs/reference/faq/` |
| `PRIVACY_POLICY.md` | `/docs/legal/privacy/` |
| `TELEMETRY.md` | `/docs/legal/telemetry/` |

### Sync Script Responsibilities

1. Read each source markdown file
2. Extract or generate title from first `#` heading
3. Add Starlight-compatible frontmatter (`title`, `sidebar` label/order)
4. Rewrite image paths: `../../images/user/foo.png` → import from `~/assets/images/docs/foo.png`
5. Rewrite internal doc links to website routes
6. Copy referenced images to `src/assets/images/docs/`
7. Write transformed markdown to `src/content/docs/`

### Starlight Sidebar Structure

```
- Installation
- Upgrading
- Guide
  - Getting Started
  - Home Panel
  - Printing
  - Temperature
  - Motion
  - Filament
  - Calibration
  - Advanced
  - Tips
  - Beta Features
  - Settings (group)
    - Appearance
    - Printer
    - Notifications
    - Motion
    - System
    - Help & About
    - LED Settings
- Reference
  - Configuration
  - Troubleshooting
  - FAQ
- Legal
  - Privacy Policy
  - Telemetry
```

## Landing Page

### Hero
- Headline: "The touchscreen UI your printer deserves."
- Subline: "Beautiful, customizable, and community-driven. Open source, built for every Klipper printer."
- CTAs: Get Started, View on GitHub
- Full viewport, animated mesh background (keep), gradient text on headline, bolder type

### Product Reveal + Theme Strip
- Large home panel screenshot with glow (existing)
- Below: row of 5-6 mini-screenshots showing different color themes (Nord, Catppuccin, Dracula, Gruvbox, Tokyo Night, Rose Pine)
- Communicates customization immediately

### Stats Strip (updated)
- `~10 MB` RAM footprint
- `31` Panels
- `16` Themes
- `63` Printer Profiles
- `5` AMS Backends

### Feature Stories (8 sections, alternating image-left/right)

1. **Bed Mesh** — "See your bed like never before" — 3D interactive visualization, touch rotation, gradient coloring
2. **Print Browser** — "Every file, ready to print" — 3D thumbnails, metadata, sorting, card/list view
3. **Multi-Material** (expanded) — "Multi-material, mastered" — 5 backends (Happy Hare, AFC, Tool Changers, ValgACE, mock), 3D tube rendering, animated toolheads, buffer health, per-slot context menus, bypass spool
4. **Calibration** — "Calibrate everything" — input shaper with frequency charts, PID with live graph, Z-offset with Prusa-style meter, screws tilt with color-coded turns, probe auto-detection
5. **Themes** — "Make it yours" — 16 themes, dark/light variants, live switching, brightness slider, theme grid showcase
6. **LED & Lighting** — "Light up your build" — 5 backends (Klipper, output pin, WLED, led_effect, macro), auto-state lighting (6 printer states), configurable per state
7. **Spoolman & Filament** — "Know your filament" — 48 built-in materials, full Spoolman integration, 3-step spool wizard, weight polling, 3D spool visualization
8. **Print History & Timelapse** — "Track every print" — dashboard stats, success rate, trend graphs, timelapse rendering with per-layer/hyperlapse modes

### Visual Comparison (refreshed)
- Side-by-side: HelixScreen screenshot vs. fake traditional heatmap
- Stats: `~10 MB` vs `50+ MB` | `Declarative XML` vs `Imperative code` | `Active development` vs `Maintenance mode`

### Printer Constellation (expanded)
- All 63 printer profile icons
- Featured: Voron, Creality, FlashForge, Anycubic, RatRig, Prusa
- Platform badges: Raspberry Pi 3/4/5, Creality K1, FlashForge AD5M, QIDI, SOVOL, Elegoo

### Install Block
- Terminal-style with copyable command
- Platform badges or notes for AD5M (firmware image), K1 (Simple AF), KIAUH extension

### Community Section (new)
- Discord invite link
- GitHub repo + discussions
- "Built by makers, for makers" messaging
- Contributor acknowledgment

### Footer (updated)
- All doc links point to real pages
- Community column: Discord, GitHub, Discussions
- Legal column: Privacy, Telemetry, License (GPL-3.0)

## Visual Improvements

- **Gradient text**: CSS `background-clip: text` on hero headline
- **Scroll animations**: CSS `@keyframes` fade-in-up, triggered by IntersectionObserver. No JS animation library.
- **Screenshot hover**: `transform: scale(1.02)` + enhanced glow on hover
- **Animated stats**: Counter animation on scroll into view (vanilla JS, IntersectionObserver)
- **Theme grid**: CSS grid of 4-6 theme screenshots with subtle border and hover effect

## Out of Scope

- Gallery page
- Compare page
- Blog / changelog
- Developer documentation
- Android download links (not ready)
- Multi-language / i18n
