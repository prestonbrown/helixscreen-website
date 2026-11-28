import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, generateKeyPairSync, randomBytes, sign as cryptoSign } from 'node:crypto';
import {
  parseFlashArgs,
  buildManifest,
  pickRelease,
  stagePackage,
  verifyChannelManifest,
  manifestRefusesZip,
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

const rel = (tag, date, assets, extra = {}) => ({
  tag_name: tag,
  published_at: date,
  draft: false,
  prerelease: false,
  assets: assets.map((name) => ({ name })),
  ...extra,
});

test('prefers the newest stable release with the zip over a newer prerelease', () => {
  // 2026-11-24: v1.2.0-alpha.1 published after v1.1.0 and became "newest with the zip".
  const releases = [
    rel('v1.2.0-alpha.1', '2026-11-24T16:17:00Z', ['helixscreen-esp32-ktouch-v1.2.0-alpha.1.zip'], { prerelease: true }),
    rel('v1.1.0', '2026-11-24T03:20:00Z', ['helixscreen-esp32-ktouch-v1.1.0.zip']),
    rel('v1.1.0-rc.6', '2026-11-23T02:18:00Z', ['helixscreen-esp32-ktouch-v1.1.0-rc.6.zip'], { prerelease: true }),
  ];
  assert.deepEqual(pickRelease(releases), {
    tag: 'v1.1.0',
    asset: 'helixscreen-esp32-ktouch-v1.1.0.zip',
  });
});

test('picks the newest stable release with the zip, not the newest stable without one', () => {
  // A stable release whose firmware build failed ships without the zip; the previous
  // stable build is served rather than jumping to a prerelease.
  const releases = [
    rel('v1.1.1', '2026-12-01T00:00:00Z', ['helixscreen-pi-v1.1.1.tar.gz']),
    rel('v1.1.0', '2026-11-24T03:20:00Z', ['helixscreen-esp32-ktouch-v1.1.0.zip']),
    rel('v1.2.0-alpha.1', '2026-11-24T16:17:00Z', ['helixscreen-esp32-ktouch-v1.2.0-alpha.1.zip'], { prerelease: true }),
  ];
  assert.equal(pickRelease(releases).tag, 'v1.1.0');
});

test('falls back to the newest prerelease with the zip when no stable release has one', () => {
  // The situation before 1.1.0: every K-Touch zip lives on a prerelease.
  const releases = [
    rel('v1.0.3', '2026-10-04T00:00:00Z', ['helixscreen-pi-v1.0.3.tar.gz']),
    rel('v1.1.0-beta.4', '2026-10-01T00:00:00Z', ['helixscreen-esp32-ktouch-v1.1.0-beta.4.zip'], { prerelease: true }),
    rel('v1.1.0-beta.3', '2026-09-20T00:00:00Z', ['helixscreen-esp32-ktouch-v1.1.0-beta.3.zip'], { prerelease: true }),
  ];
  assert.deepEqual(pickRelease(releases), {
    tag: 'v1.1.0-beta.4',
    asset: 'helixscreen-esp32-ktouch-v1.1.0-beta.4.zip',
  });
});

test('orders by publish date, not by list position', () => {
  const releases = [
    rel('v1.1.0-beta.3', '2026-09-20T00:00:00Z', ['helixscreen-esp32-ktouch-v1.1.0-beta.3.zip']),
    rel('v1.1.0-beta.4', '2026-10-01T00:00:00Z', ['helixscreen-esp32-ktouch-v1.1.0-beta.4.zip']),
  ];
  assert.equal(pickRelease(releases).tag, 'v1.1.0-beta.4');
});

test('skips drafts', () => {
  const releases = [
    rel('v1.1.0-beta.5', null, ['helixscreen-esp32-ktouch-v1.1.0-beta.5.zip'], { draft: true, created_at: '2026-10-05T00:00:00Z' }),
    rel('v1.1.0-beta.4', '2026-10-01T00:00:00Z', ['helixscreen-esp32-ktouch-v1.1.0-beta.4.zip']),
  ];
  assert.equal(pickRelease(releases).tag, 'v1.1.0-beta.4');
});

test('returns null when no release has the zip, as with 1.0.x only', () => {
  assert.equal(pickRelease([rel('v1.0.3', '2026-10-04T00:00:00Z', ['helixscreen-pi-v1.0.3.tar.gz'])]), null);
  assert.equal(pickRelease([]), null);
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
  const parsed = verifyChannelManifest(m, sign(m, 'file:manifest.json channel:stable'), 'stable', { release: pub });
  assert.equal(parsed.tag, 'v1.1.1');
});

test('a manifest changed after signing is refused', () => {
  const { pub, sign } = minisignPair();
  const sig = sign(channelManifest('v1.1.1'), 'file:manifest.json channel:stable');
  assert.throws(
    () => verifyChannelManifest(channelManifest('v1.1.1', 'f'.repeat(64)), sig, 'stable', { release: pub }),
    /does not match the manifest/,
  );
});

test('a manifest signed for another channel is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, sign(m, 'file:manifest.json channel:beta'), 'stable', { release: pub }),
    /not for the stable channel/,
  );
});

test('a trusted comment swapped after signing is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  const sig = sign(m, 'file:manifest.json channel:beta').replace('channel:beta', 'channel:stable');
  assert.throws(() => verifyChannelManifest(m, sig, 'stable', { release: pub }), /trusted comment does not match/);
});

test('a signature by another key is refused', () => {
  const { pub } = minisignPair();
  const other = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, other.sign(m, 'file:manifest.json channel:stable'), 'stable', { release: pub }),
    /other than the release key/,
  );
});

test('a legacy signature over the raw file is refused', () => {
  const { pub, sign } = minisignPair();
  const m = channelManifest('v1.1.1');
  assert.throws(
    () => verifyChannelManifest(m, sign(m, 'file:manifest.json channel:stable', { alg: 'Ed' }), 'stable', { release: pub }),
    /legacy/,
  );
});

test('the dev key is trusted on the dev channel and nowhere else', () => {
  const release = minisignPair();
  const dev = minisignPair();
  const keys = { release: release.pub, dev: dev.pub };
  const m = channelManifest('v1.2.0-alpha.2');
  assert.equal(verifyChannelManifest(m, dev.sign(m, 'file:manifest.json channel:dev'), 'dev', keys).tag, 'v1.2.0-alpha.2');
  assert.throws(() => verifyChannelManifest(m, dev.sign(m, 'file:manifest.json channel:stable'), 'stable', keys), /other than the release key/);
});

test('the manifest vouches for the zip only with its tag and its sha256', () => {
  const manifest = JSON.parse(channelManifest('v1.1.1').toString());
  assert.equal(manifestRefusesZip(manifest, 'v1.1.1', ZIP), null);
  assert.match(manifestRefusesZip(manifest, 'v1.1.1', Buffer.from('another zip')), /sha256/);
  assert.match(manifestRefusesZip(manifest, 'v1.1.0', ZIP), /not v1.1.0/);
  assert.match(manifestRefusesZip({ tag: 'v1.1.1', assets: {} }, 'v1.1.1', ZIP), /no esp32-ktouch/);
});
