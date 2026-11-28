#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
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
//                                               [--pubkey path/to/release-minisign.pub]
// Without --zip it asks `gh` for the newest release carrying the zip, then checks
// that zip against the release's signed channel manifest before staging anything:
// the manifest must carry a valid signature by the release key, name the same tag,
// and list the zip's sha256 under `esp32-ktouch`. Any failure exits non-zero, so
// the deploy fails and the site keeps the firmware it already serves.
//
// The release key is HelixScreen's `.github/release-minisign.pub`, the key the app's
// updater and the easy installer trust; its `.github/release-minisign-dev.pub` is
// trusted on the dev channel only, as the app does. The deploy job checks the
// HelixScreen repo out beside this one (`../helixscreen`), and both keys are read
// from there; --pubkey names another release key and trusts no dev key. A zip given
// with --zip is a local build and is not checked.

export const ASSET_RE = /^helixscreen-esp32-ktouch-(.+)\.zip$/;
// Cloudflare Pages refuses any single file above 25 MiB.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MANIFEST_BASE = 'https://releases.helixscreen.org';
// The channels whose manifests can name a release the flasher serves: a stable
// release is on stable, a prerelease on beta or dev.
export const CHANNELS = ['stable', 'beta', 'dev'];
export const MANIFEST_ASSET_KEY = 'esp32-ktouch';

// DER prefix of an Ed25519 SubjectPublicKeyInfo; the raw 32-byte key follows it.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function decodeLine(text, what) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim());
  return { lines, fail: (why) => new Error(`${what}: ${why}`) };
}

/** The key id and raw Ed25519 key of a minisign public key (.pub text or its key line). */
export function parseMinisignPublicKey(text) {
  const { lines, fail } = decodeLine(text, 'release public key');
  const line = lines.find((l) => l && !l.startsWith('untrusted comment:'));
  if (!line) throw fail('no key line');
  const raw = Buffer.from(line, 'base64');
  if (raw.length !== 42 || raw.subarray(0, 2).toString('latin1') !== 'Ed') throw fail('not a minisign Ed25519 key');
  return { keyId: raw.subarray(2, 10), key: raw.subarray(10) };
}

function ed25519Verify(publicKey, message, signature) {
  const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, publicKey]), format: 'der', type: 'spki' });
  return cryptoVerify(null, message, key, signature);
}

/**
 * Checks a minisign signature over @p message by @p publicKeyText, as the app's
 * release_signature::verify does: only a prehashed signature (algorithm "ED",
 * Ed25519 over the BLAKE2b-512 of the file) is accepted, and the trusted comment's
 * global signature must hold too. Returns the trusted comment; throws on any failure.
 */
export function verifyMinisign(message, minisigText, publicKeyText) {
  const pub = parseMinisignPublicKey(publicKeyText);
  const { lines, fail } = decodeLine(minisigText, 'manifest signature');
  if (lines.length < 4 || !lines[0].startsWith('untrusted comment:') || !lines[2].startsWith('trusted comment: ')) {
    throw fail('not the four-line .minisig layout');
  }
  const sig = Buffer.from(lines[1], 'base64');
  const globalSig = Buffer.from(lines[3], 'base64');
  if (sig.length !== 74 || globalSig.length !== 64) throw fail('malformed');
  const alg = sig.subarray(0, 2).toString('latin1');
  if (alg === 'Ed') throw fail('signed without -H (a legacy signature); refused');
  if (alg !== 'ED') throw fail(`unknown algorithm ${JSON.stringify(alg)}`);
  if (!sig.subarray(2, 10).equals(pub.keyId)) throw fail('signed by a key other than the release key');
  const signature = sig.subarray(10);
  const prehash = createHash('blake2b512').update(message).digest();
  if (!ed25519Verify(pub.key, prehash, signature)) throw fail('does not match the manifest');
  const trusted = lines[2].slice('trusted comment: '.length);
  if (!ed25519Verify(pub.key, Buffer.concat([signature, Buffer.from(trusted, 'utf8')]), globalSig)) {
    throw fail('the trusted comment does not match the signature');
  }
  return trusted;
}

/**
 * Parses @p manifestBytes after its signature checks out for @p channel, by the rule
 * the app's updater applies: signed by keys.release on any channel, or by keys.dev on
 * the dev channel only, with a trusted comment exactly
 * `file:manifest.json channel:<channel>`. Throws on any failure.
 */
export function verifyChannelManifest(manifestBytes, minisigText, channel, keys) {
  let trusted;
  try {
    trusted = verifyMinisign(manifestBytes, minisigText, keys.release);
  } catch (err) {
    if (channel !== 'dev' || !keys.dev) throw err;
    trusted = verifyMinisign(manifestBytes, minisigText, keys.dev);
  }
  if (trusted !== `file:manifest.json channel:${channel}`) {
    throw new Error(`manifest signature: trusted comment ${JSON.stringify(trusted)} is not for the ${channel} channel`);
  }
  return JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
}

/**
 * Whether a verified channel manifest vouches for this zip: the same release tag,
 * and the zip's sha256 listed under `esp32-ktouch`. Returns a reason it does not,
 * or null when it does.
 */
export function manifestRefusesZip(manifest, tag, zipBytes) {
  if (manifest?.tag !== tag) return `it lists ${manifest?.tag ?? 'no tag'}, not ${tag}`;
  const listed = manifest.assets?.[MANIFEST_ASSET_KEY]?.sha256;
  if (!listed) return `it lists no ${MANIFEST_ASSET_KEY} asset`;
  const actual = createHash('sha256').update(zipBytes).digest('hex');
  if (listed.toLowerCase() !== actual) return `the zip's sha256 ${actual} is not the listed ${listed}`;
  return null;
}

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
 * The newest stable (non-prerelease, non-draft) release that carries the K-Touch
 * zip. A prerelease is only served when no stable release has the zip yet, as
 * before 1.1.0 shipped. `releases/latest` cannot answer this either way: a
 * release whose firmware build failed ships without the zip and must be passed
 * over. Returns { tag, asset } or null.
 */
export function pickRelease(releases) {
  const published = publishedNewestFirst(releases);
  const zipOf = (r) => (r.assets ?? []).find((a) => ASSET_RE.test(a.name));
  for (const r of published) {
    if (r.prerelease) continue;
    const asset = zipOf(r);
    if (asset) return { tag: r.tag_name, asset: asset.name };
  }
  for (const r of published) {
    const asset = zipOf(r);
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
  const slim = '[.[] | {tag_name, draft, prerelease, published_at, created_at, assets: [.assets[] | {name}]}]';
  const json = execFileSync('gh', ['api', `repos/${REPO}/releases?per_page=30`, '--jq', slim], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pick = pickRelease(JSON.parse(json));
  if (!pick) return null;
  execFileSync('gh', ['release', 'download', pick.tag, '-R', REPO, '-p', pick.asset, '-D', work], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  return { zip: join(work, pick.asset), tag: pick.tag };
}

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Throws unless a channel manifest signed by the release key vouches for the zip.
 * The first channel whose manifest names @p tag decides; a channel that cannot be
 * fetched or names another release is passed over.
 */
async function verifyZip(zip, tag, keys) {
  const zipBytes = readFileSync(zip);
  const tried = [];
  for (const channel of CHANNELS) {
    let manifestBytes, minisig;
    try {
      manifestBytes = await fetchBytes(`${MANIFEST_BASE}/${channel}/manifest.json`);
      minisig = (await fetchBytes(`${MANIFEST_BASE}/${channel}/manifest.json.minisig`)).toString('utf8');
    } catch (err) {
      tried.push(`${channel}: ${err.message}`);
      continue;
    }
    const manifest = verifyChannelManifest(manifestBytes, minisig, channel, keys);
    if (manifest.tag !== tag) {
      tried.push(`${channel}: lists ${manifest.tag}`);
      continue;
    }
    const why = manifestRefusesZip(manifest, tag, zipBytes);
    if (why) throw new Error(`the ${channel} manifest does not vouch for ${basename(zip)}: ${why}`);
    return channel;
  }
  throw new Error(`no signed channel manifest names ${tag} (${tried.join('; ')})`);
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
      console.warn('[stage-esp32-firmware] --zip is a local build: its signature is not checked.');
    } else {
      let picked;
      try {
        picked = download(work);
      } catch (err) {
        // A failed lookup still builds the site; the page then says no build is published.
        const detail = String(err.stderr ?? '').trim().split('\n').pop() || err.message;
        console.warn(`[stage-esp32-firmware] release lookup failed (${detail}); staging nothing.`);
        process.exit(0);
      }
      if (!picked) {
        console.log('[stage-esp32-firmware] no release carries an ESP32 K-Touch zip yet; staging nothing.');
        process.exit(0);
      }
      const keyArg = process.argv.indexOf('--pubkey');
      const keyDir = join(root, '..', 'helixscreen', '.github');
      const keyPath = keyArg !== -1 ? process.argv[keyArg + 1] : join(keyDir, 'release-minisign.pub');
      if (!keyPath || !existsSync(keyPath)) throw new Error(`no release public key at ${keyPath}`);
      const devKeyPath = join(keyDir, 'release-minisign-dev.pub');
      const keys = {
        release: readFileSync(keyPath, 'utf8'),
        dev: keyArg === -1 && existsSync(devKeyPath) ? readFileSync(devKeyPath, 'utf8') : null,
      };
      const channel = await verifyZip(picked.zip, picked.tag, keys);
      console.log(`[stage-esp32-firmware] ${basename(picked.zip)} matches the signed ${channel} manifest.`);
      zip = picked.zip;
    }
    mkdirSync(outDir, { recursive: true });
    const m = stagePackage(unpack(zip, join(work, 'pkg')), outDir);
    const list = m.builds[0].parts.map((p) => `0x${p.offset.toString(16)} ${p.path}`).join(', ');
    console.log(`[stage-esp32-firmware] staged ${m.version}: ${list}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
