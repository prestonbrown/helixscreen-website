#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read release sections out of a Keep-a-Changelog file.
 *
 * A heading looks like `## [0.99.115] - 2026-08-20`, optionally suffixed
 * `[WITHDRAWN]`. Headings without a date (`## [Unreleased]`) are not releases
 * and are dropped.
 */
/**
 * Split a whatsnew block into prose paragraphs and bullets.
 *
 * Changelog prose is hard-wrapped, so the lines of one paragraph are rejoined;
 * a blank line or a bullet ends it. `lead` is the first paragraph and `body`
 * the rest, so a block written as prose keeps all of it rather than only its
 * opening line. A lead followed by bullets yields an empty `body`.
 */
export function parseSummary(raw) {
  const bullets = [];
  const prose = [];
  let para = [];
  const flush = () => {
    if (para.length) { prose.push(para.join(' ')); para = []; }
  };
  for (const line of raw.split('\n')) {
    const l = line.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith('- ')) { flush(); bullets.push(l.slice(2).trim()); continue; }
    para.push(l);
  }
  flush();
  return { lead: prose[0] ?? null, body: prose.slice(1), bullets };
}

export function parseChangelog(md) {
  // Normalise line endings before anything else: a lone \r left on a heading line
  // defeats the heading regex silently, and every release drops out with no error.
  const text = md.replace(/\r\n/g, '\n');
  return text
    .split(/^## \[/m)
    .slice(1)
    .map((raw) => {
      const nl = raw.indexOf('\n');
      const head = nl === -1 ? raw : raw.slice(0, nl);
      const body = nl === -1 ? '' : raw.slice(nl + 1);

      const heading = head.match(/^([^\]]+)\]\s*-\s*(\S+)(.*)$/);
      if (!heading) return null;
      const [, version, date, rest] = heading;

      // The terminator must be on its own line. A bare lazy match to the first
      // `-->` truncates the block at any bullet that happens to contain one,
      // dropping the rest of the summary with no error.
      const block = body.match(/<!--\s*whatsnew\s*\n([\s\S]*?)\n\s*-->/);
      const summary = block ? parseSummary(block[1]) : null;

      return {
        version,
        date,
        withdrawn: /WITHDRAWN/i.test(rest),
        // Semver: anything after the first `-` is a prerelease identifier.
        prerelease: version.includes('-'),
        summary,
      };
    })
    .filter(Boolean);
}

export function buildWhatsNew(md, version, historyLimit = 12, featuredLimit = 5) {
  const releases = parseChangelog(md);
  return {
    version,
    // A withdrawn release is one we asked people not to run, and a prerelease is
    // superseded by the release it led to. Both keep their row in the history so
    // the record stays honest, but neither is ever featured.
    // Capped: every summary block ever written stays in the changelog forever,
    // so without a limit this list only grows and the page becomes an
    // unbounded stack of articles as the convention gets used more.
    featured: releases
      .filter((r) => r.summary && !r.withdrawn && !r.prerelease)
      .map((r) => ({
        version: r.version,
        date: r.date,
        lead: r.summary.lead,
        body: r.summary.body,
        bullets: r.summary.bullets,
      }))
      .slice(0, featuredLimit),
    history: releases.slice(0, historyLimit).map((r) => ({
      version: r.version,
      date: r.date,
      withdrawn: r.withdrawn,
    })),
  };
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = join(root, '..', 'helixscreen');
  let md, built;
  try {
    md = readFileSync(join(src, 'CHANGELOG.md'), 'utf8');
    built = buildWhatsNew(md, readFileSync(join(src, 'VERSION.txt'), 'utf8').trim());
  } catch (err) {
    // Committed output means a checkout without the sibling repo still builds.
    console.warn(`[gen-whatsnew] ${src} unavailable (${err.code ?? err.message}); keeping committed output.`);
    process.exit(0);
  }

  // Parsing nothing out of a non-empty changelog means the format moved out from
  // under this regex. Writing that result would replace good committed data with
  // an empty page and still exit clean, so refuse and keep what is already there.
  if (built.history.length === 0 && md.trim() !== '') {
    console.warn('[gen-whatsnew] parsed 0 releases from a non-empty CHANGELOG.md; keeping committed output.');
    process.exit(0);
  }

  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'data', 'whatsnew.generated.json'),
    JSON.stringify(built, null, 2) + '\n'
  );
  console.log(`[gen-whatsnew] version ${built.version}, ${built.featured.length} featured, ${built.history.length} in history`);
}
