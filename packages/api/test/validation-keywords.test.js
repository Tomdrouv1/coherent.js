/**
 * The validator used to understand only type/required/properties (one level
 * deep)/minLength/maxLength/minimum/maximum/format:email. Everything else --
 * integer, enum, pattern, items, nested objects -- was silently accepted, and
 * a schema in the shape the `ValidationSchema` type documents (a field map)
 * validated every input as valid.
 *
 * Object routes with `validation:` also answered a 400 without saying which
 * field failed.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { validateAgainstSchema, validateField, withValidation, withQueryValidation } from '../src/validation.js';
import { SimpleRouter, createRouter } from '../src/router.js';
import { startServer, request, jsonInit } from './helpers/http.js';

const fields = (result) => result.errors.map((error) => error.field).sort();

describe('JSON-Schema keywords', () => {
  const schema = {
    type: 'object',
    required: ['constructor'],
    properties: {
      age: { type: 'integer', minimum: 0, maximum: 150 },
      role: { type: 'string', enum: ['user', 'editor'] },
      code: { type: 'string', pattern: '^[0-9]+$' },
      n: { type: 'number' },
      tags: { type: 'array', items: { type: 'string', maxLength: 5 }, maxItems: 3 },
      address: {
        type: 'object',
        required: ['zip'],
        properties: { zip: { type: 'string', minLength: 5, maxLength: 5 } }
      }
    }
  };

  it('rejects every keyword violation the audit found accepted', () => {
    const result = validateAgainstSchema(schema, {
      age: 'abc',
      role: 'admin',
      code: 'x',
      n: Number.NaN,
      tags: [1, {}],
      address: 'nope'
    });

    expect(result.valid).toBe(false);
    expect(fields(result)).toEqual(['address', 'age', 'code', 'constructor', 'n', 'role', 'tags[0]', 'tags[1]']);
  });

  it('checks own properties for `required`, not inherited ones', () => {
    const result = validateAgainstSchema({ type: 'object', required: ['constructor', 'toString'] }, {});
    expect(fields(result)).toEqual(['constructor', 'toString']);
  });

  it('rejects non-integers, and applies minimum/maximum to integers', () => {
    const rule = { type: 'integer', minimum: 1, maximum: 10 };
    expect(validateField(rule, 1.5, 'n').valid).toBe(false);
    expect(validateField(rule, 0, 'n').errors[0].message).toContain('at least 1');
    expect(validateField(rule, 11, 'n').errors[0].message).toContain('at most 10');
    expect(validateField(rule, 5, 'n').valid).toBe(true);
  });

  it('validates nested objects and array items with dotted paths', () => {
    const result = validateAgainstSchema(schema, {
      constructor: 'own',
      address: { zip: '123' },
      tags: ['ok', 'far-too-long', 'x', 'y']
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'address.zip', rule: 'minLength' }),
        expect.objectContaining({ field: 'tags[1]', rule: 'maxLength' }),
        expect.objectContaining({ field: 'tags', rule: 'maxItems' })
      ])
    );
    expect(result.errors).toHaveLength(3);
  });

  it('reports a missing nested required field', () => {
    const result = validateAgainstSchema(schema, { constructor: 'own', address: {} });
    expect(result.errors).toEqual([expect.objectContaining({ field: 'address.zip', rule: 'required' })]);
  });

  it('accepts a fully valid document', () => {
    const result = validateAgainstSchema(schema, {
      constructor: 'own',
      age: 30,
      role: 'editor',
      code: '0042',
      n: 1.5,
      tags: ['a', 'b'],
      address: { zip: '75001' }
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('supports formats, const, additionalProperties and min/maxProperties', () => {
    expect(validateField({ type: 'string', format: 'uuid' }, 'nope', 'id').valid).toBe(false);
    expect(validateField({ type: 'string', format: 'uuid' }, '123e4567-e89b-12d3-a456-426614174000', 'id').valid).toBe(true);
    expect(validateField({ type: 'string', format: 'url' }, 'not a url', 'u').valid).toBe(false);
    expect(validateField({ type: 'string', format: 'url' }, 'https://example.com/x', 'u').valid).toBe(true);
    expect(validateField({ const: 'v1' }, 'v2', 'version').valid).toBe(false);

    const closed = { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false, minProperties: 1 };
    expect(fields(validateAgainstSchema(closed, { name: 'a', admin: true }))).toEqual(['admin']);
    expect(validateAgainstSchema(closed, {}).errors[0].rule).toBe('minProperties');
  });

  it('accepts a RegExp pattern and does not carry lastIndex between calls', () => {
    const rule = { type: 'string', pattern: /^a+$/g };
    expect(validateField(rule, 'aaa', 'x').valid).toBe(true);
    expect(validateField(rule, 'aaa', 'x').valid).toBe(true);
    expect(validateField(rule, 'aab', 'x').valid).toBe(false);
  });
});

describe('field-map schemas (the ValidationSchema type)', () => {
  it('no longer validates everything as valid', () => {
    const schema = { email: { type: 'email', required: true } };

    expect(validateAgainstSchema(schema, {}).valid).toBe(false);
    expect(validateAgainstSchema(schema, { email: 'not-an-email' }).errors[0]).toMatchObject({
      field: 'email',
      message: 'Invalid email format'
    });
    expect(validateAgainstSchema(schema, { email: 'ada@example.com' }).valid).toBe(true);
  });

  it('applies min/max, enum, pattern, custom and message to fields', () => {
    const schema = {
      password: { type: 'string', required: true, min: 8 },
      age: { type: 'number', min: 18, max: 150 },
      plan: { type: 'string', enum: ['free', 'pro'] },
      slug: { type: 'string', pattern: /^[a-z-]+$/, message: 'Slug must be lowercase' },
      nickname: { type: 'string', custom: (value) => value !== 'root' || 'Reserved name' }
    };

    const result = validateAgainstSchema(schema, {
      password: 'short',
      age: 12,
      plan: 'enterprise',
      slug: 'Not A Slug',
      nickname: 'root'
    });

    expect(result.errors).toEqual([
      expect.objectContaining({ field: 'password', rule: 'min' }),
      expect.objectContaining({ field: 'age', rule: 'min' }),
      expect.objectContaining({ field: 'plan', rule: 'enum' }),
      { field: 'slug', message: 'Slug must be lowercase', rule: 'pattern' },
      { field: 'nickname', message: 'Reserved name', rule: 'custom' }
    ]);
  });

  it('validates nested field maps', () => {
    const schema = {
      name: { type: 'string', required: true },
      profile: {
        age: { type: 'integer', min: 0 },
        email: { type: 'email', required: true }
      }
    };

    const result = validateAgainstSchema(schema, { name: 'Ada', profile: { age: -1 } });

    expect(fields(result)).toEqual(['profile.age', 'profile.email']);
  });

  it('applies default, trim and transform to the returned data', () => {
    const schema = {
      name: { type: 'string', trim: true, required: true },
      role: { type: 'string', default: 'user' },
      tags: { type: 'array', transform: (value) => String(value).split(',') }
    };

    const result = validateAgainstSchema(schema, { name: '  Ada  ', tags: 'a,b' });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: 'Ada', role: 'user', tags: ['a', 'b'] });
  });

  it('honours nullable, abortEarly and stripUnknown', () => {
    expect(validateAgainstSchema({ note: { type: 'string', nullable: true } }, { note: null }).valid).toBe(true);
    expect(validateAgainstSchema({ note: { type: 'string' } }, { note: null }).valid).toBe(false);

    const strict = { a: { type: 'string' }, b: { type: 'string' } };
    expect(validateAgainstSchema(strict, { a: 1, b: 2 }, { abortEarly: true }).errors).toHaveLength(1);

    const stripped = validateAgainstSchema({ a: { type: 'string' } }, { a: 'x', extra: 1 }, { stripUnknown: true });
    expect(stripped.data).toEqual({ a: 'x' });
  });
});

describe('validation middleware over HTTP', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('object route answers 400 with the failing fields', async () => {
    const router = createRouter({
      api: {
        users: {
          POST: {
            validation: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
            handler: (req) => ({ created: req.body })
          }
        }
      }
    });
    server = await startServer(router);

    const res = await request(`${server.base}/api/users`, jsonInit('POST', { name: 42 }));

    expect(res.status).toBe(400);
    expect(res.json.error).toBe('Validation failed');
    expect(res.json.details.errors).toEqual([
      { field: 'name', message: 'Expected string, got number', rule: 'type' }
    ]);
  });

  it('withValidation as addRoute middleware answers 400, not 500', async () => {
    const ran = [];
    const router = new SimpleRouter();
    router.post('/users', () => ran.push('created'), {
      middleware: [withValidation({ email: { type: 'email', required: true } })]
    });
    server = await startServer(router);

    const res = await request(`${server.base}/users`, jsonInit('POST', {}));

    expect(res.status).toBe(400);
    expect(res.json.details.errors[0]).toMatchObject({ field: 'email', rule: 'required' });
    expect(ran).toEqual([]);
  });

  it('withValidation hands the handler the data with defaults applied', async () => {
    const router = new SimpleRouter();
    router.post('/users', (req) => ({ body: req.body }), {
      middleware: [withValidation({ name: { type: 'string', required: true }, role: { type: 'string', default: 'user' } })]
    });
    server = await startServer(router);

    const res = await request(`${server.base}/users`, jsonInit('POST', { name: 'Ada' }));

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ body: { name: 'Ada', role: 'user' } });
  });

  it('withQueryValidation converts numeric and boolean query strings', async () => {
    const router = new SimpleRouter();
    router.get('/items', (req) => ({ query: req.query }), {
      middleware: [withQueryValidation({ page: { type: 'integer', min: 1 }, draft: { type: 'boolean' } })]
    });
    server = await startServer(router);

    const ok = await request(`${server.base}/items?page=2&draft=true`);
    const bad = await request(`${server.base}/items?page=zero`);

    expect(ok.status).toBe(200);
    expect(ok.json).toEqual({ query: { page: 2, draft: true } });
    expect(bad.status).toBe(400);
  });
});
