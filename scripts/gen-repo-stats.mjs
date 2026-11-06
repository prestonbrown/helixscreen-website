#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Turn the output of `git rev-list --count HEAD` into page data.
 *
 * Returns null for anything that is not a whole positive count, so the caller
 * can decide what to do rather than publish a number the page would state as
 * fact. `commitsDisplay` is grouped here so no component has to format it.
 *
 * A shallow clone counts only the commits it fetched (1 at depth 1), so a count
 * from one is refused too.
 */
export function buildRepoStats(revListOutput, { shallow = false } = {}) {
  if (shallow) return null;
  const commits = Number(String(revListOutput).trim());
  if (!Number.isInteger(commits) || commits <= 0) return null;
  return { commits, commitsDisplay: commits.toLocaleString('en-US') };
}

/**
 * The output is not committed, so a build without a countable helixscreen
 * checkout writes an empty count and the hero leaves the stat out. CI always
 * has the full history, so there a missing count fails the build instead of
 * quietly dropping the stat from the live site.
 */
function noCount(reason) {
  if (process.env.CI) {
    console.error(`[gen-repo-stats] ${reason}`);
    process.exit(1);
  }
  console.warn(`[gen-repo-stats] ${reason}; the commit stat is left off the page.`);
  return { commits: null, commitsDisplay: null };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = join(root, '..', 'helixscreen');
  let out;
  try {
    // stderr is captured rather than inherited so a failure reports as the one
    // warning below instead of git writing separately into the build log.
    const git = (...args) => execFileSync('git', ['-C', src, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const shallow = git('rev-parse', '--is-shallow-repository').trim() === 'true';
    out = buildRepoStats(git('rev-list', '--count', 'HEAD'), { shallow });
  } catch (err) {
    const detail = String(err.stderr ?? '').trim().split('\n').pop() || err.code || err.message;
    out = noCount(`${src} unavailable (${detail})`);
  }

  // A repository with no commits is not a state this site can be built from, so
  // an unusable count means git answered something this generator did not expect.
  // Writing it would replace a real number with a claim that the project has
  // never been committed to, and still exit clean.
  if (!out) out = noCount('no usable commit count from git (shallow clone?)');

  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'repo.generated.json'),
    JSON.stringify(out, null, 2) + '\n'
  );
  if (out.commits) console.log(`[gen-repo-stats] wrote ${out.commitsDisplay} commits`);
}
