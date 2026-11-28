#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Stages the K-Touch firmware for the /flash/ page: the part images flash_args
// names, plus an ESP Web Tools manifest. The browser fetches them from this
// site because neither GitHub release downloads nor releases.helixscreen.org
// answer cross-origin requests.
//
// Usage: node scripts/stage-esp32-firmware.mjs [--zip path/to/helixscreen-esp32-ktouch-<tag>.zip]
//                                               [--pubkey path/to/release-minisign.pub]
// Without --zip the release comes from the signed channel manifests the app's
// updater reads: the stable manifest, or the beta one when stable lists no K-Touch
// zip. Each must carry a valid prehashed minisign signature by the release key with
// a trusted comment naming its channel. The zip is downloaded from the URL that
// manifest lists and staged only when its sha256 matches the listing. When neither
// manifest lists a zip, nothing is staged and the page says no build is published.
// Any other failure (a refused signature, a wrong hash, an unreachable manifest or
// download) exits non-zero with the staged firmware untouched, so the deploy fails
// and the site keeps the firmware it already serves.
//
// The release key is HelixScreen's `.github/release-minisign.pub`, the key the app's
// updater and the easy installer trust. The deploy job checks the HelixScreen repo
// out beside this one (`../helixscreen`) and the key is read from there; --pubkey
// names another copy. Dev-channel builds are not served here, so the dev key is not
// trusted. A zip given with --zip is a local build and is not checked.

export const ASSET_RE = /^helixscreen-esp32-ktouch-(.+)\.zip$/;
// Cloudflare Pages refuses any single file above 25 MiB.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MANIFEST_BASE = 'https://releases.helixscreen.org';
// The channels the flasher serves from, in order of preference.
export const CHANNELS = ['stable', 'beta'];
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
 * the app's updater applies to stable and beta: signed by the release key, with a
 * trusted comment exactly `file:manifest.json channel:<channel>`. Throws on any failure.
 */
export function verifyChannelManifest(manifestBytes, minisigText, channel, publicKeyText) {
  const trusted = verifyMinisign(manifestBytes, minisigText, publicKeyText);
  if (trusted !== `file:manifest.json channel:${channel}`) {
    throw new Error(`manifest signature: trusted comment ${JSON.stringify(trusted)} is not for the ${channel} channel`);
  }
  return JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
}

/**
 * The K-Touch zip a verified channel manifest lists: { channel, tag, url, sha256 },
 * or null when it lists none. An entry that is there but unusable (a sha256 that is
 * not 64 hex digits, a url off MANIFEST_BASE) throws rather than passing to the
 * next channel.
 */
export function zipEntry(channel, manifest) {
  const asset = manifest?.assets?.[MANIFEST_ASSET_KEY];
  if (!asset) return null;
  if (!/^[0-9a-f]{64}$/i.test(asset.sha256 ?? '')) {
    throw new Error(`the ${channel} manifest lists ${MANIFEST_ASSET_KEY} with a malformed sha256`);
  }
  if (typeof asset.url !== 'string' || !asset.url.startsWith(`${MANIFEST_BASE}/`)) {
    throw new Error(`the ${channel} manifest lists ${MANIFEST_ASSET_KEY} at ${asset.url}, outside ${MANIFEST_BASE}`);
  }
  return { channel, tag: manifest.tag, url: asset.url, sha256: asset.sha256.toLowerCase() };
}

/**
 * The K-Touch zip to serve: the first channel in CHANNELS order whose verified
 * manifest lists one. @p loadVerified(channel) returns that channel's verified
 * manifest and is called only as far as needed, so a later channel is not fetched
 * while an earlier one decides. Returns null when no channel lists a zip.
 */
export async function pickFromManifests(loadVerified) {
  for (const channel of CHANNELS) {
    const entry = zipEntry(channel, await loadVerified(channel));
    if (entry) return entry;
  }
  return null;
}

/** Throws unless @p zipBytes hash to the sha256 the manifest listed. */
export function checkZipHash(zipBytes, sha256) {
  const actual = createHash('sha256').update(zipBytes).digest('hex');
  if (actual !== sha256) throw new Error(`the zip's sha256 ${actual} is not the listed ${sha256}`);
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

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Fetches @p channel's manifest and returns it once verified. Throws on any failure. */
async function loadVerifiedManifest(channel, publicKeyText) {
  const manifestBytes = await fetchBytes(`${MANIFEST_BASE}/${channel}/manifest.json`);
  const minisig = (await fetchBytes(`${MANIFEST_BASE}/${channel}/manifest.json.minisig`)).toString('utf8');
  return verifyChannelManifest(manifestBytes, minisig, channel, publicKeyText);
}

/** Stages the firmware; returns without staging when no signed manifest lists a zip. */
async function main(root, outDir, work) {
  const zipArg = process.argv.indexOf('--zip');
  let zip;
  if (zipArg !== -1) {
    zip = process.argv[zipArg + 1];
    if (!zip || !existsSync(zip)) throw new Error(`--zip needs an existing file, got ${zip}`);
    console.warn('[stage-esp32-firmware] --zip is a local build: its signature is not checked.');
  } else {
    const keyArg = process.argv.indexOf('--pubkey');
    const keyPath =
      keyArg !== -1 ? process.argv[keyArg + 1] : join(root, '..', 'helixscreen', '.github', 'release-minisign.pub');
    if (!keyPath || !existsSync(keyPath)) throw new Error(`no release public key at ${keyPath}`);
    const key = readFileSync(keyPath, 'utf8');
    const pick = await pickFromManifests((channel) => loadVerifiedManifest(channel, key));
    if (!pick) {
      console.log('[stage-esp32-firmware] no signed manifest lists an ESP32 K-Touch zip; staging nothing.');
      rmSync(outDir, { recursive: true, force: true });
      return;
    }
    const name = basename(new URL(pick.url).pathname);
    if (!ASSET_RE.test(name)) throw new Error(`the ${pick.channel} manifest lists ${name}, not a K-Touch zip`);
    const bytes = await fetchBytes(pick.url);
    checkZipHash(bytes, pick.sha256);
    zip = join(work, name);
    writeFileSync(zip, bytes);
    console.log(`[stage-esp32-firmware] ${name} (${pick.tag}) matches the signed ${pick.channel} manifest.`);
  }
  // Staged beside the live folder and swapped in whole, so a failure leaves the
  // firmware already staged in place and a previous run's parts never sit beside
  // a newer manifest.
  const next = join(work, 'stage');
  mkdirSync(next, { recursive: true });
  const m = stagePackage(unpack(zip, join(work, 'pkg')), next);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(dirname(outDir), { recursive: true });
  cpSync(next, outDir, { recursive: true });
  const list = m.builds[0].parts.map((p) => `0x${p.offset.toString(16)} ${p.path}`).join(', ');
  console.log(`[stage-esp32-firmware] staged ${m.version}: ${list}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const work = mkdtempSync(join(tmpdir(), 'helix-esp32-'));
  try {
    await main(root, join(root, 'public', 'flash', 'esp32', 'ktouch'), work);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
