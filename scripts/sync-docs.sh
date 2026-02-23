#!/usr/bin/env bash
#
# sync-docs.sh — Copy user documentation from the helixscreen repo
# into this Astro+Starlight site with proper frontmatter and path rewrites.
#
# Usage:  ./scripts/sync-docs.sh
# Idempotent: safe to run repeatedly; cleans output dirs each time.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DOCS="$PROJECT_ROOT/../helixscreen/docs/user"
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
mkdir -p "$DEST_IMAGES"

# ---------- 3. File mapping ----------
#
# Each entry: "source_rel|dest_rel|title|order|depth"
# depth = nesting level of dest file under src/content/docs/ for image-path rewriting
#   0 = root (e.g. installation.md)
#   1 = guide/ or reference/ or legal/
#   2 = guide/settings/

FILES=(
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
  "guide/settings.md|guide/settings/index.md|Settings|1|2"
  "guide/settings/appearance.md|guide/settings/appearance.md|Appearance|2|2"
  "guide/settings/printer.md|guide/settings/printer.md|Printer|3|2"
  "guide/settings/notifications.md|guide/settings/notifications.md|Notifications|4|2"
  "guide/settings/motion.md|guide/settings/motion.md|Motion|5|2"
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
  body=$(echo "$body" | sed -E 's|\((\.\./)*USER_GUIDE\.md\)|(/docs/guide/getting-started/)|g')

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
