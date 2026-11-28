import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, generateKeyPairSync, randomBytes, sign as cryptoSign } from 'node:crypto';
import {
  parseFlashArgs,
  buildManifest,
  stagePackage,
  verifyChannelManifest,
  pickFromManifests,
  checkZipHash,
} from '../scripts/stage-esp32-firmware.mjs';

const FLASH_ARGS = `--flash_mode dout --flash_freq 80m --flash_size 16MB
0x0 bootloader/bootloader.bin
0x20000 helixscreen_esp32.bin
0x8000 partition_table/partition-table.bin
0xf000 ota_data_initial.bin
0xd20000 storage_frogfs.bin
`;

test('reads every image and its offset from flash_args, in flash order', () => {
  assert.deepEqual(parseFlashArgs(FLASH_ARGS), [
    { path: 'bootloader/bootloader.bin', offset: 0x0 },
    { path: 'partition_table/partition-table.bin', offset: 0x8000 },
    { path: 'ota_data_initial.bin', offset: 0xf000 },
    { path: 'helixscreen_esp32.bin', offset: 0x20000 },
    { path: 'storage_frogfs.bin', offset: 0xd20000 },
  ]);
});

test('a moved partition flows through instead of a hard-coded offset', () => {
  const parts = parseFlashArgs(FLASH_ARGS.replace('0xd20000', '0xc00000'));
  assert.equal(parts.find((p) => p.path === 'storage_frogfs.bin').offset, 0xc00000);
});

test('tolerates CRLF line endings', () => {
  assert.equal(parseFlashArgs(FLASH_ARGS.replace(/\n/g, '\r\n')).length, 5);
});

test('refuses a line it does not understand rather than skipping an image', () => {
  assert.throws(() => parseFlashArgs('0x0 a.bin\n20000 b.bin\n'), /unexpected flash_args line/);
  assert.throws(() => parseFlashArgs('0x0 a.bin extra\n'), /unexpected/);
});

test('refuses flash_args that names nothing', () => {
  assert.throws(() => parseFlashArgs('--flash_mode dout\n'), /names no images/);
});

test('refuses paths that leave the package', () => {
  assert.throws(() => parseFlashArgs('0x0 ../../etc/passwd\n'), /escapes/);
  assert.throws(() => parseFlashArgs('0x0 /abs.bin\n'), /escapes/);
});

test('manifest has the ESP Web Tools shape with erase offered on a new install', () => {
  const m = buildManifest('v1.1.0-beta.4', parseFlashArgs(FLASH_ARGS));
  assert.equal(m.name, 'HelixScreen');
  assert.equal(m.version, 'v1.1.0-beta.4');
  assert.equal(m.new_install_prompt_erase, true);
  assert.equal(m.builds.length, 1);
  assert.equal(m.builds[0].chipFamily, 'ESP32-S3');
  assert.deepEqual(m.builds[0].parts[0], { path: 'bootloader/bootloader.bin', offset: 0 });
  assert.equal(typeof m.builds[0].parts[0].offset, 'number');
});

test('stages the parts and manifest, and leaves the factory image behind', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'stage-test-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const pkg = join(tmp, 'helixscreen-esp32-ktouch-v1.1.0-beta.4');
  for (const { path } of parseFlashArgs(FLASH_ARGS)) {
    mkdirSync(join(pkg, path, '..'), { recursive: true });
    writeFileSync(join(pkg, path), path);
  }
  writeFileSync(join(pkg, 'flash_args'), FLASH_ARGS);
  writeFileSync(join(pkg, 'helixscreen-esp32-ktouch-factory.bin'), 'factory');
  const out = join(tmp, 'out');
  mkdirSync(out);

  const m = stagePackage(pkg, out);
  assert.equal(m.version, 'v1.1.0-beta.4');
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8')), m);
  for (const { path } of m.builds[0].parts) {
    assert.equal(readFileSync(join(out, path), 'utf8'), path);
  }
  assert.equal(existsSync(join(out, 'helixscreen-esp32-ktouch-factory.bin')), false);
  assert.equal(existsSync(join(out, 'flash_args')), false);
});

test('a missing part fails the stage instead of publishing a partial build', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'stage-test-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const pkg = join(tmp, 'helixscreen-esp32-ktouch-v1.1.0-beta.4');
  mkdirSync(pkg);
  writeFileSync(join(pkg, 'flash_args'), FLASH_ARGS);
  assert.throws(() => stagePackage(pkg, join(tmp, 'out')), /ENOENT/);
});

// A minisign key pair and signer built from node:crypto, so the signature checks run
// without the release's secret key or the network.
function minisignPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const keyId = randomBytes(8);
  const pub = `untrusted comment: minisign public key\n${Buffer.concat([Buffer.from('Ed'), keyId, raw]).toString('base64')}\n`;
  const sign = (message, trusted, { alg = 'ED' } = {}) => {
    const body = alg === 'ED' ? createHash('blake2b512').update(message).digest() : message;
    const sig = cryptoSign(null, body, privateKey);
    const global = cryptoSign(null, Buffer.concat([sig, Buffer.from(trusted)]), privateKey);
    return [
      'untrusted comment: signature from minisign secret key',
      Buffer.concat([Buffer.from(alg), keyId, sig]).toString('base64'),
      `trusted comment: ${trusted}`,
      global.toString('base64'),
      '',
    ].join('\n');
  };
  return { pub, sign };
}

const ZIP = Buffer.from('a K-Touch zip');
const ZIP_SHA = createHash('sha256').update(ZIP).digest('hex');
const channelManifest = (tag, sha = ZIP_SHA) =>
  Buffer.from(JSON.stringify({ version: tag.slice(1), tag, assets: { 'esp32-ktouch': { url: 'u', sha256: sha, size: 13 } } }));

test('a manifest signed by the release key for its channel is accepted', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  const parsed = verifyChannelManifest(m, sign(m, 'file:manifest.json channel:stable'), 'stable', pub);
  assert.equal(parsed.tag, 'v1.1.1');
});

test('a manifest changed after signing is refused', () => {
  const { pub, sign } = minisignPair();
  const sig = sign(channelManifest('v1.1.1'), 'file:manifest.json channel:stable');
  assert.throws(
    () => verifyChannelManifest(channelManifest('v1.1.1', 'f'.repeat(64)), sig, 'stable', pub),
    /does not match the manifest/,
  );
});

test('a manifest signed for another channel is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, sign(m, 'file:manifest.json channel:beta'), 'stable', pub),
    /not for the stable channel/,
  );
});

test('a trusted comment swapped after signing is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  const sig = sign(m, 'file:manifest.json channel:beta').replace('channel:beta', 'channel:stable');
  assert.throws(() => verifyChannelManifest(m, sig, 'stable', pub), /trusted comment does not match/);
});

test('a signature by another key is refused', () => {
  const { pub } = minisignPair();
  const other = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, other.sign(m, 'file:manifest.json channel:stable'), 'stable', pub),
    /other than the release key/,
  );
});

test('a legacy signature over the raw file is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, sign(m, 'file:manifest.json channel:stable', { alg: 'Ed' }), 'stable', pub),
    /legacy/,
  );
});

const loader = (byChannel, seen = []) => (channel) => {
  seen.push(channel);
  if (!(channel in byChannel)) throw new Error(`${channel}: HTTP 404`);
  return byChannel[channel];
};
const URL_OK = 'https://releases.helixscreen.org/releases/v1.1.1/helixscreen-esp32-ktouch-v1.1.1.zip';
const withZip = (tag, extra = {}) => ({ tag, assets: { 'esp32-ktouch': { url: URL_OK, sha256: ZIP_SHA, ...extra } } });

test('serves stable when stable lists the zip, and never fetches beta', async () => {
  const seen = [];
  const pick = await pickFromManifests(loader({ stable: withZip('v1.1.1') }, seen));
  assert.deepEqual(pick, { channel: 'stable', tag: 'v1.1.1', url: URL_OK, sha256: ZIP_SHA });
  assert.deepEqual(seen, ['stable']);
});

test('falls back to beta only when stable lists no zip, as for a release whose firmware build failed', async () => {
  const stable = { tag: 'v1.1.2', assets: { pi: { url: 'p', sha256: 'c'.repeat(64) } } };
  const pick = await pickFromManifests(loader({ stable, beta: withZip('v1.2.0-beta.1') }));
  assert.equal(pick.tag, 'v1.2.0-beta.1');
});

test('picks nothing when no manifest lists a zip', async () => {
  assert.equal(await pickFromManifests(loader({ stable: { tag: 'v1.0.9', assets: {} }, beta: { tag: 'v1.0.9', assets: {} } })), null);
});

test('a listed zip with a malformed sha256 or a url off the release host fails instead of falling through', async () => {
  const beta = withZip('v1.2.0-beta.1');
  await assert.rejects(pickFromManifests(loader({ stable: withZip('v1.1.1', { sha256: 'not-a-hash' }), beta })), /malformed sha256/);
  await assert.rejects(
    pickFromManifests(loader({ stable: withZip('v1.1.1', { url: 'https://example.com/helixscreen-esp32-ktouch-v1.1.1.zip' }), beta })),
    /outside https:\/\/releases.helixscreen.org/,
  );
});

test('the zip is staged only when its sha256 is the one the manifest listed', () => {
  assert.doesNotThrow(() => checkZipHash(ZIP, ZIP_SHA));
  assert.throws(() => checkZipHash(Buffer.from('another zip'), ZIP_SHA), /is not the listed/);
});
