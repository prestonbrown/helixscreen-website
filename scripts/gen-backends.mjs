#!/usr/bin/env node
// Lists the filament systems HelixScreen ships, read from the registry every
// backend registers in (kAmsTypeTraits in include/ams_types.h), so the site's
// multi-material count and list follow the app.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseBackends(headerText) {
  const block = headerText.match(/kAmsTypeTraits\[\]\s*=\s*\{([\s\S]*?)\n\};/);
  if (!block) return [];
  const names = [];
  for (const m of block[1].matchAll(/\{AmsType::(\w+),\s*"([^"]+)"/g)) {
    if (m[1] !== 'NONE') names.push(m[2]);
  }
  return names;
}

export function buildBackends(headerPath) {
  const names = parseBackends(readFileSync(headerPath, 'utf8'));
  return { count: names.length, names };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const headerPath = join(root, '..', 'helixscreen', 'include', 'ams_types.h');
  let built;
  try {
    built = buildBackends(headerPath);
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-backends] ${headerPath} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }
  // Zero systems means the registry's shape moved out from under this parser,
  // not that the app dropped multi-material support.
  if (built.count === 0) {
    console.warn('[gen-backends] parsed 0 filament systems; keeping committed output.');
    process.exit(0);
  }
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'backends.generated.json'),
    JSON.stringify(built, null, 2) + '\n'
  );
  console.log(`[gen-backends] wrote ${built.count} filament systems`);
}
