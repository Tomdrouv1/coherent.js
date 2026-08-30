/**
 * Parse the repository CHANGELOG.md into entries the changelog page renders.
 *
 * The page used to hardcode its own copy of the release history, which fell
 * four releases behind and still badged a release candidate as current.
 * Reading the canonical file means the page cannot drift from it.
 *
 * @module website/changelog
 */

import { readFileSync } from 'node:fs';
import { marked } from 'marked';

/** `## [1.2.3] - 2026-08-30`, or `## [Unreleased]` with no date. */
const ENTRY_HEADING = /^## \[([^\]]+)\](?:\s*-\s*(\S+))?\s*$/;

/**
 * Split changelog markdown into `{ version, date, body }` records.
 *
 * Everything above the first entry heading — the title, the intro and the
 * version timeline — is preamble and is dropped. An entry with no body, which
 * `[Unreleased]` usually is, is dropped too rather than rendering an empty
 * card.
 *
 * @param {string} markdown - Contents of CHANGELOG.md
 * @returns {Array<{version: string, date: string|null, body: string}>} Entries in file order
 */
export function parseChangelog(markdown) {
  const entries = [];
  let current = null;

  for (const line of markdown.split('\n')) {
    const heading = ENTRY_HEADING.exec(line);
    if (heading) {
      if (current) entries.push(current);
      current = { version: heading[1], date: heading[2] ?? null, body: '' };
      continue;
    }
    if (current) current.body += `${line}\n`;
  }
  if (current) entries.push(current);

  return entries
    .map((entry) => ({ ...entry, body: entry.body.trim() }))
    .filter((entry) => entry.body !== '');
}

/**
 * Read and render the changelog for the page.
 *
 * Bodies are rendered to HTML here rather than in the component, so the page
 * stays a plain data-in/markup-out function. `marked` is already configured
 * with the site's syntax highlighter by the time this runs.
 *
 * @param {string} changelogPath - Absolute path to CHANGELOG.md
 * @returns {Array<{version: string, date: string|null, html: string, isCurrent: boolean}>}
 */
export function loadChangelog(changelogPath) {
  const entries = parseChangelog(readFileSync(changelogPath, 'utf-8'));

  // The newest released version leads the file; `[Unreleased]` is not a
  // release and must not take the badge.
  const currentIndex = entries.findIndex((entry) => entry.date !== null);

  return entries.map((entry, index) => ({
    version: entry.version,
    date: entry.date,
    html: marked.parse(entry.body),
    isCurrent: index === currentIndex,
  }));
}
