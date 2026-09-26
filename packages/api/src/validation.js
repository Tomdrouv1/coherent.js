/**
 * API Validation for Coherent.js
 * @fileoverview Schema-based validation utilities
 *
 * Two schema shapes are accepted, and may be mixed:
 *
 * - JSON-Schema style: `{ type: 'object', required: ['name'], properties: {
 *   name: { type: 'string', minLength: 1 } } }`
 * - Field-map style (the `ValidationSchema` type): `{ name: { type: 'string',
 *   required: true, min: 1 }, profile: { age: { type: 'integer' } } }`
 *
 * Keywords: type (string, number, integer, boolean, array, object, null,
 * date, email, url, uuid, phone, credit-card, or an array of types), required
 * (array on an object, or `true` on a field), nullable, enum, const, pattern,
 * format, minLength/maxLength, minimum/maximum, exclusiveMinimum/
 * exclusiveMaximum, min/max (value for numbers, length for strings and
 * arrays), minItems/maxItems, items, properties, additionalProperties,
 * minProperties/maxProperties, custom, message, trim, transform and default.
 *
 * A keyword the validator does not know is ignored, as JSON Schema does for
 * annotations.
 */

import { ValidationError } from './errors.js';

/**
 * Email shape check: a local part, then a dotted domain.
 *
 * Domain labels use `[^\s@.]` rather than `[^\s@]` so that the literal dot
 * separators are the only thing that can match a dot. Allowing `[^\s@]+` on
 * both sides of `\.` makes the split ambiguous, and a non-matching subject
 * with many dots ("a@" + "a." * n + " ") then costs O(n²) backtracking —
 * CodeQL js/polynomial-redos.
 *
 * @private
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Longest address RFC 5321 permits, used to bound work before matching.
 * @private
 */
const EMAIL_MAX_LENGTH = 254;

/** @private */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Digits, optionally led by '+', with common separators; 7-15 digits. @private */
const PHONE_PATTERN = /^\+?[0-9][0-9 ().-]{5,24}$/;

/**
 * Test whether a value has the shape of an email address.
 * @private
 * @param {unknown} value - Value to check
 * @returns {boolean} True if the value looks like an email address
 */
function isEmailShaped(value) {
  return (
    typeof value === 'string' &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(value)
  );
}

/** @private */
function isUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return Boolean(url.protocol && (url.host || url.protocol === 'mailto:' || url.protocol === 'urn:'));
  } catch {
    return false;
  }
}

/** @private */
function isPhone(value) {
  if (typeof value !== 'string' || !PHONE_PATTERN.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** Card number: 12-19 digits (spaces/dashes allowed) passing the Luhn check. @private */
function isCreditCard(value) {
  if (typeof value !== 'string' || !/^[0-9 -]{12,30}$/.test(value)) return false;
  const digits = value.replace(/[ -]/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** @private */
function isDateLike(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return typeof value === 'string' && value.length <= 64 && !Number.isNaN(Date.parse(value));
}

/**
 * String formats, usable as `format: '<name>'` or as `type: '<name>'`.
 * @private
 */
const FORMATS = {
  email: { test: isEmailShaped, message: 'Invalid email format' },
  url: { test: isUrl, message: 'Invalid URL format' },
  uri: { test: isUrl, message: 'Invalid URL format' },
  uuid: { test: (value) => typeof value === 'string' && UUID_PATTERN.test(value), message: 'Invalid UUID format' },
  phone: { test: isPhone, message: 'Invalid phone number format' },
  'credit-card': { test: isCreditCard, message: 'Invalid credit card number' },
  date: { test: isDateLike, message: 'Invalid date' },
  'date-time': { test: isDateLike, message: 'Invalid date-time' }
};

/** @private */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** @private */
function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Keyword tests used to tell a rule (`{ type: 'string', min: 1 }`) from a
 * nested field map (`{ street: {...}, zip: {...} }`). Each checks the value
 * too, so a field that happens to be called `type` or `items` is still read
 * as a field.
 * @private
 */
const RULE_KEYWORDS = {
  type: (v) => typeof v === 'string' || (Array.isArray(v) && v.every((t) => typeof t === 'string')),
  required: (v) => typeof v === 'boolean' || (Array.isArray(v) && v.every((f) => typeof f === 'string')),
  nullable: (v) => typeof v === 'boolean',
  enum: Array.isArray,
  const: () => true,
  pattern: (v) => typeof v === 'string' || v instanceof RegExp,
  format: (v) => typeof v === 'string',
  minLength: (v) => typeof v === 'number',
  maxLength: (v) => typeof v === 'number',
  minimum: (v) => typeof v === 'number',
  maximum: (v) => typeof v === 'number',
  exclusiveMinimum: (v) => typeof v === 'number',
  exclusiveMaximum: (v) => typeof v === 'number',
  min: (v) => typeof v === 'number',
  max: (v) => typeof v === 'number',
  minItems: (v) => typeof v === 'number',
  maxItems: (v) => typeof v === 'number',
  minProperties: (v) => typeof v === 'number',
  maxProperties: (v) => typeof v === 'number',
  items: (v) => isPlainObject(v),
  properties: (v) => isPlainObject(v) && Object.values(v).every(isPlainObject),
  additionalProperties: (v) => typeof v === 'boolean' || isPlainObject(v),
  custom: (v) => typeof v === 'function',
  transform: (v) => typeof v === 'function',
  message: (v) => typeof v === 'string',
  trim: (v) => typeof v === 'boolean',
  default: () => true
};

/**
 * Whether `node` is a rule rather than a nested field map.
 * @private
 */
function isRule(node) {
  if (!isPlainObject(node)) return false;
  for (const key of Object.keys(node)) {
    const check = RULE_KEYWORDS[key];
    if (check && check(node[key])) return true;
  }
  return false;
}

/**
 * Normalise a schema node to a rule. A non-empty nested field map becomes an
 * object rule whose properties are its fields; `{}` accepts anything.
 * @private
 */
function toRule(node) {
  if (isRule(node)) return node;
  if (isPlainObject(node) && Object.keys(node).length > 0) {
    return { type: 'object', properties: node };
  }
  return {};
}

/**
 * Define an own, enumerable property even for keys like `__proto__`, which a
 * plain assignment would treat as a prototype change.
 * @private
 */
function setOwn(target, key, value) {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

/** @private */
function joinPath(base, key) {
  if (typeof key === 'number') return `${base}[${key}]`;
  return base ? `${base}.${key}` : key;
}

/** Compare for enum/const: primitives by identity, others structurally. @private */
function sameValue(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/** A rule's type names as an array. @private */
function typesOf(rule) {
  if (rule.type === undefined) return [];
  return Array.isArray(rule.type) ? rule.type : [rule.type];
}

/** Compiled string patterns, keyed by source. @private */
const patternCache = new Map();

/** @private */
function compilePattern(pattern) {
  if (pattern instanceof RegExp) return pattern;
  let regex = patternCache.get(pattern);
  if (!regex) {
    regex = new RegExp(pattern);
    if (patternCache.size >= 500) patternCache.delete(patternCache.keys().next().value);
    patternCache.set(pattern, regex);
  }
  return regex;
}

/**
 * Convert query/path strings for number, integer and boolean types.
 * @private
 */
function coerce(value, types) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((types.includes('number') || types.includes('integer')) && trimmed !== '' && Number.isFinite(Number(trimmed))) {
    return Number(trimmed);
  }
  if (types.includes('boolean') && (trimmed === 'true' || trimmed === 'false')) {
    return trimmed === 'true';
  }
  return value;
}

/**
 * Check a value against one type name.
 * @private
 */
function matchesType(type, value) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    case 'date':
      return isDateLike(value);
    default:
      if (FORMATS[type]) return typeof value === 'string' && FORMATS[type].test(value);
      return true; // Unknown type names are not enforced
  }
}

/**
 * Validate `value` against `rule`, pushing errors onto `ctx.errors`.
 *
 * @private
 * @returns {*} The value after default/trim/transform/coercion, and with
 *   unknown keys removed when `stripUnknown` is set
 */
function validateNode(rule, value, field, ctx) {
  const errors = ctx.errors;
  const fail = (keyword, message) => {
    errors.push({ field, message: rule.message || message, rule: keyword });
  };

  if (ctx.abort && errors.length > 0) return value;

  const types = typesOf(rule);

  if (typeof value === 'string' && rule.trim === true) value = value.trim();
  if (typeof rule.transform === 'function' && value !== undefined) value = rule.transform(value);
  if (ctx.coerceTypes && types.length > 0) value = coerce(value, types);

  // Handle null/undefined values
  if (value === null || value === undefined) {
    const allowed = types.length === 0 || types.includes('null') || (value === null && rule.nullable === true);
    if (!allowed) {
      fail('type', `Expected ${types.join(' or ')}, got ${value === null ? 'null' : 'undefined'}`);
    }
    return value;
  }

  // Type validation
  if (types.length > 0 && !types.some((type) => matchesType(type, value))) {
    const formatType = types.length === 1 && FORMATS[types[0]];
    if (formatType && typeof value === 'string') {
      fail(types[0], formatType.message);
    } else {
      fail('type', `Expected ${types.join(' or ')}, got ${describe(value)}`);
    }
    return value;
  }

  if (rule.enum && !rule.enum.some((option) => sameValue(option, value))) {
    fail('enum', `Must be one of: ${rule.enum.map((option) => JSON.stringify(option)).join(', ')}`);
  }

  if ('const' in rule && !sameValue(rule.const, value)) {
    fail('const', `Must be ${JSON.stringify(rule.const)}`);
  }

  if (typeof value === 'string') {
    if (typeof rule.minLength === 'number' && value.length < rule.minLength) {
      fail('minLength', `String must be at least ${rule.minLength} characters`);
    }
    if (typeof rule.maxLength === 'number' && value.length > rule.maxLength) {
      fail('maxLength', `String must be at most ${rule.maxLength} characters`);
    }
    if (typeof rule.min === 'number' && value.length < rule.min) {
      fail('min', `String must be at least ${rule.min} characters`);
    }
    if (typeof rule.max === 'number' && value.length > rule.max) {
      fail('max', `String must be at most ${rule.max} characters`);
    }
    if (rule.pattern !== undefined) {
      const regex = compilePattern(rule.pattern);
      regex.lastIndex = 0; // A global/sticky RegExp keeps state between calls
      if (!regex.test(value)) fail('pattern', 'Invalid format');
    }
    const format = typeof rule.format === 'string' ? FORMATS[rule.format] : undefined;
    if (format && !format.test(value)) fail('format', format.message);
  }

  if (typeof value === 'number') {
    if (typeof rule.minimum === 'number' && value < rule.minimum) {
      fail('minimum', `Number must be at least ${rule.minimum}`);
    }
    if (typeof rule.maximum === 'number' && value > rule.maximum) {
      fail('maximum', `Number must be at most ${rule.maximum}`);
    }
    if (typeof rule.exclusiveMinimum === 'number' && value <= rule.exclusiveMinimum) {
      fail('exclusiveMinimum', `Number must be greater than ${rule.exclusiveMinimum}`);
    }
    if (typeof rule.exclusiveMaximum === 'number' && value >= rule.exclusiveMaximum) {
      fail('exclusiveMaximum', `Number must be less than ${rule.exclusiveMaximum}`);
    }
    if (typeof rule.min === 'number' && value < rule.min) {
      fail('min', `Number must be at least ${rule.min}`);
    }
    if (typeof rule.max === 'number' && value > rule.max) {
      fail('max', `Number must be at most ${rule.max}`);
    }
  }

  if (Array.isArray(value)) {
    const minItems = typeof rule.minItems === 'number' ? rule.minItems : rule.min;
    const maxItems = typeof rule.maxItems === 'number' ? rule.maxItems : rule.max;
    if (typeof minItems === 'number' && value.length < minItems) {
      fail(rule.minItems === undefined ? 'min' : 'minItems', `Array must contain at least ${minItems} items`);
    }
    if (typeof maxItems === 'number' && value.length > maxItems) {
      fail(rule.maxItems === undefined ? 'max' : 'maxItems', `Array must contain at most ${maxItems} items`);
    }
    if (isPlainObject(rule.items)) {
      const itemRule = toRule(rule.items);
      value = value.map((item, index) => validateNode(itemRule, item, joinPath(field, index), ctx));
    }
  } else if (typeof value === 'object') {
    const output = validateObject(rule, value, field, ctx, fail);
    // Only plain objects are rebuilt; a Date or class instance is kept as is.
    if (isPlainObject(value)) value = output;
  }

  if (typeof rule.custom === 'function' && !(ctx.abort && errors.length > 0)) {
    const verdict = rule.custom(value, field, ctx.root, ctx.context);
    if (verdict === false) fail('custom', `${field || 'Value'} is invalid`);
    else if (typeof verdict === 'string') errors.push({ field, message: verdict, rule: 'custom' });
  }

  return value;
}

/**
 * Validate an object's required fields, properties and unknown keys.
 * @private
 */
function validateObject(rule, value, field, ctx, fail) {
  const properties = isPlainObject(rule.properties) ? rule.properties : {};
  const requiredList = Array.isArray(rule.required) ? rule.required : [];
  const output = {};

  // Check required fields. Own properties only: `'constructor' in {}` is true.
  for (const name of requiredList) {
    if (!Object.hasOwn(value, name) || value[name] === undefined) {
      const property = properties[name];
      const hasDefault = isPlainObject(property) && 'default' in property;
      if (!hasDefault) {
        ctx.errors.push({ field: joinPath(field, name), message: `Required field '${name}' is missing`, rule: 'required' });
      }
    }
  }

  const known = new Set(Object.keys(properties));

  // Validate properties
  for (const [name, node] of Object.entries(properties)) {
    const propertyRule = toRule(node);
    const path = joinPath(field, name);
    let propertyValue = Object.hasOwn(value, name) ? value[name] : undefined;

    if (propertyValue === undefined && 'default' in propertyRule) {
      propertyValue = typeof propertyRule.default === 'function' ? propertyRule.default() : propertyRule.default;
    }

    const missing =
      propertyValue === undefined ||
      (propertyValue === null && propertyRule.nullable !== true && !typesOf(propertyRule).includes('null')) ||
      propertyValue === '';
    if (propertyRule.required === true && missing) {
      ctx.errors.push({ field: path, message: propertyRule.message || `Required field '${name}' is missing`, rule: 'required' });
      if (propertyValue !== undefined) setOwn(output, name, propertyValue);
      continue;
    }

    if (propertyValue === undefined) continue; // Optional and absent

    setOwn(output, name, validateNode(propertyRule, propertyValue, path, ctx));
  }

  // Unknown keys
  const additional = rule.additionalProperties;
  for (const name of Object.keys(value)) {
    if (known.has(name)) continue;
    if (additional === false || ctx.allowUnknown === false) {
      if (ctx.stripUnknown) continue;
      ctx.errors.push({ field: joinPath(field, name), message: `Unknown field '${name}'`, rule: 'additionalProperties' });
      continue;
    }
    if (ctx.stripUnknown && known.size > 0) continue;
    setOwn(output, name, isPlainObject(additional) ? validateNode(toRule(additional), value[name], joinPath(field, name), ctx) : value[name]);
  }

  const count = Object.keys(value).length;
  if (typeof rule.minProperties === 'number' && count < rule.minProperties) {
    fail('minProperties', `Object must have at least ${rule.minProperties} properties`);
  }
  if (typeof rule.maxProperties === 'number' && count > rule.maxProperties) {
    fail('maxProperties', `Object must have at most ${rule.maxProperties} properties`);
  }

  return output;
}

/** @private */
function createContext(data, options = {}) {
  return {
    errors: [],
    root: data,
    abort: options.abortEarly === true,
    stripUnknown: options.stripUnknown === true,
    allowUnknown: options.allowUnknown,
    coerceTypes: options.coerceTypes === true,
    context: options.context
  };
}

/**
 * Validate data against a schema
 * @param {Object} schema - JSON-Schema-style schema, or a field map
 * @param {any} data - Data to validate
 * @param {Object} [options] - abortEarly, stripUnknown, allowUnknown, coerceTypes, context
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string, rule: string}>, data: any }}
 *   Validation result; `data` carries defaults, trimming, transforms and coercion
 */
function validateAgainstSchema(schema, data, options = {}) {
  const ctx = createContext(data, options);
  const output = validateNode(toRule(schema ?? {}), data, '', ctx);
  const errors = ctx.abort ? ctx.errors.slice(0, 1) : ctx.errors;

  return {
    valid: errors.length === 0,
    errors,
    data: output
  };
}

/**
 * Validate a single field
 * @param {Object} schema - Field schema
 * @param {any} value - Field value
 * @param {string} fieldName - Field name
 * @param {Object} [data] - The whole object, passed to `custom` validators
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string, rule: string}>, value: any }}
 *   Validation result with valid and errors properties
 */
function validateField(schema, value, fieldName, data) {
  const ctx = createContext(data);
  const output = validateNode(toRule(schema ?? {}), value, fieldName, ctx);
  return { valid: ctx.errors.length === 0, errors: ctx.errors, value: output };
}

/**
 * Build a validation middleware for one request property.
 * @private
 */
function validationMiddleware(schema, property, defaults, options) {
  const settings = { ...defaults, ...options };
  return (req, res, next) => {
    const data = req[property] || {};
    const result = validateAgainstSchema(schema, data, settings);

    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    req[property] = result.data;
    if (typeof next === 'function') next();
  };
}

/**
 * Create validation middleware
 *
 * Throws a `ValidationError` (400, with `details.errors`) for an invalid body;
 * on success replaces `req.body` with the validated data (defaults applied)
 * and calls `next()`.
 *
 * @param {Object} schema - JSON Schema or field map for validation
 * @param {Object} [options] - Validation options
 * @returns {Function} Middleware function
 */
function withValidation(schema, options) {
  return validationMiddleware(schema, 'body', {}, options);
}

/**
 * Validate query parameters
 *
 * Query strings are text, so `number`, `integer` and `boolean` fields are
 * converted before they are checked.
 *
 * @param {Object} schema - JSON Schema or field map for query parameters
 * @param {Object} [options] - Validation options
 * @returns {Function} Middleware function
 */
function withQueryValidation(schema, options) {
  return validationMiddleware(schema, 'query', { coerceTypes: true }, options);
}

/**
 * Validate path parameters
 *
 * Path parameters are text, so `number`, `integer` and `boolean` fields are
 * converted before they are checked.
 *
 * @param {Object} schema - JSON Schema or field map for path parameters
 * @param {Object} [options] - Validation options
 * @returns {Function} Middleware function
 */
function withParamsValidation(schema, options) {
  return validationMiddleware(schema, 'params', { coerceTypes: true }, options);
}

// Export validation utilities
export {
  validateAgainstSchema,
  validateField,
  withValidation,
  withQueryValidation,
  withParamsValidation
};
