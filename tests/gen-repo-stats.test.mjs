import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRepoStats } from '../scripts/gen-repo-stats.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('groups thousands so the page does no formatting of its own', () => {
  assert.equal(buildRepoStats('12437').commitsDisplay, '12,437');
  assert.equal(buildRepoStats('1000000').commitsDisplay, '1,000,000');
});

test('leaves counts below a thousand ungrouped', () => {
  assert.equal(buildRepoStats('1').commitsDisplay, '1');
  assert.equal(buildRepoStats('999').commitsDisplay, '999');
});

test('commits stays a number, so a caller can compare or sum it', () => {
  const out = buildRepoStats('12437');
  assert.equal(out.commits, 12437);
  assert.equal(typeof out.commits, 'number');
  assert.equal(typeof out.commitsDisplay, 'string');
});

test('git output survives its trailing newline and surrounding whitespace', () => {
  for (const raw of ['12437\n', '  12437  ', '\t12437\r\n', '12437\n\n']) {
    assert.equal(buildRepoStats(raw).commits, 12437, `failed on ${JSON.stringify(raw)}`);
  }
});

test('refuses a zero count rather than announcing an uncommitted project', () => {
  assert.equal(buildRepoStats('0'), null);
  assert.equal(buildRepoStats('0\n'), null);
});

test('refuses a negative count', () => {
  assert.equal(buildRepoStats('-1'), null);
});

test('refuses output that is not a number at all', () => {
  for (const raw of ['', '   ', 'fatal: not a git repository', 'NaN', 'undefined']) {
    assert.equal(buildRepoStats(raw), null, `accepted ${JSON.stringify(raw)}`);
  }
});

// parseInt would take the leading digits off any of these and publish them.
test('refuses a number with trailing junk rather than reading a prefix', () => {
  assert.equal(buildRepoStats('12437 fatal: bad revision'), null);
  assert.equal(buildRepoStats('12437abc'), null);
});

test('refuses a fractional count', () => {
  assert.equal(buildRepoStats('12437.5'), null);
  assert.equal(buildRepoStats('1e400'), null);
});

test('the committed output is a usable count and its display string matches', () => {
  const data = JSON.parse(readFileSync(join(root, 'src', 'data', 'repo.generated.json'), 'utf8'));
  assert.ok(Number.isInteger(data.commits) && data.commits > 0, 'committed commit count is unusable');
  assert.equal(data.commitsDisplay, buildRepoStats(String(data.commits)).commitsDisplay);
});
