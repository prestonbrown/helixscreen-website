import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog, buildWhatsNew, parseSummary } from '../scripts/gen-whatsnew.mjs';

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

test('featured entries are capped so the page cannot grow without bound', () => {
  const many = ['# Changelog', ''];
  for (let i = 20; i >= 1; i--) {
    many.push(`## [0.${i}.0] - 2026-01-0${(i % 9) + 1}`, '', '<!-- whatsnew', `Release ${i}:`, '', `- did thing ${i}`, '-->', '');
  }
  const out = buildWhatsNew(many.join('\n'), '0.20.0');
  assert.equal(out.featured.length, 5);
  assert.equal(out.featured[0].version, '0.20.0');
});

test('a changelog with no whatsnew block yields no featured entries, not a crash', () => {
  const out = buildWhatsNew('# Changelog\n\n## [1.0.0] - 2026-09-01\n\n### Added\n\n- Everything.\n', '1.0.0');
  assert.deepEqual(out.featured, []);
  assert.equal(out.history.length, 1);
});

test('CRLF line endings parse identically to LF', () => {
  const crlf = MD.replace(/\n/g, '\r\n');
  assert.deepEqual(
    parseChangelog(crlf).map((r) => r.version),
    parseChangelog(MD).map((r) => r.version)
  );
  const r = parseChangelog(crlf).find((x) => x.version === '0.99.115');
  assert.equal(r.summary.lead, 'The second 1.0 release candidate. Highlights:');
  assert.equal(r.summary.bullets.length, 2);
  // A trailing \r must not survive into the rendered text.
  assert.ok(!r.summary.bullets.some((b) => b.includes('\r')));
});

test('a bullet containing an arrow does not truncate the block', () => {
  const md = `## [1.0.0] - 2026-09-01

<!-- whatsnew
Highlights:

- The print job moves from Idle --> Printing without a stall
- A second bullet that must survive
-->

### Added

- Something.
`;
  const r = parseChangelog(md)[0];
  assert.equal(r.summary.bullets.length, 2);
  assert.match(r.summary.bullets[0], /Idle --> Printing/);
  assert.equal(r.summary.bullets[1], 'A second bullet that must survive');
});

test('an unterminated whatsnew block yields no summary rather than swallowing the file', () => {
  const md = `## [1.0.0] - 2026-09-01

<!-- whatsnew
Highlights:

- A bullet with no closing marker

### Added

- Something.
`;
  assert.equal(parseChangelog(md)[0].summary, null);
});

const PRERELEASE_MD = `# Changelog

## [1.0.0] - 2026-09-09

<!-- whatsnew
The first stable release.
-->

## [1.0.0-rc.1] - 2026-09-02

<!-- whatsnew
The first 1.0 release candidate.
-->

## [0.99.118] - 2026-08-30

<!-- whatsnew
An ordinary release.
-->
`;

test('flags prereleases by their semver identifier', () => {
  const releases = parseChangelog(PRERELEASE_MD);
  assert.equal(releases.find((r) => r.version === '1.0.0-rc.1').prerelease, true);
  assert.equal(releases.find((r) => r.version === '1.0.0').prerelease, false);
  assert.equal(releases.find((r) => r.version === '0.99.118').prerelease, false);
});

test('never features a prerelease, even when it carries a summary', () => {
  const out = buildWhatsNew(PRERELEASE_MD, '1.0.0');
  assert.deepEqual(out.featured.map((r) => r.version), ['1.0.0', '0.99.118']);
});

test('history keeps prereleases visible, so the record stays complete', () => {
  const out = buildWhatsNew(PRERELEASE_MD, '1.0.0');
  assert.deepEqual(out.history.map((r) => r.version), ['1.0.0', '1.0.0-rc.1', '0.99.118']);
});

// The shape most releases use: one lead line, then bullets.
test('a lead followed by bullets yields no body paragraphs', () => {
  const s = parseSummary('The fifth release candidate. Highlights:\n\n- One thing\n- Another thing\n');
  assert.equal(s.lead, 'The fifth release candidate. Highlights:');
  assert.deepEqual(s.body, []);
  assert.deepEqual(s.bullets, ['One thing', 'Another thing']);
});

// A block written as prose keeps all of it. Splitting on lines rather than
// paragraphs would keep only the opening sentence and drop the rest silently.
test('prose paragraphs are all kept, not just the opening line', () => {
  const s = parseSummary([
    'The first stable release.',
    '',
    'Everything your printer can do, on the screen',
    'already attached to it.',
    '',
    'Coming from 0.99, this is an ordinary update.',
  ].join('\n'));
  assert.equal(s.lead, 'The first stable release.');
  assert.deepEqual(s.body, [
    'Everything your printer can do, on the screen already attached to it.',
    'Coming from 0.99, this is an ordinary update.',
  ]);
  assert.deepEqual(s.bullets, []);
});

test('hard-wrapped prose is rejoined rather than split into paragraphs', () => {
  const s = parseSummary('One sentence broken\nacross two lines.\n');
  assert.equal(s.lead, 'One sentence broken across two lines.');
  assert.deepEqual(s.body, []);
});

// Without a blank line between them, a naive paragraph split would swallow the
// bullets into the lead.
test('a bullet ends the paragraph above it even with no blank line', () => {
  const s = parseSummary('Highlights:\n- One thing\n- Another\n');
  assert.equal(s.lead, 'Highlights:');
  assert.deepEqual(s.body, []);
  assert.deepEqual(s.bullets, ['One thing', 'Another']);
});

test('an empty block yields no lead, body or bullets', () => {
  const s = parseSummary('\n  \n');
  assert.equal(s.lead, null);
  assert.deepEqual(s.body, []);
  assert.deepEqual(s.bullets, []);
});

test('featured entries carry the body through to the page', () => {
  const md = `# Changelog\n\n## [1.0.0] - 2026-09-09\n\n<!-- whatsnew\nThe first stable release.\n\nA second paragraph that must survive.\n-->\n`;
  const out = buildWhatsNew(md, '1.0.0');
  assert.deepEqual(out.featured[0].body, ['A second paragraph that must survive.']);
});
