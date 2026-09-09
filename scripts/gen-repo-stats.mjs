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
 */
export function buildRepoStats(revListOutput) {
  const commits = Number(String(revListOutput).trim());
  if (!Number.isInteger(commits) || commits <= 0) return null;
  return { commits, commitsDisplay: commits.toLocaleString('en-US') };
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
    const count = execFileSync('git', ['-C', src, 'rev-list', '--count', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    out = buildRepoStats(count);
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    const detail = String(err.stderr ?? '').trim().split('\n').pop() || err.code || err.message;
    console.warn(`[gen-repo-stats] ${src} unavailable (${detail}); keeping committed output.`);
    process.exit(0);
  }

  // A repository with no commits is not a state this site can be built from, so
  // an unusable count means git answered something this generator did not expect.
  // Writing it would replace a real number with a claim that the project has
  // never been committed to, and still exit clean.
  if (!out) {
    console.warn('[gen-repo-stats] no usable commit count from git; keeping committed output.');
    process.exit(0);
  }

  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'repo.generated.json'),
    JSON.stringify(out, null, 2) + '\n'
  );
  console.log(`[gen-repo-stats] wrote ${out.commitsDisplay} commits`);
}
