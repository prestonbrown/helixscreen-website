#!/usr/bin/env bash
#
# sync-docs.sh — Copy user + developer documentation from the helixscreen
# repo into this Astro+Starlight site with proper frontmatter and path
# rewrites.
#
# Usage:  ./scripts/sync-docs.sh
# Idempotent: safe to run repeatedly; cleans output dirs each time.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DOCS="$PROJECT_ROOT/../helixscreen/docs/user"
SOURCE_DEVEL="$PROJECT_ROOT/../helixscreen/docs/devel"
SOURCE_IMAGES="$PROJECT_ROOT/../helixscreen/docs/images/user"
DEST_DOCS="$PROJECT_ROOT/src/content/docs"
DEST_IMAGES="$PROJECT_ROOT/src/assets/images/docs"

# ---------- 1. Validation ----------

if [[ ! -d "$SOURCE_DOCS" ]]; then
  echo "ERROR: Source docs directory not found: $SOURCE_DOCS" >&2
  exit 1
fi

# ---------- 2. Clean and create output dirs ----------

echo "Cleaning $DEST_DOCS ..."
if [[ -d "$DEST_DOCS" ]]; then
  # Remove everything except .gitkeep
  find "$DEST_DOCS" -mindepth 1 ! -name '.gitkeep' -delete 2>/dev/null || true
fi

mkdir -p "$DEST_DOCS"
mkdir -p "$DEST_DOCS/guide"
mkdir -p "$DEST_DOCS/guide/settings"
mkdir -p "$DEST_DOCS/reference"
mkdir -p "$DEST_DOCS/legal"
mkdir -p "$DEST_DOCS/dev"
mkdir -p "$DEST_DOCS/dev/onboarding"
mkdir -p "$DEST_DOCS/dev/contributing"
mkdir -p "$DEST_DOCS/dev/reference"
mkdir -p "$DEST_DOCS/dev/printers"
mkdir -p "$DEST_DOCS/dev/process"
mkdir -p "$DEST_IMAGES"

# ---------- 3. File mapping ----------
#
# Each entry: "source_rel|dest_rel|title|order|depth"
# depth = nesting level of dest file under src/content/docs/ for image-path rewriting
#   0 = root (e.g. installation.md)
#   1 = guide/ or reference/ or legal/
#   2 = guide/settings/

FILES=(
  "USER_GUIDE.md|index.md|User Guide|0|0"
  "INSTALL.md|installation.md|Installation|1|0"
  "UPGRADING.md|upgrading.md|Upgrading|2|0"
  "guide/getting-started.md|guide/getting-started.md|Getting Started|1|1"
  "guide/home-panel.md|guide/home-panel.md|Home Panel|2|1"
  "guide/printing.md|guide/printing.md|Printing|3|1"
  "guide/temperature.md|guide/temperature.md|Temperature|4|1"
  "guide/motion.md|guide/motion.md|Motion|5|1"
  "guide/filament.md|guide/filament.md|Filament|6|1"
  "guide/calibration.md|guide/calibration.md|Calibration|7|1"
  "guide/advanced.md|guide/advanced.md|Advanced|8|1"
  "guide/tips.md|guide/tips.md|Tips|9|1"
  "guide/beta-features.md|guide/beta-features.md|Beta Features|10|1"
  "guide/bluetooth-setup.md|guide/bluetooth-setup.md|Bluetooth Setup|12|1"
  "guide/barcode-scanner.md|guide/barcode-scanner.md|Barcode Scanner|13|1"
  "guide/label-printing.md|guide/label-printing.md|Label Printing|14|1"
  "guide/touch-calibration.md|guide/touch-calibration.md|Touch Calibration|15|1"
  "guide/creality-k1c-setup.md|guide/creality-k1c-setup.md|Creality K1C Setup|16|1"
  "guide/settings.md|guide/settings/index.md|Settings|1|2"
  "guide/settings/display-sound.md|guide/settings/display-sound.md|Display & Sound|2|2"
  "guide/settings/printing.md|guide/settings/printing.md|Printing|3|2"
  "guide/settings/hardware.md|guide/settings/hardware.md|Hardware & Devices|4|2"
  "guide/settings/safety.md|guide/settings/safety.md|Safety & Notifications|5|2"
  "guide/settings/system.md|guide/settings/system.md|System|6|2"
  "guide/settings/help-about.md|guide/settings/help-about.md|Help & About|7|2"
  "guide/settings/led-settings.md|guide/settings/led-settings.md|LED Settings|8|2"
  "CONFIGURATION.md|reference/configuration.md|Configuration|1|1"
  "TROUBLESHOOTING.md|reference/troubleshooting.md|Troubleshooting|2|1"
  "FAQ.md|reference/faq.md|FAQ|3|1"
  "PRIVACY_POLICY.md|legal/privacy.md|Privacy Policy|1|1"
  "TELEMETRY.md|legal/telemetry.md|Telemetry|2|1"
)

# ---------- 4. Transform a single file ----------

process_file() {
  local src="$1" dst="$2" title="$3" order="$4" depth="$5"

  local src_path="$SOURCE_DOCS/$src"
  local dst_path="$DEST_DOCS/$dst"

  if [[ ! -f "$src_path" ]]; then
    echo "  SKIP (not found): $src"
    return
  fi

  # Build relative path prefix from dest file to src/assets/images/docs/
  # From src/content/docs/         -> ../../assets/images/docs/        (depth 0: 2 ups)
  # From src/content/docs/guide/   -> ../../../assets/images/docs/     (depth 1: 3 ups)
  # From src/content/docs/guide/settings/ -> ../../../../assets/images/docs/ (depth 2: 4 ups)
  local ups=""
  local i
  for (( i = 0; i < depth + 2; i++ )); do
    ups="../$ups"
  done
  local img_prefix="${ups}assets/images/docs"

  # Read file, strip the first # heading line
  local body
  body=$(sed '1{/^# /d;}' "$src_path")

  # --- Image path rewriting ---
  # Patterns seen: ../../images/user/foo.png  or  ../images/user/foo.png  etc.
  # Replace any number of ../ followed by images/user/ with the correct relative asset path
  body=$(echo "$body" | sed -E "s|(\\.\\./)*images/user/|${img_prefix}/|g")
  # Also handle ../../images/foo.png (gallery screenshots, not in user/ subdir)
  body=$(echo "$body" | sed -E "s|(\\.\\./)*images/([^/]+\\.png)|${img_prefix}/\\2|g")
  body=$(echo "$body" | sed -E "s|(\\.\\./)*images/([^/]+\\.jpg)|${img_prefix}/\\2|g")
  body=$(echo "$body" | sed -E "s|(\\.\\./)*images/([^/]+\\.svg)|${img_prefix}/\\2|g")

  # --- Internal link rewriting ---
  # Top-level docs with uppercase names (with any number of ../ prefixes)
  body=$(echo "$body" | sed -E 's|\((\.\./)*INSTALL\.md\)|(/docs/installation/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*UPGRADING\.md\)|(/docs/upgrading/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*CONFIGURATION\.md\)|(/docs/reference/configuration/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*TROUBLESHOOTING\.md\)|(/docs/reference/troubleshooting/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*FAQ\.md\)|(/docs/reference/faq/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*PRIVACY_POLICY\.md\)|(/docs/legal/privacy/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*TELEMETRY\.md\)|(/docs/legal/telemetry/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)*USER_GUIDE\.md\)|(/docs/)|g')

  # guide/settings/*.md links (must come before guide/*.md)
  # From guide/ files linking to settings/foo.md
  body=$(echo "$body" | sed -E 's|\((\.\./)*settings/([a-z-]+)\.md\)|(/docs/guide/settings/\2/)|g')
  # From settings/ files linking to ../settings.md (the index)
  body=$(echo "$body" | sed -E 's|\((\.\./)*settings\.md\)|(/docs/guide/settings/)|g')

  # guide/*.md links — with optional ../ prefixes for cross-directory references
  body=$(echo "$body" | sed -E 's|\((\.\./)*guide/([a-z-]+)\.md\)|(/docs/guide/\2/)|g')

  # Sibling links to guide-level pages from settings/ files (e.g. ../advanced.md)
  # These are guide/*.md pages referenced with ../ from settings/
  body=$(echo "$body" | sed -E 's|\(\.\./([a-z-]+)\.md\)|(/docs/guide/\1/)|g')

  # Sibling .md links within guide/ or guide/settings/ (e.g. (printing.md) -> /docs/guide/printing/)
  # Sibling .md links — use the SOURCE directory to determine context,
  # since some files move directories (e.g. guide/settings.md -> guide/settings/index.md)
  local src_dir
  src_dir=$(dirname "$src")
  if [[ "$src_dir" == "guide/settings" ]]; then
    # Sibling links in settings/ (e.g. printer.md -> /docs/guide/settings/printer/)
    body=$(echo "$body" | sed -E 's|\(([a-z-]+)\.md\)|(/docs/guide/settings/\1/)|g')
  elif [[ "$src_dir" == "guide" || "$src_dir" == "." ]]; then
    # Sibling links in guide/ (e.g. printing.md -> /docs/guide/printing/)
    body=$(echo "$body" | sed -E 's|\(([a-z-]+)\.md\)|(/docs/guide/\1/)|g')
  fi

  # Drop links to files outside our scope (e.g. ../DEVELOPMENT.md)
  # Leave them as-is — they just won't resolve, which is acceptable

  # --- Write output ---
  {
    echo "---"
    echo "title: \"$title\""
    echo "sidebar:"
    echo "  order: $order"
    echo "---"
    echo ""
    echo "$body"
  } > "$dst_path"

  echo "  OK: $src -> $dst"
}

# ---------- 5. Process all files ----------

echo ""
echo "Syncing docs from $SOURCE_DOCS ..."
echo ""

for entry in "${FILES[@]}"; do
  IFS='|' read -r src dst title order depth <<< "$entry"
  process_file "$src" "$dst" "$title" "$order" "$depth"
done

# ---------- 5b. Developer docs ----------
#
# Curated subset of docs/devel/ — onboarding, contributor guides, reference
# for contributors, printer platforms, process. Internal architecture, plans,
# specs, and research notes are NOT synced (GitHub-only).
#
# Each entry: "source_rel|dest_rel|title|order|depth"
# All dev docs are at depth 2 under src/content/dev/<section>/.

DEVEL_FILES=(
  # Onboarding (depth 2: dev/onboarding/)
  "DEVELOPMENT.md|dev/onboarding/development.md|Development Setup|1|2"
  "BUILD_SYSTEM.md|dev/onboarding/build-system.md|Build System|2|2"
  "DEVELOPER_QUICK_REFERENCE.md|dev/onboarding/quick-reference.md|Quick Reference|3|2"
  "YOUR_FIRST_CONTRIBUTION.md|dev/onboarding/first-contribution.md|Your First Contribution|4|2"
  "CONTRIBUTOR_GOTCHAS.md|dev/onboarding/gotchas.md|Contributor Gotchas|5|2"

  # Contributing (depth 2: dev/contributing/)
  "UI_CONTRIBUTOR_GUIDE.md|dev/contributing/ui.md|UI Contributor Guide|1|2"
  "THEME_CONTRIBUTOR_GUIDE.md|dev/contributing/themes.md|Theme Contributor Guide|2|2"
  "TRANSLATION_CONTRIBUTOR_GUIDE.md|dev/contributing/translations.md|Translation Contributor Guide|3|2"
  "PLUGIN_DEVELOPMENT.md|dev/contributing/plugins.md|Plugin Development|4|2"
  "COPYRIGHT_HEADERS.md|dev/contributing/copyright.md|Copyright Headers|5|2"

  # Reference for contributors (depth 2: dev/reference/)
  "LVGL9_XML_GUIDE.md|dev/reference/xml-guide.md|LVGL9 XML Guide|1|2"
  "MODAL_SYSTEM.md|dev/reference/modals.md|Modal System|2|2"
  "LOGGING.md|dev/reference/logging.md|Logging|3|2"
  "TESTING.md|dev/reference/testing.md|Testing|4|2"

  # Printer platforms (depth 2: dev/printers/)
  "printers/CREALITY_K1_SUPPORT.md|dev/printers/creality-k1.md|Creality K1 Series|1|2"
  "printers/CREALITY_K2_SUPPORT.md|dev/printers/creality-k2.md|Creality K2 Series|2|2"
  "printers/FLASHFORGE_AD5X_SUPPORT.md|dev/printers/flashforge-ad5x.md|FlashForge Adventurer 5X|3|2"
  "printers/QIDI_SUPPORT.md|dev/printers/qidi.md|QIDI Printers|4|2"
  "printers/SNAPMAKER_U1_SUPPORT.md|dev/printers/snapmaker-u1.md|Snapmaker U1|5|2"
  "AD5M_KMOD_VARIANT.md|dev/printers/ad5m-kmod.md|AD5M Klipper Mod Variant|6|2"

  # Process (depth 2: dev/process/)
  "RELEASE_PROCESS.md|dev/process/release.md|Release Process|1|2"
  "INSTALLER.md|dev/process/installer.md|Installer|2|2"
)

# Map of synced devel docs: filename (no path) → URL slug under /dev/.
# Used to rewrite cross-references to other synced dev docs.
declare -A DEVEL_LINK_MAP=(
  [DEVELOPMENT.md]="/dev/onboarding/development/"
  [BUILD_SYSTEM.md]="/dev/onboarding/build-system/"
  [DEVELOPER_QUICK_REFERENCE.md]="/dev/onboarding/quick-reference/"
  [YOUR_FIRST_CONTRIBUTION.md]="/dev/onboarding/first-contribution/"
  [CONTRIBUTOR_GOTCHAS.md]="/dev/onboarding/gotchas/"
  [UI_CONTRIBUTOR_GUIDE.md]="/dev/contributing/ui/"
  [THEME_CONTRIBUTOR_GUIDE.md]="/dev/contributing/themes/"
  [TRANSLATION_CONTRIBUTOR_GUIDE.md]="/dev/contributing/translations/"
  [PLUGIN_DEVELOPMENT.md]="/dev/contributing/plugins/"
  [COPYRIGHT_HEADERS.md]="/dev/contributing/copyright/"
  [LVGL9_XML_GUIDE.md]="/dev/reference/xml-guide/"
  [MODAL_SYSTEM.md]="/dev/reference/modals/"
  [LOGGING.md]="/dev/reference/logging/"
  [TESTING.md]="/dev/reference/testing/"
  [CREALITY_K1_SUPPORT.md]="/dev/printers/creality-k1/"
  [CREALITY_K2_SUPPORT.md]="/dev/printers/creality-k2/"
  [FLASHFORGE_AD5X_SUPPORT.md]="/dev/printers/flashforge-ad5x/"
  [QIDI_SUPPORT.md]="/dev/printers/qidi/"
  [SNAPMAKER_U1_SUPPORT.md]="/dev/printers/snapmaker-u1/"
  [AD5M_KMOD_VARIANT.md]="/dev/printers/ad5m-kmod/"
  [RELEASE_PROCESS.md]="/dev/process/release/"
  [INSTALLER.md]="/dev/process/installer/"
)

# GitHub base for files NOT synced to the site (architecture, plans, specs,
# research, source code). Devel cross-refs that don't match DEVEL_LINK_MAP
# get rewritten to GitHub blob URLs so contributors can still follow them.
GITHUB_BLOB_BASE="https://github.com/prestonbrown/helixscreen/blob/main"

process_devel_file() {
  local src="$1" dst="$2" title="$3" order="$4" depth="$5"

  local src_path="$SOURCE_DEVEL/$src"
  local dst_path="$DEST_DOCS/$dst"

  if [[ ! -f "$src_path" ]]; then
    echo "  SKIP (not found): devel/$src"
    return
  fi

  # Read file, strip the first # heading line (Starlight uses frontmatter title)
  local body
  body=$(sed '1{/^# /d;}' "$src_path")

  # --- User-doc link rewrites (../user/... or ../../user/...) ---
  # Map devel-side references to user docs onto their site URLs.
  # NOTE: site URLs are at root (e.g. /installation/, /guide/...), NOT under
  # /docs/. The existing user-doc rewrites in process_file() write /docs/...
  # paths that 404 in production — pre-existing bug, separate from this work.
  # Pattern (\.\./)+ matches any number of ../ prefixes (printers/* is depth-2
  # from docs/devel/ so it uses ../../user/X.md; top-level devel files use
  # ../user/X.md).
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/USER_GUIDE\.md\)|(/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/INSTALL\.md\)|(/installation/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/UPGRADING\.md\)|(/upgrading/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/CONFIGURATION\.md\)|(/reference/configuration/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/TROUBLESHOOTING\.md\)|(/reference/troubleshooting/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/FAQ\.md\)|(/reference/faq/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/PRIVACY_POLICY\.md\)|(/legal/privacy/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/TELEMETRY\.md\)|(/legal/telemetry/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/guide/settings/([a-z0-9-]+)\.md\)|(/guide/settings/\2/)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/guide/settings\.md(#[^)]*)?\)|(/guide/settings/\2)|g')
  body=$(echo "$body" | sed -E 's|\((\.\./)+user/guide/([a-z0-9-]+)\.md\)|(/guide/\2/)|g')

  # --- Synced devel-doc cross-refs ---
  # Rewrite known synced docs to their site URL. Loop through the map.
  # Strips any number of ../ prefixes plus optional subdir (printers/).
  local key url key_re
  for key in "${!DEVEL_LINK_MAP[@]}"; do
    url="${DEVEL_LINK_MAP[$key]}"
    key_re=$(echo "$key" | sed 's/\./\\./g')
    body=$(echo "$body" | sed -E "s|\((\\.\\./)*(\\./)?(printers/)?${key_re}(#[^)]*)?\)|(${url}\4)|g")
  done

  # --- GitHub fallback for non-synced devel refs ---
  # Anything left looking like (../FOO.md) or (subdir/FOO.md) — assume it
  # points at an unsynced devel doc and rewrite to GitHub blob. Match:
  #   - ALL_CAPS or DIGIT-LEAD: 480x320_UI_AUDIT.md, README.md, FOO_BAR.md
  #   - Any number of ../ prefixes
  body=$(echo "$body" | sed -E "s|\((\\.\\./)*([A-Z0-9][A-Z0-9a-z_-]*\.md)(#[^)]*)?\)|(${GITHUB_BLOB_BASE}/docs/devel/\2\3)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)*(plans/[^)]+\.md)\)|(${GITHUB_BLOB_BASE}/docs/devel/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)*(specs/[^)]+\.md)\)|(${GITHUB_BLOB_BASE}/docs/devel/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)*(printer-research/[^)]+\.md)\)|(${GITHUB_BLOB_BASE}/docs/devel/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)*(architecture/[^)]+\.md)\)|(${GITHUB_BLOB_BASE}/docs/devel/\2)|g")

  # Source-file refs (src/, include/, lib/, scripts/, patches/) → GitHub blob
  # at repo root. Tolerate any ../ depth since printers/* uses ../../ and
  # top-level devel uses ../.
  body=$(echo "$body" | sed -E "s|\((\\.\\./)+(src/[^)]+)\)|(${GITHUB_BLOB_BASE}/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)+(include/[^)]+)\)|(${GITHUB_BLOB_BASE}/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)+(lib/[^)]+)\)|(${GITHUB_BLOB_BASE}/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)+(scripts/[^)]+)\)|(${GITHUB_BLOB_BASE}/\2)|g")
  body=$(echo "$body" | sed -E "s|\((\\.\\./)+(patches/[^)]+)\)|(${GITHUB_BLOB_BASE}/\2)|g")

  # --- Write output ---
  {
    echo "---"
    echo "title: \"$title\""
    echo "sidebar:"
    echo "  order: $order"
    echo "---"
    echo ""
    echo "$body"
  } > "$dst_path"

  echo "  OK: devel/$src -> $dst"
}

echo ""
echo "Syncing developer docs from $SOURCE_DEVEL ..."
echo ""

for entry in "${DEVEL_FILES[@]}"; do
  IFS='|' read -r src dst title order depth <<< "$entry"
  process_devel_file "$src" "$dst" "$title" "$order" "$depth"
done

# --- Write the dev/ landing page inline ---
# Not synced from source — written fresh so contributors can land on a
# curated overview that points at GitHub for the full developer-docs set.
cat > "$DEST_DOCS/dev/index.md" <<'DEVINDEX'
---
title: "Developer Documentation"
sidebar:
  order: 0
---

This is the public subset of HelixScreen's developer documentation —
the docs most useful for getting set up, making your first
contribution, and learning the conventions you'll run into.

The full set lives in the repository at
[`docs/devel/`](https://github.com/prestonbrown/helixscreen/tree/main/docs/devel)
— including deep architecture references, active implementation
plans, design specs, printer reverse-engineering notes, and other
internal working documents.

## Where to start

- **New to the codebase?** Start with [Development Setup](/dev/onboarding/development/),
  then walk through [Your First Contribution](/dev/onboarding/first-contribution/).
- **Adding UI?** [UI Contributor Guide](/dev/contributing/ui/) is the
  one-stop shop for breakpoints, tokens, colors, and widget conventions.
- **Translating?** [Translation Contributor Guide](/dev/contributing/translations/)
  — no code required.
- **Building a theme?** [Theme Contributor Guide](/dev/contributing/themes/)
  — JSON only, no C++.
- **Writing a plugin?** [Plugin Development](/dev/contributing/plugins/).
- **Bringing up a new printer?** Start with one of the existing
  [Printer Platforms](/dev/printers/creality-k1/) as a template.

## Reporting issues

File bugs and feature requests on
[GitHub Issues](https://github.com/prestonbrown/helixscreen/issues).
For real-time questions, join the
[Discord](https://discord.gg/helixscreen).
DEVINDEX

echo "  OK: (inline) dev/index.md"

# ---------- 6. Copy images ----------

echo ""
echo "Copying images from $SOURCE_IMAGES ..."

if [[ -d "$SOURCE_IMAGES" ]]; then
  cp -R "$SOURCE_IMAGES/"* "$DEST_IMAGES/" 2>/dev/null || true
fi

# Also copy gallery-level screenshots (referenced from some docs as ../../images/foo.png)
SOURCE_GALLERY="$PROJECT_ROOT/../helixscreen/docs/images"
if [[ -d "$SOURCE_GALLERY" ]]; then
  # Copy only image files from gallery root (not subdirectories)
  find "$SOURCE_GALLERY" -maxdepth 1 -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.gif' -o -name '*.svg' \) -exec cp {} "$DEST_IMAGES/" \;
fi

img_count=$(ls -1 "$DEST_IMAGES" 2>/dev/null | wc -l | tr -d ' ')
echo "  Copied $img_count image(s) to $DEST_IMAGES"

echo ""
echo "Done."
