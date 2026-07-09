# Marketing Landing-Page Search Overlay — Design

**Date:** 2026-07-09
**Status:** Approved, pending implementation plan

## Problem

The docs section of helixscreen.org already has working full-text search: it's built on
Astro 5 + Starlight, and Starlight ships Pagefind out of the box. Every docs page
(`/installation/`, `/guide/...`, `/reference/...`) renders Starlight's search bar, and the
build emits the Pagefind index to `dist/pagefind/`.

The **marketing landing page** (`src/pages/index.astro`) is a separate custom Astro page —
not part of the Starlight collection — and has no search affordance. A visitor who lands on
the homepage has no way to search the docs without first navigating into the docs section.

## Goal

Add a search entry point to the marketing landing page that opens an **in-page overlay**,
searching the existing docs corpus via the Pagefind index Starlight already builds. No new
search backend, no new build step, no JS framework.

## Non-Goals

- Indexing the marketing landing page's own content (search corpus stays the docs). Site-wide
  indexing including marketing copy is a possible future follow-up, not this work.
- AI/semantic search.
- Changing the docs-section search (Starlight's built-in search is untouched).
- Custom result markup — we reuse Pagefind's official UI widget (see Approach A vs B).

## Approach

**Chosen: A — Pagefind's default UI inside our own modal shell.**

We own the trigger (a "Search docs…" pill in the nav) and the modal chrome (Tailwind, themed
to the marketing dark look). Inside the modal we mount Pagefind's official `PagefindUI`
widget, pointed at the existing `/pagefind/` index. Pagefind's UI already handles debounced
querying, result ranking, sub-results, and highlighting; we theme it via its CSS variables.

Rejected alternative **B — Pagefind JS API + fully custom result markup.** Total visual
control, but reimplements debouncing, highlighting, and result rendering for a nav
affordance. If bespoke result styling is wanted later, B is a clean follow-up that reuses the
same trigger and modal shell.

## Interaction Design

- **Trigger:** a "Search docs…" pill button (magnifying-glass icon + label), styled like a
  search box, placed in the desktop nav link cluster before the "Docs" link. Mirrored as a
  full-width search row in the mobile `#mobile-menu`.
- **Keyboard:** `⌘K` / `Ctrl+K` and `/` open the overlay from anywhere on the page; `Esc`
  closes it. Focus moves into the search input on open; focus is trapped in the modal while
  open and restored to the trigger on close.
- **Body scroll** is locked while the overlay is open.
- **Result click** navigates to the docs URL (normal Pagefind behavior).

## Components / Files

| File | Change |
|------|--------|
| `src/components/marketing/SiteSearch.astro` | **New.** Pill button + modal overlay markup + inline `<script>`: lazy-load Pagefind UI CSS/JS on first open, instantiate `PagefindUI`, handle open/close, keyboard shortcuts, focus-trap, scroll-lock, and the dev-mode fallback. |
| `src/components/marketing/SiteNav.astro` | **Edit.** Render `<SiteSearch />` in the desktop link cluster (before "Docs") and add the search row to the mobile menu block. |
| `src/styles/marketing.css` | **Edit.** Add Pagefind CSS-variable overrides so the widget matches the marketing theme (background, text, accent, border, radius). |

## Data Flow

```
pill click / ⌘K / Ctrl+K / "/"
  → open modal
  → (first open only) inject /pagefind/pagefind-ui.js + /pagefind/pagefind-ui.css
  → new PagefindUI({ element, showSubResults: true })
  → user types
  → Pagefind queries the static /pagefind/ index (built by Starlight)
  → result click → navigate to docs URL
```

No new build step: `astro build` (via Starlight) already emits `dist/pagefind/`. The overlay
is a pure client-side consumer of that static index.

## Dev vs. Build Caveat

`/pagefind/` does not exist under `astro dev` — Pagefind's index is only generated during
`astro build`. On overlay open in dev, the script's lazy-load will 404. The script **catches
this and shows an inline note** ("Search is available in the production build") instead of
throwing or presenting a broken modal.

**Real testing path:** `npm run build && npm run preview`.

## Error Handling

- Lazy-load of Pagefind assets is wrapped in `try/catch`; failure shows the inline message,
  never a broken/empty modal.
- A guard flag ensures the Pagefind script/UI is injected and instantiated only once across
  multiple opens.
- Everything is vanilla JS via an inline `<script>` — no framework added, consistent with the
  rest of the site (`SiteNav.astro`, `MarketingLayout.astro` already use inline scripts).

## Testing / Acceptance

Under `npm run build` then `npm run preview`:

1. Build succeeds; `dist/pagefind/` present.
2. "Search docs…" pill visible in the desktop nav and in the mobile menu.
3. Clicking the pill opens the overlay; `⌘K`, `Ctrl+K`, and `/` also open it; `Esc` closes it.
4. Typing "filament" / "install" returns docs results; clicking a result navigates to that page.
5. Focus moves into the input on open and is restored on close; page scroll is locked while open.
6. Under `astro dev`, opening the overlay shows the graceful fallback note rather than erroring.

## Deployment

No deployment change. The site deploys via the existing `.github/workflows/deploy.yml`
(`wrangler pages deploy dist`). The overlay ships as part of the normal build output.
