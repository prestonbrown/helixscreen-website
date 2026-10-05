#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, publishedNewestFirst } from './releases.mjs';

// Stages the K-Touch firmware for the /flash/ page: the part images flash_args
// names, plus an ESP Web Tools manifest. The browser fetches them from this
// site because neither GitHub release downloads nor releases.helixscreen.org
// answer cross-origin requests.
//
// Usage: node scripts/stage-esp32-firmware.mjs [--zip path/to/helixscreen-esp32-ktouch-<tag>.zip]
// Without --zip it asks `gh` for the newest release carrying the zip.

export const ASSET_RE = /^helixscreen-esp32-ktouch-(.+)\.zip$/;
// Cloudflare Pages refuses any single file above 25 MiB.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * flash_args is one options line, then "<offset> <relative path>" per image.
 * Returns the images in flash order. Throws on anything else, since a part
 * written at the wrong offset bricks the panel until a manual reflash.
 */
export function parseFlashArgs(text) {
  const parts = [];
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('-')) continue;
    const m = t.match(/^(0x[0-9a-fA-F]+)\s+(\S+)$/);
    if (!m) throw new Error(`unexpected flash_args line: ${JSON.stringify(line)}`);
    if (m[2].startsWith('/') || m[2].split('/').includes('..')) {
      throw new Error(`flash_args path escapes the package: ${m[2]}`);
    }
    parts.push({ path: m[2], offset: Number.parseInt(m[1], 16) });
  }
  if (parts.length === 0) throw new Error('flash_args names no images');
  return parts.sort((a, b) => a.offset - b.offset);
}

export function buildManifest(version, parts) {
  return {
    name: 'HelixScreen',
    version,
    new_install_prompt_erase: true,
    builds: [{ chipFamily: 'ESP32-S3', parts: parts.map(({ path, offset }) => ({ path, offset })) }],
  };
}

/**
 * The newest non-draft release, prereleases included, that carries the K-Touch
 * zip. `releases/latest` cannot answer this: it points at the 1.0.x line, which
 * ships no ESP32 build. Returns { tag, asset } or null.
 */
export function pickRelease(releases) {
  for (const r of publishedNewestFirst(releases)) {
    const asset = (r.assets ?? []).find((a) => ASSET_RE.test(a.name));
    if (asset) return { tag: r.tag_name, asset: asset.name };
  }
  return null;
}

/** Copies the parts out of an unpacked package and writes the manifest. */
export function stagePackage(pkgDir, outDir) {
  const version = basename(pkgDir).match(/^helixscreen-esp32-ktouch-(.+)$/)?.[1];
  if (!version) throw new Error(`not a K-Touch package folder: ${pkgDir}`);
  const parts = parseFlashArgs(readFileSync(join(pkgDir, 'flash_args'), 'utf8'));
  for (const { path } of parts) {
    const src = join(pkgDir, path);
    const size = statSync(src).size;
    if (size > MAX_FILE_BYTES) throw new Error(`${path} is ${size} bytes, over the Pages per-file limit`);
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    cpSync(src, join(outDir, path));
  }
  const manifest = buildManifest(version, parts);
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function unpack(zip, work) {
  execFileSync('unzip', ['-q', zip, '-d', work], { stdio: ['ignore', 'ignore', 'pipe'] });
  const dirs = readdirSync(work).filter((d) => statSync(join(work, d)).isDirectory());
  if (dirs.length !== 1) throw new Error(`${zip} should hold one folder, found ${dirs.length}`);
  return join(work, dirs[0]);
}

function download(work) {
  // Release bodies are long changelogs; keep only what pickRelease reads.
  const slim = '[.[] | {tag_name, draft, published_at, created_at, assets: [.assets[] | {name}]}]';
  const json = execFileSync('gh', ['api', `repos/${REPO}/releases?per_page=30`, '--jq', slim], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pick = pickRelease(JSON.parse(json));
  if (!pick) return null;
  execFileSync('gh', ['release', 'download', pick.tag, '-R', REPO, '-p', pick.asset, '-D', work], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  return join(work, pick.asset);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const outDir = join(root, 'public', 'flash', 'esp32', 'ktouch');
  // A previous run's parts must never sit beside a newer manifest.
  rmSync(outDir, { recursive: true, force: true });

  const work = mkdtempSync(join(tmpdir(), 'helix-esp32-'));
  try {
    const zipArg = process.argv.indexOf('--zip');
    let zip;
    if (zipArg !== -1) {
      zip = process.argv[zipArg + 1];
      if (!zip || !existsSync(zip)) throw new Error(`--zip needs an existing file, got ${zip}`);
    } else {
      try {
        zip = download(work);
      } catch (err) {
        // A failed lookup still builds the site; the page then says no build is published.
        const detail = String(err.stderr ?? '').trim().split('\n').pop() || err.message;
        console.warn(`[stage-esp32-firmware] release lookup failed (${detail}); staging nothing.`);
        process.exit(0);
      }
      if (!zip) {
        console.log('[stage-esp32-firmware] no release carries an ESP32 K-Touch zip yet; staging nothing.');
        process.exit(0);
      }
    }
    mkdirSync(outDir, { recursive: true });
    const m = stagePackage(unpack(zip, join(work, 'pkg')), outDir);
    const list = m.builds[0].parts.map((p) => `0x${p.offset.toString(16)} ${p.path}`).join(', ');
    console.log(`[stage-esp32-firmware] staged ${m.version}: ${list}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
