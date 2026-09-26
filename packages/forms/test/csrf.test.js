/**
 * CSRF support: session-bound HMAC tokens on a server-only subpath, and a
 * hidden `_csrf` input rendered by the form builder.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render } from '@coherent.js/core';
import { createCsrfToken, verifyCsrfToken, CSRF_FIELD_NAME } from '../src/csrf.js';
import * as root from '../src/index.js';

const SECRET = 'a-long-random-server-secret';
const NOW = Date.UTC(2026, 0, 1);

describe('createCsrfToken / verifyCsrfToken', () => {
  it('round-trips for the same secret and session', () => {
    const token = createCsrfToken(SECRET, 'session-1');
    expect(token).toMatch(/^[0-9a-z]+\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
    expect(verifyCsrfToken(token, SECRET, 'session-1')).toBe(true);
  });

  it('issues a different token each time', () => {
    expect(createCsrfToken(SECRET, 's')).not.toBe(createCsrfToken(SECRET, 's'));
  });

  it('rejects a token from another session', () => {
    const token = createCsrfToken(SECRET, 'session-1');
    expect(verifyCsrfToken(token, SECRET, 'session-2')).toBe(false);
  });

  it('rejects a token signed with another secret', () => {
    const token = createCsrfToken('another-secret', 'session-1');
    expect(verifyCsrfToken(token, SECRET, 'session-1')).toBe(false);
  });

  it('rejects a tampered token', () => {
    const [issuedAt, nonce, mac] = createCsrfToken(SECRET, 'session-1', { now: NOW }).split('.');
    const flipped = mac[0] === 'A' ? `B${mac.slice(1)}` : `A${mac.slice(1)}`;

    expect(verifyCsrfToken(`${issuedAt}.${nonce}.${flipped}`, SECRET, 'session-1')).toBe(false);
    expect(verifyCsrfToken(`${(NOW + 1).toString(36)}.${nonce}.${mac}`, SECRET, 'session-1')).toBe(false);
  });

  it('rejects missing and malformed tokens without throwing', () => {
    for (const token of [undefined, null, '', 'abc', 'a.b.c', 42, {}, ['x']]) {
      expect(verifyCsrfToken(token, SECRET, 'session-1')).toBe(false);
    }
    expect(verifyCsrfToken(createCsrfToken(SECRET, 's'), SECRET, '')).toBe(false);
  });

  it('enforces maxAge', () => {
    const token = createCsrfToken(SECRET, 'session-1', { now: NOW });
    const hour = 60 * 60 * 1000;

    expect(verifyCsrfToken(token, SECRET, 'session-1', { maxAge: hour, now: NOW + hour })).toBe(true);
    expect(verifyCsrfToken(token, SECRET, 'session-1', { maxAge: hour, now: NOW + hour + 1 })).toBe(false);
    // Tolerates a little clock skew between servers, not a far-future token.
    expect(verifyCsrfToken(token, SECRET, 'session-1', { maxAge: hour, now: NOW - 1000 })).toBe(true);
    expect(verifyCsrfToken(token, SECRET, 'session-1', { maxAge: hour, now: NOW - hour })).toBe(false);
  });

  it('requires a secret and a session id to create a token', () => {
    expect(() => createCsrfToken('', 'session-1')).toThrow(TypeError);
    expect(() => createCsrfToken(undefined, 'session-1')).toThrow(TypeError);
    expect(() => createCsrfToken(SECRET, '')).toThrow(TypeError);
    expect(() => verifyCsrfToken('x', undefined, 'session-1')).toThrow(TypeError);
  });
});

describe('buildForm({ csrfToken })', () => {
  it('renders the token as the first, hidden input', () => {
    const form = root.createFormBuilder({ action: '/save', method: 'post', submitButton: false })
      .field('title', { type: 'text' });

    expect(render(form.buildForm({ csrfToken: 'tok"en' }))).toBe(
      '<form action="/save" method="post" name="form">' +
      '<input type="hidden" name="_csrf" value="tok&quot;en">' +
      '<div data-field="title" class="form-field"><label for="title">title</label>' +
      '<input type="text" name="title" id="title" value="" aria-invalid="false"></div>' +
      '</form>'
    );
  });

  it('uses csrfFieldName when given', () => {
    const node = root.buildForm({ fields: [], submitButton: false, csrfToken: 't', csrfFieldName: 'authenticity_token' });
    expect(node.form.children[0]).toEqual({ input: { type: 'hidden', name: 'authenticity_token', value: 't' } });
    expect(CSRF_FIELD_NAME).toBe('_csrf');
  });

  it('renders nothing extra without a token', () => {
    const node = root.buildForm({ fields: [], submitButton: false });
    expect(node.form.children).toEqual([]);
  });

  it('round-trips a real token through the rendered form', () => {
    const token = createCsrfToken(SECRET, 'session-1');
    const html = render(root.buildForm({ fields: [], csrfToken: token }));
    const submitted = html.match(/name="_csrf" value="([^"]+)"/)[1];

    expect(verifyCsrfToken(submitted, SECRET, 'session-1')).toBe(true);
  });
});

describe('isomorphic entry points', () => {
  it('keeps the CSRF helpers off the package root', () => {
    expect(root.createCsrfToken).toBeUndefined();
    expect(root.verifyCsrfToken).toBeUndefined();
  });

  it('never imports node:crypto from a module the root reaches', () => {
    const src = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
    const seen = new Set();
    const visit = (name) => {
      if (seen.has(name)) return;
      seen.add(name);
      const code = src(name);
      expect(code, name).not.toMatch(/from\s+['"]node:/);
      for (const [, dep] of code.matchAll(/from\s+['"]\.\/([\w-]+\.js)['"]/g)) visit(dep);
    };

    visit('index.js');
    expect([...seen].sort()).toEqual([
      'form-builder.js', 'form-hydration.js', 'index.js', 'patterns.js',
      'rules.js', 'validation.js', 'validators.js'
    ]);
    expect(src('csrf.js')).toMatch(/from 'node:crypto'/);
  });
});
