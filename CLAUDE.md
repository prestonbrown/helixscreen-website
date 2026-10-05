# helixscreen-website

Astro + Starlight documentation site for [helixscreen.org](https://helixscreen.org).

## Architecture

- **Framework:** Astro 7.3 + Starlight 0.42 (static docs site generator)
- **Styling:** Tailwind CSS v4, two typefaces (IBM Plex Sans for all prose, headings and UI chrome; IBM Plex Mono for anything measurable). Headings differ from body by weight and tracking, not by face.
- **Theme:** 18 themes generated from the app's own theme files, each with dark mode and, where the theme defines it, light mode. Chosen at runtime via the switcher, persisted to `localStorage`, and applied to both the marketing site and the docs pages.
- **Search:** Pagefind (built-in with Starlight, indexes all pages at build time)
- **Hosting:** Cloudflare Pages, deployed by `.github/workflows/deploy.yml` (auto-deploys on push to main, on `repository_dispatch` from helixscreen releases, or via `workflow_dispatch`)

## Source of Truth

**User docs live in the helixscreen repo** at `../helixscreen/docs/user/`. This website consumes them via a sync script. Never edit docs directly in `src/content/docs/` — they get overwritten on every sync.

## Versions

The site publishes one docs tree per helixscreen release line, via the
`starlight-versions` plugin. **`src/data/doc-versions.mjs` is the only place
versions are defined**: astro.config.mjs, sync-docs.sh, deploy.yml (through
`scripts/resolve-doc-refs.mjs`) and the /flash/ page all read it.

| Version | URL | Synced from |
|---|---|---|
| `current` (1.0, "1.0 (stable)") | plain URLs: `/installation/`, `/guide/...` | newest published `v1.0.*` release, not prerelease |
| `1.1` ("1.1 (beta)") | `/1.1/installation/`, `/1.1/guide/...` | newest published `v1.1.*` release, prereleases included; `main` if none |

A non-current version lives in `src/content/docs/<slug>/`, its images in
`src/assets/images/docs/<slug>/`, and its sidebar in
`src/content/versions/<slug>.json` (written by the sync from the shared sidebar,
filtered to that version's pages). Developer docs (`dev/`) are not versioned:
they sync once from the current version and every version links to them.

The plugin snapshots the current docs into a configured version whose directory
is missing. The sync always writes every version's directory, so that never
fires unless a version is skipped (see below) on a fresh tree.

**Promoting 1.1 to stable:** edit `src/data/doc-versions.mjs` as its header
comment says (current = 1.1, others = [1.0]), run `npm run sync-docs` with
`HELIX_DOCS_REF=<1.1 tag> HELIX_DOCS_REF_1_0=v1.0.<n>`, build, and commit the
config and the regenerated content together. The /flash/ guide link follows.

**Opening a new version:** append it to `others` in the same file.

## Sync Process

**Script:** `scripts/sync-docs.sh` (run by `prebuild`; `npm run sync-docs` alone)

For each version, copies markdown from helixscreen `docs/user/` into that
version's directory, transforming each file:
1. Strips the first `#` heading (Starlight uses frontmatter title instead)
2. Adds YAML frontmatter with `title` and `sidebar.order` (plus `slug: <version>/...` for a non-current version, since the content layer would turn `1.1` into `11`)
3. Rewrites image paths (`../../images/user/foo.png` → relative path into that version's image dir)
4. Rewrites internal links (`INSTALL.md` → `/installation/`, `guide/printing.md` → `/guide/printing/`; `/1.1/...` inside 1.1 pages). `/dev/` links stay at the root.
5. Copies images from `docs/images/user/` and `docs/images/*.png`

Where each version's source comes from:

| Situation | Current version | Other versions |
|---|---|---|
| `HELIX_DOCS_REF` / `HELIX_DOCS_REF_<slug>` set (CI) | `git archive <ref> docs` from `../helixscreen` | same |
| Unset (local dev) | `../helixscreen` working tree | newest local tag with the version's prefix, else its fallback ref; if neither resolves, the version keeps its committed content and the script warns |

The generated content is committed. To regenerate it exactly as production:
```bash
eval "$(node scripts/resolve-doc-refs.mjs | sed 's/^/export /')" && npm run sync-docs
```

### File Mapping

The FILES array in sync-docs.sh defines each mapping, relative to a version's root, as:
```
"source_rel|dest_rel|title|order|depth"
```

Key mappings:
| Source (helixscreen) | Destination (website) | Notes |
|---|---|---|
| `USER_GUIDE.md` | `guide/index.md` | Docs landing page (`/` is the marketing page) |
| `INSTALL.md` | `installation.md` | |
| `guide/*.md` | `guide/*.md` | 1:1 mapping |
| `guide/settings.md` | `guide/settings/index.md` | Settings hub |
| `guide/settings/*.md` | `guide/settings/*.md` | 1:1 mapping; 1.0 and 1.1 have different pages |
| `CONFIGURATION.md` | `reference/configuration.md` | |
| `TROUBLESHOOTING.md` | `reference/troubleshooting.md` | |
| `FAQ.md` | `reference/faq.md` | |
| `PRIVACY_POLICY.md` | `legal/privacy.md` | |
| `TELEMETRY.md` | `legal/telemetry.md` | |

A FILES entry whose source is missing in a version is skipped for that version.

### Adding New Docs

When a new doc page is added to `../helixscreen/docs/user/`:
1. Add an entry to the `FILES` array in `scripts/sync-docs.sh`
2. Add an explicit sidebar item in `src/data/docs-sidebar.mjs` (sidebar is NOT auto-generated)
3. Run sync + build to verify

## Sidebar Configuration

**File:** `src/data/docs-sidebar.mjs`: explicit sidebar items (not `autogenerate`),
shared by every version. Each consumer drops the items whose page a version
lacks (`presentSidebar`), because Starlight fails the build on a sidebar slug
with no page.

## Theme and version pickers

Starlight's `ThemeSelect` slot is `src/components/DocsThemeSelect.astro`: the
plugin's `VersionSelect` followed by `ThemeSwitcher`. The plugin logs a warning
at build time that a ThemeSelect override exists; that is expected, since the
override renders its picker. The plugin's Search, Banner and PageTitle overrides
are used as shipped. `src/content/i18n/en.json` rewords its "latest version"
notice, which would be wrong on beta pages. The marketing site search
(`SiteSearch.astro`) is filtered to the current version.

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

Deploys are automated via `.github/workflows/deploy.yml`. Triggers:

| Trigger | When |
|---|---|
| `push` to `main` | Every commit to this repo. Every version is rebuilt from its newest published release (see Versions), so the root always documents the version people can install. |
| `repository_dispatch` (event `helixscreen-release`) | A helixscreen release (`notify-website` job in helixscreen's `release.yml`). Re-resolves every version; the payload's ref is not used. |
| `workflow_dispatch` | Manual run from the Actions tab, optionally pinning refs per version (`refs` input, e.g. `1.0=main 1.1=main`) |

Required secrets on this repo: `CLOUDFLARE_API_TOKEN` (Pages:Edit) and `CLOUDFLARE_ACCOUNT_ID`.

### Manual deploy (escape hatch)

If CI is broken or you need to push a hotfix immediately:

```bash
npx wrangler pages deploy dist --project-name helixscreen-website
```

Requires a local `wrangler login`.

## Full Update Workflow (typical)

```bash
# 1. Edit docs in helixscreen repo (../helixscreen/docs/user/)
# 2. Commit and push helixscreen repo — these changes appear on helixscreen.org
#    on the next stable release tag (via repository_dispatch).

# A push to this repo rebuilds the site from the newest stable release, so it
# picks up website changes without pulling in unreleased docs.
#
# To preview unreleased docs from helixscreen main, pin a version's ref explicitly:
gh workflow run deploy.yml -R prestonbrown/helixscreen-website -f refs='1.1=main'
```

## Other Cloudflare Projects

| Project | Domain | Purpose |
|---|---|---|
| `helixscreen-website` | helixscreen.org | This site |
| `helixscreen-analytics` | analytics.helixscreen.org | Analytics dashboard |

## Directory Structure

```
helixscreen-website/
├── astro.config.mjs          # Starlight config, versions plugin, social links
├── scripts/sync-docs.sh      # Doc sync from helixscreen repo, per version
├── scripts/resolve-doc-refs.mjs # Which helixscreen ref each version builds from
├── src/
│   ├── assets/images/        # Logo, doc screenshots
│   ├── components/           # ThemeSwitcher, DocsThemeProvider, landing page components
│   ├── content/docs/         # Synced documentation (DO NOT EDIT — overwritten by sync); 1.1/ = beta docs
│   ├── content/versions/     # Per-version sidebars (generated by sync)
│   ├── data/doc-versions.mjs # The docs versions (edit to promote a version)
│   ├── data/docs-sidebar.mjs # Sidebar shared by every version
│   └── styles/               # Custom Starlight CSS
├── public/                   # Static assets (favicon, etc.)
└── dist/                     # Build output (deployed to Cloudflare)
```
