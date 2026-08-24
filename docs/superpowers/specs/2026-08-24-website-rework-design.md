# helixscreen.org rework — design

**Date:** 2026-08-24
**Status:** approved direction, pending spec review
**Target:** landing page live ahead of HelixScreen 1.0; docs and new pages follow

## Why

The site reads as machine-generated on sight. That is a credibility problem for a
project whose main asset is that one person wrote 11,569 of its 11,778 commits by
hand. The goal is a site that a visitor never suspects was generated, that works as
marketing, reference, and a way to reach the author.

The bones stay: Astro 5 + Starlight, the `sync-docs.sh` pipeline, Pagefind, the
existing screenshots, Cloudflare Pages deploys. The art direction, the copy, and the
page inventory change.

### What currently gives it away

Catalogued so the rework can be checked against it:

- Gradient-filled headline text (`.gradient-text`), the single most recognisable tell.
- Animated drifting triangle mesh (`.mesh-bg` + `mesh-drift`), a radial vignette, a
  bouncing chevron scroll indicator — three decorations that carry no meaning.
- A blue radial glow behind every screenshot (`.screenshot-glow`) compensating for a
  contrast problem the dark ground created.
- Eight consecutive `FeatureStory` blocks in identical alternating 3/5–2/5 grids, each
  with a 3–5 word title and a 38–45 word paragraph, each fading in 24px over 0.6s.
  The rhythm is metronomic.
- Copy tells: "Beautiful, customizable, community-driven" (list of three);
  "Multi-material, mastered" (noun, past-participle); "The touchscreen UI your printer
  deserves"; "Built by makers, for makers" — which appears twice, once as a section
  heading and again as an italic pull-quote in the footer.
- Vanity statistics — counts of the project's own features presented as evidence.
- Space Grotesk, the default heading face of generated landing pages.
- No author anywhere, and no way to contact one.

## Voice

First person singular. The author stays in sublines, margins, captions and the
colophon, never in an `h1` — he does not want to be the subject of the site, and the
product carries the headline.

The origin story is real and is used verbatim in substance: the Adventurer 5M Pro ran
Klipper mod with GuppyScreen, which could report that a bed mesh existed but could not
draw it. He wrote a panel that renders one in 3D and lets you spin it with a finger.
Things snowballed. Ten months and 11,778 commits later it is a complete touch
interface reaching 1.0.

### Copy rules

These are binding on every page.

- No setup-payoff headlines. Nothing that withholds and promises a payoff.
  "Ten months later this is what happened" is banned by name; it is engagement-farm
  grammar and it was spotted instantly in review.
- Every headline is a complete sentence that could only be about this project.
- No lists of three, in prose or in adjectives.
- No em-dash-joined adjective pileups.
- Numbers carry a source or do not appear. `~15 MB` is resident set size on armv7 and
  is described as such.
- Rough edges are stated where a reader would be misled without them — the FAQ's
  existing "ultrawide and portrait are alpha at best, it will run, don't expect it to
  look right" is the model. This is not self-flagellation and does not get its own
  section; it appears in the comparison table and in the docs where it already lives.
- Banned outright: "beautiful, customizable, community-driven", "built by makers, for
  makers", "your printer deserves", "mastered", "seamless", "effortless", "unleash".

## Design system

### Tokens

The site adopts HelixScreen's own theme token schema rather than inventing a parallel
one. Token names match the app: `screen_bg`, `overlay_bg`, `card_bg`, `elevated_bg`,
`border`, `text`, `text_muted`, `text_subtle`, `primary`, `secondary`, `tertiary`,
`info`, `success`, `warning`, `danger`, `focus`.

Structural values come from the same JSON and are not re-decided here:

- `border_width: 1` — hairline borders everywhere.
- `border_radius_size: 3` — 3px radius, nothing rounder.
- `shadow_intensity: 0` — **no shadows and no glows, anywhere, ever.**

**Default theme: HelixScreen Dark**, which is the app's real default
(`include/theme_loader.h:22`, `DEFAULT_THEME = "helixscreen"`).

Because that palette is close to the current site's, colour does none of the work of
distinguishing the rework. The structure, rhythm and copy carry all of it. Screenshot
separation is solved with tokens rather than decoration: screenshots sit on a
`card_bg` (`#202023`) plinth against `screen_bg` (`#19191C`) with a 1px `border`
(`#36363C`).

### Typography

| Role | Face |
|---|---|
| Prose, display | Source Serif 4 (`@fontsource/source-serif-4`) |
| UI chrome, labels, nav | IBM Plex Sans (already a dependency) |
| Anything measurable | IBM Plex Mono (already a dependency) |

Space Grotesk is removed and `@fontsource/space-grotesk` dropped from
`package.json`. Every number that can be compared against another number is set in
Mono with `font-variant-numeric: tabular-nums`.

### Deleted

`.gradient-text`, `.mesh-bg`, `mesh-drift`, `.hero-gradient`, `.screenshot-glow`,
`.scroll-indicator` and `fade-bounce`, the gradient fills and translate-on-hover of
`.btn-primary`, the blanket `.animate-on-scroll` treatment, and the fake macOS traffic
lights on the install block.

Motion that survives must be tied to a state change the user caused. Decorative
ambient motion does not survive.

## Theme system

The differentiator, and it is nearly free because the palettes are already authored.

**Generation.** A new `scripts/gen-themes.mjs` reads
`../helixscreen/assets/config/themes/defaults/*.json` and emits
`src/styles/themes.generated.css` as `:root[data-theme="…"][data-mode="…"]` blocks of
custom properties. It runs from `prebuild`, alongside `sync-docs.sh`, and resolves the
sibling repo by the same path — CI already provides it, since `deploy.yml:61` symlinks
the `prestonbrown/helixscreen` checkout to `../helixscreen` before `npm run build`.
The generated file is committed as well, so `npx astro build` works locally without the
sibling repo present.

**Switching.** A control in the site header lists every theme with its mode variants.
Selection writes `data-theme` and `data-mode` to `<html>` and persists to
`localStorage`. A small inline script in `<head>` applies the stored value before
first paint so there is no flash. Themes with only one mode (Dracula, Hazard,
Midnight, Yami are dark-only) present only that mode.

**Reach.** The switcher applies to docs pages too. `ForceDarkTheme.astro` is removed
and Starlight's `ThemeSelect` slot takes the new control instead of `EmptyComponent`.
Starlight's `--sl-color-*` variables map onto the token set so docs inherit themes
without a second palette definition.

**Count.** The authoritative number is **18** — `assets/config/themes/defaults/` holds
18 JSON files, and helixscreen's own `docs/user/FAQ.md:298` already says 18. The site is
the only thing that disagrees, claiming 16 in `ThemeStrip.astro` and 17 everywhere else,
both wrong. The site must derive the count from `themes.generated.css` at build time
rather than hardcode it, so it cannot drift again.

## Information architecture

| Route | State | Purpose |
|---|---|---|
| `/` | rebuilt | Landing |
| `/printers/` | new | Filterable compatibility table over the 80+ model database |
| `/whats-new/` | new | 1.0 notes, then ongoing; generated from `CHANGELOG.md` |
| `/contact/` | new | Routed by intent |
| `/docs/**` | restyled | Starlight, retokenised; sidebar and Pagefind unchanged |

`/printers/` replaces the `PrinterConstellation` circles, which are decorative and do
not answer the question people actually arrive with. The landing page keeps a compact
strip that links to it.

## Landing page composition

Ordered so that no two adjacent sections share a shape. This is the fix for the
metronome, and it is a structural requirement, not a stylistic preference.

1. **Header** — brand, nav, theme switcher, version pill.
2. **Hero** — a marginalia rail (commit count, footprint, printer count, each with its
   unit) beside the headline, subline, a four-across spec grid on hairlines, and the
   install command. Headline: *"Everything your printer knows, on the screen it
   already has."*
3. **The origin figure** — the bed mesh panel, annotated in the author's voice.
4. **Comparison table** — against KlipperScreen and GuppyScreen, including the honest
   ultrawide/portrait row.
5. **Capability grid** — six dense cells, small screenshots.
6. **Spotlight** — one full-width section on multi-material, the deepest moat.
7. **Printers and platforms** — a table, linking to `/printers/`.
8. **Theme switcher demonstration** — recolours the page the reader is on.
9. **Install** — the command, and a link to the guide for people who won't pipe curl
   to sh.
10. **Get in touch** — routed by intent.
11. **Colophon** — quiet, signed, licence, source link.

## Delivery order

Landing page ships first, ahead of 1.0. Each phase is independently deployable.

1. **Design system and theme pipeline** — `gen-themes.mjs`, the token layer, the
   switcher, Source Serif 4 in and Space Grotesk out. Nothing user-visible changes
   until phase 2, so this can land safely on its own.
2. **Landing page** — the eleven-section composition, new copy, the deletions. This is
   the phase that has to be live before 1.0.
3. **Docs chrome** — Starlight retokenised, `ForceDarkTheme.astro` removed, switcher in
   the `ThemeSelect` slot.
4. **New pages** — `/printers/`, `/whats-new/`, `/contact/`.

The email routes are independent of all four and can be done at any point.

## Get in touch

`helixscreen.org` already has Cloudflare Email Routing live — MX on
`route1-3.mx.cloudflare.net`, SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`. Only
routing rules are needed.

| Alias | Destination | Purpose |
|---|---|---|
| `hello@` | primary | General |
| `info@` | primary | Alias of `hello@` |
| `security@` | primary | Vulnerability reports; pair with a `SECURITY.md` |
| `bugs@` | primary | For people who will not open a GitHub account |

Requires a Cloudflare API token with Email Routing edit scope, which this session does
not hold — no `~/.wrangler` credentials exist. Setup is a documented task, run by the
author or by an agent given a token, not performed silently.

The contact surface routes by intent rather than presenting a row of logos: bug → issue
template; feature idea → Discussions; question → Discord; anything else → `hello@`.

## Build and deploy

Unchanged. `prebuild` gains `gen-themes.mjs` and a changelog transform beside the
existing `sync-docs.sh`. Cloudflare Pages, `.github/workflows/deploy.yml`, and the
`repository_dispatch` trigger from helixscreen releases all stay as they are.

## Verification

Definition of done, beyond "it builds":

- Grep the built output for the banned constructions and for the deleted CSS classes;
  none may appear.
- No `box-shadow`, no `text-shadow`, no `linear-gradient` on text, no `border-radius`
  above 3px in site CSS. Enforceable by grep over `dist/`.
- Every stated number traceable to a source in the repo, checked by hand against a list
  in the implementation plan.
- Theme switch verified across every theme in `themes.generated.css`, on both a landing
  page and a docs page, with no flash of the wrong theme on load.
- Lighthouse accessibility ≥ 95, and contrast checked on the light palettes, which are
  the risky ones.
- Read the finished landing page cold and ask whether any sentence could have been
  produced by a model. Anything that could, gets rewritten.

## Out of scope

- Rewriting user documentation content. Docs are authored in the helixscreen repo and
  synced; only their presentation changes here.
- The logo.
- Analytics, newsletter capture, or any tracking beyond what exists.
- Changes to `sync-docs.sh`'s existing content transforms, beyond adding the changelog
  and theme steps.

## Follow-ups for the helixscreen repo

Found while researching, out of scope here, but they reach the website through sync:

- **Done** (helixscreen `a62a04d4d`): the compiled-in fallback theme returned Nord
  while `DEFAULT_THEME` was `helixscreen`. Renamed to `get_builtin_fallback_theme()`
  and given the HelixScreen palette, and the `nord.json` seeding was dropped from
  `ensure_themes_directory()` because a user-directory copy permanently shadows the
  shipped theme.
- **Done**: six places across `CONFIGURATION.md`, `FAQ.md` and
  `guide/settings/display-sound.md` named Nord as the default theme. All corrected to
  HelixScreen. These sync onto `/reference/configuration/`, `/reference/faq/` and
  `/guide/settings/display-sound/`, so a docs re-sync is required before the next
  deploy or the site will still show the old answer.
