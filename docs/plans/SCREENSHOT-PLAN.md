# HelixScreen Screenshot Update Plan

Generated 2026-03-22. Work through each section, capturing full-screen app shots.
For close-ups/thumbnails, crop from the full-screen captures or target specific UI areas.

## Destinations

Screenshots go to **3 places** (the sync script + manual copy handles distribution):

| Destination | Path | Purpose |
|---|---|---|
| **Source docs** | `helixscreen/docs/images/user/` | User guide (synced to website) |
| **GitHub gallery** | `helixscreen/docs/images/` | README.md + GALLERY.md showcase |
| **Website marketing** | `helixscreen-website/src/assets/images/screenshots/` | Landing page |

## Resolution & Format

- Full-screen: native app resolution (likely 800x480 for touchscreen)
- Format: PNG
- Dark theme preferred (matches website)

---

## SHOT LIST

### 1. Home Panel (11 shots)

- [ ] `home.png` — Default home panel, normal state
- [ ] `home-edit-mode.png` — Edit mode active (widget selected, gear + trash icons, toolbar)
- [ ] `home-widget-catalog.png` — Widget catalog overlay (scrollable list, size badges)
- [ ] `home-widget-trash.png` — Widget selected with trash icon in upper-right
- [ ] `home-macro-picker.png` — Macro picker dialog
- [ ] `home-carousel-modes.png` — Carousel mode showing fan arc slider + temp readout
- [ ] `home-fan-carousel.png` — Fan carousel with arc slider, page dots
- [ ] `home-job-queue.png` — Job queue modal (queue state, start button, job list)
- [ ] `home-led-control.png` — LED control (strip selector, color presets, brightness, effects)
- [ ] `home-image-picker.png` — Printer image picker (list on left, preview on right)
- [ ] `home-printer-manager.png` — Printer manager (name, image, software versions)

### 2. Controls Panel (8 shots)

- [ ] `controls.png` — Controls panel overview/default state
- [ ] `controls-temperature.png` — Temperature controls
- [ ] `controls-fan.png` — Fan controls
- [ ] `controls-fan-detail.png` — Fan detail/expanded view
- [ ] `controls-motion.png` — Motion controls (jog buttons etc.)
- [ ] `controls-extrusion.png` — Extrusion controls
- [ ] `controls-bed-mesh.png` — Bed mesh visualization
- [ ] `controls-pid.png` — PID/heater calibration panel

### 3. Print Management (5 shots)

- [ ] `print-select.png` — Print file browser (card/grid view)
- [ ] `print-select-list.png` — Print file browser (list view)
- [ ] `print-detail.png` — File preview/detail overlay
- [ ] `print-status.png` — Active print status panel
- [ ] `print-tune.png` — Print tune overlay (speed, flow, etc.)

### 4. Advanced Panel (8 shots)

- [ ] `advanced.png` — Advanced panel overview
- [ ] `advanced-console.png` — **NEW** Console panel (currently missing!)
- [ ] `advanced-macros.png` — Macro management panel
- [ ] `advanced-history.png` — Print history
- [ ] `advanced-shaper.png` — Input shaper panel
- [ ] `advanced-screws.png` — Screws tilt adjust
- [ ] `advanced-zoffset.png` — Z-offset calibration
- [ ] `advanced-spoolman.png` — Spoolman integration

### 5. Settings (6 shots)

- [ ] `settings.png` — Settings panel overview/main
- [ ] `settings-display.png` — Display settings
- [ ] `settings-theme.png` — Theme/appearance settings
- [ ] `settings-hardware.png` — Hardware settings
- [ ] `settings-network.png` — Network settings
- [ ] `settings-sensors.png` — Sensor settings

### 6. Setup Wizard (3 shots)

- [ ] `wizard-wifi.png` — WiFi setup screen
- [ ] `wizard-connection.png` — Printer connection screen
- [ ] `wizard-hardware.png` — Hardware discovery screen

### 7. Touch Calibration (4 shots)

- [ ] `touch-cal-begin.png` — "Tap anywhere to begin" screen
- [ ] `touch-cal-overlay.png` — Calibration in progress
- [ ] `touch-cal-point2.png` — Second calibration point
- [ ] `touch-cal-verify.png` — Verification screen

### 8. AMS / Filament (2 shots)

- [ ] `ams.png` — AMS panel
- [ ] `filament.png` — Filament panel/overview

---

## GITHUB GALLERY SHOTS (10 curated shots)

These are the "hero" screenshots for README.md and GALLERY.md.
They use the `screenshot-` prefix and live in `helixscreen/docs/images/`.

| Filename | Source panel | Notes |
|---|---|---|
| `screenshot-home-panel.png` | Home | Clean default state, looks great |
| `screenshot-print-select-card.png` | Print Select | Card/grid view |
| `screenshot-bed-mesh-panel.png` | Bed Mesh | 3D mesh visualization |
| `screenshot-controls-panel.png` | Controls | Overview |
| `screenshot-motion-panel.png` | Motion | Jog controls |
| `screenshot-ams-panel.png` | AMS | Multi-material |
| `screenshot-shaper-results.png` | Input Shaper | Results graph |
| `screenshot-pid-panel.png` | PID | Heater calibration |
| `screenshot-settings-panel.png` | Settings | Main settings |
| `screenshot-wizard-wifi.png` | Wizard | WiFi setup |

These can be crops/close-ups or full-screen — whatever looks best at 800px wide on GitHub.

---

## WEBSITE LANDING PAGE SHOTS (9 shots)

Used on the marketing homepage (`src/pages/index.astro`).
Stored in `helixscreen-website/src/assets/images/screenshots/`.

| Variable in index.astro | Filename | Panel |
|---|---|---|
| homeImg | `home.png` | Home panel |
| bedMeshImg | `controls-bed-mesh.png` | Bed mesh |
| printSelectImg | `print-select.png` | Print browser |
| amsImg | `ams.png` | AMS |
| shaperImg | `advanced-shaper.png` | Input shaper |
| settingsThemeImg | `settings-theme.png` | Theme settings |
| controlsImg | `controls.png` | Controls overview |
| advancedHistoryImg | `advanced-history.png` | Print history |
| advancedSpoolmanImg | `advanced-spoolman.png` | Spoolman |

---

## WORKFLOW

1. **Capture all 47 unique full-screen shots** (sections 1-8 above)
2. **Copy to source docs**: place in `helixscreen/docs/images/user/`
3. **Create 10 gallery crops**: save with `screenshot-` prefix in `helixscreen/docs/images/`
4. **Rebuild website**: `npm run build` (prebuild script syncs docs images automatically)
5. **Copy 9 marketing shots** to `helixscreen-website/src/assets/images/screenshots/`
6. **Verify**: `npm run build && npx wrangler pages deploy dist`

## NOTES

- `advanced-console.png` is the only shot that's currently **missing** — all others exist but may be outdated
- The `screenshots/` folder in the website repo has 42 files that duplicate `docs/` — consider if all are needed
- The sync script (`scripts/sync-docs.sh`) copies from helixscreen source to website docs automatically
