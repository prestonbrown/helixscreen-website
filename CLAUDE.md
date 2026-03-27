# helixscreen-website

Astro + Starlight documentation site for [helixscreen.org](https://helixscreen.org).

## Architecture

- **Framework:** Astro 5.17 + Starlight 0.37 (static docs site generator)
- **Styling:** Tailwind CSS v4, custom fonts (Space Grotesk headings, IBM Plex Sans body, IBM Plex Mono code)
- **Theme:** Forced dark mode only (no light toggle) via `ForceDarkTheme.astro` component
- **Search:** Pagefind (built-in with Starlight, indexes all pages at build time)
- **Hosting:** Cloudflare Pages (manual deploy, NOT auto-deploy on push)

## Source of Truth

**User docs live in the helixscreen repo** at `../helixscreen/docs/user/`. This website consumes them via a sync script. Never edit docs directly in `src/content/docs/` — they get overwritten on every sync.

## Sync Process

**Script:** `scripts/sync-docs.sh`

Copies markdown from `../helixscreen/docs/user/` → `src/content/docs/`, transforming each file:
1. Strips the first `#` heading (Starlight uses frontmatter title instead)
2. Adds YAML frontmatter with `title` and `sidebar.order`
3. Rewrites image paths (`../../images/user/foo.png` → relative asset path)
4. Rewrites internal links (`INSTALL.md` → `/docs/installation/`, `guide/printing.md` → `/docs/guide/printing/`, etc.)
5. Copies images from `../helixscreen/docs/images/user/` → `src/assets/images/docs/`

The script is idempotent — cleans output dirs and rebuilds from scratch each run.

### File Mapping

30 files synced. The FILES array in sync-docs.sh defines each mapping as:
```
"source_rel|dest_rel|title|order|depth"
```

Key mappings:
| Source (helixscreen) | Destination (website) | Notes |
|---|---|---|
| `USER_GUIDE.md` | `index.md` | Docs landing page |
| `INSTALL.md` | `installation.md` | |
| `guide/*.md` | `guide/*.md` | 1:1 mapping |
| `guide/settings.md` | `guide/settings/index.md` | Settings hub |
| `guide/settings/*.md` | `guide/settings/*.md` | 1:1 mapping |
| `CONFIGURATION.md` | `reference/configuration.md` | |
| `TROUBLESHOOTING.md` | `reference/troubleshooting.md` | |
| `FAQ.md` | `reference/faq.md` | |
| `PRIVACY_POLICY.md` | `legal/privacy.md` | |
| `TELEMETRY.md` | `legal/telemetry.md` | |

### Adding New Docs

When a new doc page is added to `../helixscreen/docs/user/`:
1. Add an entry to the `FILES` array in `scripts/sync-docs.sh`
2. Add an explicit sidebar item in `astro.config.mjs` (sidebar is NOT auto-generated)
3. Run sync + build to verify

## Sidebar Configuration

**File:** `astro.config.mjs` — uses explicit sidebar items (not `autogenerate`)

Sections in order:
1. **Installation** — Install, Upgrading
2. **User Guide** — Getting Started → Home → Printing → Temperature → Motion → Filament → Calibration → Advanced → Beta → Tips
3. **Settings** — Overview + 7 sub-pages (Appearance, Printer, Notifications, Motion, System, Help & About, LED)
4. **Platform Guides** — K1C, Bluetooth, Label Printing, Touch Calibration
5. **Reference** — Configuration, Troubleshooting, FAQ
6. **Legal** — Privacy, Telemetry

## Build

```bash
npm run build
```

The `prebuild` script runs `sync-docs.sh` automatically before building. Output goes to `dist/`.

To build without sync (if you already synced manually):
```bash
npx astro build
```

## Deploy

**Cloudflare Pages project:** `helixscreen-website`
**Domains:** helixscreen.org, www.helixscreen.org, helixscreen-website.pages.dev

```bash
npx wrangler pages deploy dist --project-name helixscreen-website
```

Requires Cloudflare authentication (wrangler login).

## Full Update Workflow

```bash
# 1. Edit docs in helixscreen repo (../helixscreen/docs/user/)
# 2. Commit and push helixscreen repo

# 3. Sync, build, and deploy
cd /path/to/helixscreen-website
bash scripts/sync-docs.sh        # or just 'npm run build' (runs sync as prebuild)
npm run build                     # builds static site to dist/
git add -A && git commit -m "docs: sync updated user documentation"
git push
npx wrangler pages deploy dist --project-name helixscreen-website
```

## Other Cloudflare Projects

| Project | Domain | Purpose |
|---|---|---|
| `helixscreen-website` | helixscreen.org | This site |
| `helixscreen-analytics` | analytics.helixscreen.org | Analytics dashboard |

## Directory Structure

```
helixscreen-website/
├── astro.config.mjs          # Starlight config, sidebar, social links
├── scripts/sync-docs.sh      # Doc sync from helixscreen repo
├── src/
│   ├── assets/images/        # Logo, doc screenshots
│   ├── components/           # ForceDarkTheme, EmptyComponent, landing page components
│   ├── content/docs/         # Synced documentation (DO NOT EDIT — overwritten by sync)
│   └── styles/               # Custom Starlight CSS
├── public/                   # Static assets (favicon, etc.)
└── dist/                     # Build output (deployed to Cloudflare)
```
