import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog, buildWhatsNew } from '../scripts/gen-whatsnew.mjs';

const MD = `# Changelog

Preamble prose that is not a release.

## [0.99.115] - 2026-08-20

<!-- whatsnew
The second 1.0 release candidate. Highlights:

- Printers are no longer guessed at from thin evidence
- Buttons no longer send macros your printer does not have
-->

**This is the second 1.0 release candidate.**

### Added

- A thing.

## [0.99.110] - 2026-08-11 [WITHDRAWN]

### Fixed

- Something that turned out to be worse.

## [0.99.108] - 2026-08-09

### Fixed

- An ordinary fix with no summary block.

## [Unreleased]

- Not a release; has no date.
`;

test('reads every dated release heading', () => {
  const releases = parseChangelog(MD);
  assert.deepEqual(releases.map((r) => r.version), ['0.99.115', '0.99.110', '0.99.108']);
});

test('ignores headings with no date, such as Unreleased', () => {
  assert.ok(!parseChangelog(MD).some((r) => r.version === 'Unreleased'));
});

test('flags withdrawn releases', () => {
  const releases = parseChangelog(MD);
  assert.equal(releases.find((r) => r.version === '0.99.110').withdrawn, true);
  assert.equal(releases.find((r) => r.version === '0.99.115').withdrawn, false);
});

test('pulls the lead and the bullets out of a whatsnew block', () => {
  const r = parseChangelog(MD).find((x) => x.version === '0.99.115');
  assert.equal(r.summary.lead, 'The second 1.0 release candidate. Highlights:');
  assert.deepEqual(r.summary.bullets, [
    'Printers are no longer guessed at from thin evidence',
    'Buttons no longer send macros your printer does not have',
  ]);
});

test('a release without a whatsnew block has no summary', () => {
  assert.equal(parseChangelog(MD).find((r) => r.version === '0.99.108').summary, null);
});

test('features only summarised releases, and never a withdrawn one', () => {
  const out = buildWhatsNew(MD, '0.99.115');
  assert.deepEqual(out.featured.map((f) => f.version), ['0.99.115']);
});

test('history is capped and keeps withdrawn releases visible', () => {
  const out = buildWhatsNew(MD, '0.99.115', 2);
  assert.deepEqual(out.history.map((h) => h.version), ['0.99.115', '0.99.110']);
  assert.equal(out.history[1].withdrawn, true);
});

test('a changelog with no whatsnew block yields no featured entries, not a crash', () => {
  const out = buildWhatsNew('# Changelog\n\n## [1.0.0] - 2026-09-01\n\n### Added\n\n- Everything.\n', '1.0.0');
  assert.deepEqual(out.featured, []);
  assert.equal(out.history.length, 1);
});
