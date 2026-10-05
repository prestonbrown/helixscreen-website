import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFlashArgs, buildManifest, pickRelease, stagePackage } from '../scripts/stage-esp32-firmware.mjs';

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

test('finds the newest release carrying the zip, prereleases included', () => {
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
