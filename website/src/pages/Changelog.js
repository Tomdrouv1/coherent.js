// Changelog.js - Version history and release notes.
//
// Entries come from the repository CHANGELOG.md, parsed by ../changelog.js and
// passed in as props. This page holds no release history of its own: the copy
// it used to keep fell four releases behind and still badged a release
// candidate as current.

import { dangerouslySetInnerContent } from '@coherent.js/core';

/**
 * Render one release as a timeline card.
 *
 * The body is already HTML, rendered from the changelog markdown. Its heading
 * and list markup lines up with the existing .changelog-changes styles.
 *
 * @param {{version: string, date: string|null, html: string, isCurrent: boolean}} entry
 * @returns {object} Coherent node
 */
function ChangelogEntry({ version, date, html, isCurrent }) {
  const header = [{ span: { className: 'changelog-version', text: `v${version}` } }];
  if (date) header.push({ span: { className: 'changelog-date', text: date } });
  if (isCurrent) {
    header.push({
      span: { className: 'changelog-badge changelog-badge-current', text: 'Current' },
    });
  }

  return {
    article: {
      className: 'changelog-entry',
      children: [
        { div: { className: 'changelog-entry-header', children: header } },
        { div: { className: 'changelog-changes', children: [dangerouslySetInnerContent(html)] } },
      ],
    },
  };
}

/**
 * Changelog page.
 *
 * @param {Object} [props]
 * @param {Array<object>} [props.entries] - Parsed changelog entries, newest first
 * @returns {object} Coherent node
 */
export function Changelog({ entries = [] } = {}) {
  const timeline = entries.length
    ? entries.map(ChangelogEntry)
    : [{ p: { className: 'changelog-empty', text: 'No release notes available.' } }];

  return {
    div: {
      className: 'changelog-page',
      children: [
        {
          div: {
            className: 'page-header',
            children: [
              { h1: { text: 'Changelog' } },
              {
                p: {
                  className: 'page-lead',
                  text: 'All notable changes to Coherent.js, following Semantic Versioning.',
                },
              },
            ],
          },
        },
        { section: { className: 'changelog-timeline', children: timeline } },
      ],
    },
  };
}
