#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Turn the app's printer detection database into page data.
 *
 * Entries flagged `show_in_list: false` are heuristic-only mod detectors
 * (KAMP, Shake&Tune, ERCF, Klicky, Ellis) rather than printers, and the app
 * hides them from its own picker for the same reason.
 */
export function buildPrinters(dbPath) {
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const listed = db.printers.filter((p) => p.show_in_list !== false);

  const printers = listed
    .map((p) => ({
      id: p.id,
      name: p.name,
      manufacturer: p.manufacturer,
      aliases: p.aliases ?? [],
      // `notes` is user-facing caveat text. `note` is the detector author's
      // rationale and stays private — see the plan's Ruling 4.
      notes: p.notes ?? null,
    }))
    .sort(
      (a, b) =>
        a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name)
    );

  const counts = new Map();
  for (const p of printers) {
    counts.set(p.manufacturer, (counts.get(p.manufacturer) ?? 0) + 1);
  }
  const manufacturers = [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { count: printers.length, manufacturers, printers };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dbPath = join(root, '..', 'helixscreen', 'assets', 'config', 'printer_database.json');
  let built;
  try {
    built = buildPrinters(dbPath);
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-printers] ${dbPath} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'printers.generated.json'),
    JSON.stringify(built, null, 2) + '\n'
  );
  console.log(`[gen-printers] wrote ${built.count} printers across ${built.manufacturers.length} manufacturers`);
}
