/**
 * Coherent.js Forms - validation rules
 *
 * The single `validators` registry behind `@coherent.js/forms`,
 * `@coherent.js/forms/validation` and `@coherent.js/forms/validators`.
 * Internal: import it through one of those entry points.
 *
 * ## Calling convention
 *
 * A **validator** is `(value, formData) => string | null`: an error message,
 * or `null` when the value passes. Schemas, `validateField`, `validateForm`,
 * `FormBuilder` fields and `hydrateForm` all run validators this way.
 *
 * Each built-in is a **factory** that returns a validator:
 *
 *     validators.required()                  validators.required('Required!')
 *     validators.minLength(8)                validators.minLength(8, 'Too short')
 *
 * A built-in may also be listed without calling it (`[validators.required]`);
 * runners call the factory with its defaults first. A string names a built-in
 * or registered validator, and a built-in's name may carry its arguments:
 * `'minLength:8'` is `validators.minLength(8)` (see argsFromString).
 *
 * For backward compatibility a built-in can still be called **directly** with
 * a value and an options object, returning the error or `null`:
 *
 *     validators.minLength('abc', { min: 5 })   // 'Minimum length is 5'
 *     validators.email(null)                    // null
 *
 * A lone argument that could be a message — a non-empty string, `undefined`
 * or `null` — is always read as a factory call, so `validators.email('a@b.c')`
 * returns a validator; call `validators.email('a@b.c', {})` (or
 * `validators.email()('a@b.c')`) to check a value directly.
 *
 * @module forms/rules
 */

import { isEmailShaped } from './patterns.js';

/** Built-in factories, so runners can tell them from plain validators. */
const BUILTIN = Symbol('coherent.forms.builtin');

/**
 * Validators whose origin is known, so the form builder can describe them to
 * the client: validator → `{ name, args }`.
 */
const DESCRIPTORS = new WeakMap();

/** Names on `validators` that are helpers, not validation rules. */
const HELPER_NAMES = new Set(['get', 'compose', 'debounce', 'cancellable', 'when', 'chain']);

const isEmpty = value => value === null || value === undefined || value === '';

const isOptionsObject = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof RegExp);

/**
 * Factory arguments for the text after the colon of a `'name:…'` string
 * entry, or `null` when it does not fit the rule.
 *
 * - No parameter (`required`, `email`, …): the text is the message —
 *   `'required:Please enter your name'`.
 * - `'list'` (`oneOf`, `fileType`, `fileExtension`): every comma-separated
 *   value goes into the one array parameter — `'oneOf:red,green,blue'`.
 * - `'regexp'` (`pattern`): the whole text is the regular expression source,
 *   commas included — `'pattern:^[a-z]{2,8}$'`.
 * - Otherwise the text up to the first comma is the parameter (a number for
 *   `'number'`, so `'minLength:abc'` is rejected) and the rest, commas
 *   included, is the message — `'minLength:8,Use at least 8 characters'`.
 *
 * @param {Array} params - The rule's factory parameters
 * @param {'string'|'number'|'list'|'regexp'} kind - How the text supplies them
 * @param {string|undefined} text - Text after the colon (`undefined`: none)
 * @returns {Array|null}
 */
function argsFromString(params, kind, text) {
  if (text === undefined || text.trim() === '') return [];
  if (params.length === 0) return [text.trim()];

  if (kind === 'list') {
    return [text.split(',').map(part => part.trim()).filter(Boolean)];
  }
  if (kind === 'regexp') {
    try {
      return [new RegExp(text)];
    } catch {
      return null;
    }
  }

  const comma = text.indexOf(',');
  const raw = (comma === -1 ? text : text.slice(0, comma)).trim();
  const message = comma === -1 ? '' : text.slice(comma + 1).trim();

  let arg = raw;
  if (kind === 'number') {
    arg = Number(raw);
    if (raw === '' || Number.isNaN(arg)) return null;
  }
  return message ? [arg, message] : [arg];
}

/**
 * Define a built-in rule.
 *
 * @param {string} name - Registry name
 * @param {Object} spec
 * @param {Array<[string, ...string[]]>} [spec.params] - Factory parameters, in
 *   order, each as `[configKey, ...optionAliases]` for direct calls
 * @param {'string'|'number'|'list'|'regexp'} [spec.stringArg] - How the
 *   `'name:…'` string form supplies the parameter (see argsFromString)
 * @param {(value: unknown, config: Object, formData: Object) => boolean} spec.valid
 * @param {(config: Object) => string} spec.message - Default error message
 */
function defineRule(name, { params = [], stringArg = 'string', valid, message }) {
  const fromOptions = (options = {}) => {
    const config = { message: options.message };
    for (const [key, ...aliases] of params) {
      config[key] = [key, ...aliases].map(alias => options[alias]).find(v => v !== undefined);
    }
    return config;
  };

  const check = (value, config, formData) => {
    if (valid(value, config, formData || {})) return null;
    return config.message || builtin.message || message(config);
  };

  const factory = (...args) => {
    const config = { message: args[params.length] };
    params.forEach(([key], index) => { config[key] = args[index]; });

    // Also accepts the (value, options, translator, allValues) arguments of
    // the older direct convention, so it composes with either.
    const rule = (value, formData, _translator, allValues) =>
      check(value, config, allValues ?? formData);

    DESCRIPTORS.set(rule, { name, args });
    return rule;
  };

  // Direct calls pass a value plus an options object. Anything else is a
  // factory call, including `required(undefined)` (a message that happens to
  // be missing) — only an explicit options object, or a lone argument that
  // cannot be a message, selects the direct form.
  const isDirectCall = (args) => {
    if (args.length >= 2) {
      return params.length === 0 || isOptionsObject(args[1]);
    }
    if (args.length === 1 && params.length === 0) {
      const [arg] = args;
      return arg === '' || (arg !== undefined && arg !== null && typeof arg !== 'string');
    }
    return false;
  };

  function builtin(...args) {
    if (isDirectCall(args)) {
      const [value, options, , allValues] = args;
      return check(value, fromOptions(isOptionsObject(options) ? options : {}), allValues);
    }
    return factory(...args);
  }

  Object.defineProperty(builtin, 'name', { value: name });
  builtin[BUILTIN] = {
    name,
    factory,
    argsFromString: (text) => argsFromString(params, stringArg, text)
  };
  return builtin;
}

const toNumber = value => (typeof value === 'number' ? value : Number(value));

function testRegExp(regex, value) {
  if (!(regex instanceof RegExp)) return true;
  // A /g or /y regex keeps lastIndex between calls; always test from the start.
  regex.lastIndex = 0;
  return regex.test(String(value));
}

function fileMatchesType(file, allowedTypes) {
  const fileType = file.type;
  const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : '';

  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return fileExt === type.slice(1).toLowerCase();
    }
    if (type.includes('/')) {
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', '/'));
      }
      return fileType === type;
    }
    return fileExt === type.toLowerCase();
  });
}

/**
 * Built-in validators and helpers. See the module comment for the calling
 * convention.
 */
export const validators = {
  required: defineRule('required', {
    valid: value => !isEmpty(value),
    message: () => 'This field is required'
  }),

  email: defineRule('email', {
    valid: value => isEmpty(value) || isEmailShaped(value),
    message: () => 'Invalid email address'
  }),

  url: defineRule('url', {
    valid: (value) => {
      if (isEmpty(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: () => 'Invalid URL'
  }),

  minLength: defineRule('minLength', {
    params: [['min', 'minLength']],
    stringArg: 'number',
    valid: (value, { min }) => !value || !(value.length < (min ?? 0)),
    message: ({ min }) => `Minimum length is ${min}`
  }),

  maxLength: defineRule('maxLength', {
    params: [['max', 'maxLength']],
    stringArg: 'number',
    valid: (value, { max }) => !value || !(value.length > (max ?? Infinity)),
    message: ({ max }) => `Maximum length is ${max}`
  }),

  // Empty values pass (combine with `required`); a non-numeric value fails.
  min: defineRule('min', {
    params: [['min']],
    stringArg: 'number',
    valid: (value, { min }) => {
      if (isEmpty(value)) return true;
      const number = toNumber(value);
      return !Number.isNaN(number) && !(number < (min ?? -Infinity));
    },
    message: ({ min }) => `Minimum value is ${min}`
  }),

  max: defineRule('max', {
    params: [['max']],
    stringArg: 'number',
    valid: (value, { max }) => {
      if (isEmpty(value)) return true;
      const number = toNumber(value);
      return !Number.isNaN(number) && !(number > (max ?? Infinity));
    },
    message: ({ max }) => `Maximum value is ${max}`
  }),

  pattern: defineRule('pattern', {
    params: [['pattern', 'regex']],
    stringArg: 'regexp',
    valid: (value, { pattern }) => isEmpty(value) || testRegExp(pattern, value),
    message: () => 'Invalid format'
  }),

  /** Equal to another field, even when empty */
  matches: defineRule('matches', {
    params: [['field', 'fieldName']],
    valid: (value, { field }, formData) => value === formData[field],
    message: () => 'Fields do not match'
  }),

  /** Equal to another field; an empty value passes */
  match: defineRule('match', {
    params: [['field', 'fieldName']],
    valid: (value, { field }, formData) => !value || value === formData[field],
    message: ({ field }) => `Must match ${field}`
  }),

  oneOf: defineRule('oneOf', {
    params: [['options', 'values']],
    stringArg: 'list',
    valid: (value, { options }) => !value || !Array.isArray(options) || options.includes(value),
    message: () => 'Invalid option'
  }),

  custom: defineRule('custom', {
    params: [['validator', 'fn']],
    valid: (value, { validator }, formData) =>
      typeof validator !== 'function' || Boolean(validator(value, formData)),
    message: () => 'Validation failed'
  }),

  number: defineRule('number', {
    valid: value => isEmpty(value) || !Number.isNaN(Number(value)),
    message: () => 'Must be a valid number'
  }),

  integer: defineRule('integer', {
    valid: value => isEmpty(value) || Number.isInteger(Number(value)),
    message: () => 'Must be a whole number'
  }),

  phone: defineRule('phone', {
    valid: value => !value || (/^[\d\s\-+()]+$/.test(value) && value.replace(/\D/g, '').length >= 10),
    message: () => 'Please enter a valid phone number'
  }),

  date: defineRule('date', {
    valid: value => !value || !Number.isNaN(new Date(value).getTime()),
    message: () => 'Please enter a valid date'
  }),

  alpha: defineRule('alpha', {
    valid: value => !value || /^[a-zA-Z]+$/.test(value),
    message: () => 'Must contain only letters'
  }),

  alphanumeric: defineRule('alphanumeric', {
    valid: value => !value || /^[a-zA-Z0-9]+$/.test(value),
    message: () => 'Must contain only letters and numbers'
  }),

  uppercase: defineRule('uppercase', {
    valid: value => !value || value === String(value).toUpperCase(),
    message: () => 'Must be uppercase'
  }),

  fileType: defineRule('fileType', {
    params: [['accept', 'types']],
    stringArg: 'list',
    valid: (value, { accept }) =>
      !value || value.type === undefined || fileMatchesType(value, accept || []),
    message: ({ accept }) => `File type must be one of: ${(accept || []).join(', ')}`
  }),

  fileSize: defineRule('fileSize', {
    params: [['maxSize']],
    stringArg: 'number',
    valid: (value, { maxSize }) =>
      !value || value.size === undefined || !(value.size > (maxSize ?? Infinity)),
    message: ({ maxSize }) => `File size must be less than ${((maxSize ?? Infinity) / (1024 * 1024)).toFixed(2)}MB`
  }),

  fileExtension: defineRule('fileExtension', {
    params: [['extensions']],
    stringArg: 'list',
    valid: (value, { extensions }) => {
      if (!value) return true;
      const fileName = value.name || value;
      const ext = `.${String(fileName).split('.').pop().toLowerCase()}`;
      return (extensions || []).some(allowed => ext === allowed.toLowerCase());
    },
    message: ({ extensions }) => `File extension must be one of: ${(extensions || []).join(', ')}`
  }),

  /** A registered validator or built-in by name */
  get: (name) => (Object.hasOwn(validators, name) ? validators[name] : undefined),

  /** Combine validators into one returning the first error */
  compose: (validatorList) => {
    const rules = validatorList.map(resolveValidator);
    return (value, options, translator, allValues) => {
      for (const rule of rules) {
        const error = rule ? rule(value, options, translator, allValues) : null;
        if (error) {
          return error;
        }
      }
      return null;
    };
  },

  /** Debounce an async validator */
  debounce: (validator, delay = 300) => {
    let timeoutId;
    return (value) => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          const result = await validator(value);
          resolve(result);
        }, delay);
      });
    };
  },

  /** Cancellable async validator */
  cancellable: (validator) => {
    let abortController;
    const wrapped = async (value) => {
      if (abortController) {
        abortController.abort();
      }
      // AbortController is a global browser/Node.js API
      abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      try {
        return await validator(value, abortController ? abortController.signal : null);
      } catch (error) {
        if (error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    };
    wrapped.cancel = () => {
      if (abortController) {
        abortController.abort();
      }
    };
    return wrapped;
  },

  /** Run `validator` only when `condition` holds */
  when: (condition, validator) => {
    const rule = resolveValidator(validator);
    return (value, options = {}, translator, allValues = {}) => {
      // Pass options as context if it looks like context (has non-validator properties)
      const context = options.min !== undefined || options.max !== undefined ? allValues : options;
      const shouldValidate = typeof condition === 'function'
        ? condition(value, context)
        : condition;

      if (!shouldValidate) {
        return null;
      }

      return rule ? rule(value, options, translator, allValues) : null;
    };
  },

  /** Validator chain builder */
  chain: (options = {}) => {
    const validatorList = [];
    const stopOnFirstError = options.stopOnFirstError !== false;

    const direct = name => (opts) => {
      validatorList.push((v, o, t, a) => validators[name](v, opts || o || {}, t, a));
      return chain;
    };

    const chain = {
      required: direct('required'),
      email: direct('email'),
      minLength: direct('minLength'),
      maxLength: direct('maxLength'),
      custom: (fn, message) => {
        validatorList.push((v, o, t, a) => {
          // Custom validator returns null if valid, message if invalid
          const result = fn(v, a);
          return result === null || result === true || result === undefined ? null : (message || result);
        });
        return chain;
      },
      validate: (value, opts, translator, allValues) => {
        if (stopOnFirstError) {
          // Stop on first error - return single error or null
          for (const validator of validatorList) {
            const error = validator(value, opts, translator, allValues);
            if (error) {
              return error;
            }
          }
          return null;
        }
        // Collect all errors - return array or null
        const errors = [];
        for (const validator of validatorList) {
          const error = validator(value, opts, translator, allValues);
          if (error) {
            errors.push(error);
          }
        }
        return errors.length > 0 ? errors : null;
      }
    };

    return chain;
  }
};

/** The registry entry named `name`, if it is a validator (not a helper). */
function lookup(name) {
  const found = Object.hasOwn(validators, name) && !HELPER_NAMES.has(name)
    ? validators[name]
    : null;
  return typeof found === 'function' ? found : null;
}

/**
 * Resolve a string entry: `'required'`, or `'name:arg1,arg2'` for a built-in
 * with arguments (`'minLength:8'`, `'oneOf:a,b,c'`, `'pattern:^\\d+$'`; see
 * argsFromString). A registered validator is named without arguments.
 *
 * @param {string} entry
 * @returns {{ name: string, args: Array, validator: Function }|null} `null`
 *   for an unknown name or arguments that do not fit the rule
 */
function resolveString(entry) {
  // An exact registry name wins, so a validator registered under a name that
  // contains a colon still resolves.
  const exact = lookup(entry);
  const colon = exact ? -1 : entry.indexOf(':');
  const name = colon === -1 ? entry : entry.slice(0, colon).trim();
  const found = exact ?? lookup(name);
  if (!found) return null;

  const text = colon === -1 ? undefined : entry.slice(colon + 1);
  if (!found[BUILTIN]) {
    return text === undefined ? { name, args: [], validator: found } : null;
  }

  const args = found[BUILTIN].argsFromString(text);
  if (!args) return null;
  return { name: found[BUILTIN].name, args, validator: found[BUILTIN].factory(...args) };
}

/**
 * Turn a schema entry into a validator: a built-in factory listed without
 * calling it (`validators.required`) is called with its defaults, a string
 * names a built-in or registered validator (`'required'`, or a built-in with
 * arguments: `'minLength:8'`), a function is used as is. Anything else — an
 * unknown name, or arguments that do not fit (`'minLength:abc'`) — is `null`
 * (skipped).
 *
 * @param {unknown} entry
 * @returns {Function|null}
 */
export function resolveValidator(entry) {
  if (typeof entry === 'string') {
    return resolveString(entry)?.validator ?? null;
  }
  if (typeof entry !== 'function') return null;
  return entry[BUILTIN] ? entry[BUILTIN].factory() : entry;
}

/**
 * Run validators against one value; the first error wins.
 */
export function validateField(value, validatorList, formData = {}) {
  const list = Array.isArray(validatorList) ? validatorList : [validatorList];
  for (const entry of list) {
    const validator = resolveValidator(entry);
    const error = validator ? validator(value, formData) : null;
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Validate a whole form: `{ field: [validators] }`. Returns the first error
 * per failing field, or `null` when everything passes.
 */
export function validateForm(formData, fieldValidators) {
  const errors = {};

  for (const [fieldName, validatorList] of Object.entries(fieldValidators)) {
    const value = formData[fieldName];
    const error = validateField(value, validatorList, formData);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Wrap a check function as a validator: a string result is the error, any
 * other truthy result becomes `message`, a falsy one passes.
 */
export function wrapValidator(validatorFn, message) {
  return (value, options, translator, allValues) => {
    const result = validatorFn(value, options, translator, allValues);
    // If validator returns a string, use it as the error message
    if (typeof result === 'string') {
      return result;
    }
    // If validator returns falsy (null, false, undefined), no error
    if (!result) {
      return null;
    }
    // If validator returns truthy (true, object, etc), use provided message
    return message || 'Validation failed';
  };
}

/**
 * Register a validator under `name`. It is stored as is (not as a factory),
 * so list it as `validators[name]`. Registered validators are described to
 * the client by name, so `hydrateForm` enforces them when the same name is
 * registered in the browser.
 */
export function registerValidator(name, validatorFn) {
  validators[name] = validatorFn;
  if (typeof validatorFn === 'function' && !validatorFn[BUILTIN]) {
    DESCRIPTORS.set(validatorFn, { name, args: [] });
  }
}

/**
 * Compose multiple validators
 */
export function composeValidators(...validatorFns) {
  return validators.compose(validatorFns);
}

// ---------------------------------------------------------------------------
// Server → client description (`data-validators`)
// ---------------------------------------------------------------------------

/** JSON cannot hold a RegExp; tag it so the client can rebuild it. */
function serializeArg(arg) {
  if (arg instanceof RegExp) return { $regexp: [arg.source, arg.flags] };
  return arg;
}

function reviveArg(arg) {
  if (isOptionsObject(arg) && Array.isArray(arg.$regexp)) {
    try {
      return new RegExp(arg.$regexp[0], arg.$regexp[1]);
    } catch {
      return undefined;
    }
  }
  return arg;
}

/** Whether JSON can carry a factory argument to the client unchanged. */
function isSerializable(arg) {
  if (arg === undefined || arg === null) return true;
  if (arg instanceof RegExp) return true;
  if (Array.isArray(arg)) return arg.every(isSerializable);
  return ['string', 'number', 'boolean'].includes(typeof arg);
}

/**
 * Describe a schema entry as `{ name, args }` for the client, or `null` when
 * it cannot be rebuilt there (an anonymous function, or a factory argument
 * such as a function that JSON cannot carry). Those still run on the server.
 */
export function describeValidator(entry) {
  let descriptor;
  if (typeof entry === 'string') {
    // `'minLength:8'` is described like `validators.minLength(8)`.
    descriptor = resolveString(entry);
  } else if (typeof entry === 'function') {
    descriptor = entry[BUILTIN] ? { name: entry[BUILTIN].name, args: [] } : DESCRIPTORS.get(entry);
  }
  if (!descriptor || !descriptor.args.every(isSerializable)) return null;

  // Trailing undefined arguments (an omitted message) are just defaults.
  const args = [...descriptor.args];
  while (args.length > 0 && args[args.length - 1] === undefined) args.pop();
  return { name: descriptor.name, args: args.map(serializeArg) };
}

/**
 * Serialize a field's validators for its `data-validators` attribute:
 * a JSON array of `{ name, args }`, or `null` when none can be described.
 */
export function serializeValidators(validatorList) {
  const specs = (validatorList || []).map(describeValidator).filter(Boolean);
  return specs.length > 0 ? JSON.stringify(specs) : null;
}

/**
 * Rebuild validators from a `data-validators` attribute. Reads the JSON
 * written by {@link serializeValidators}, and the older comma-separated form
 * (`required,minLength:8`). Unknown names are skipped.
 */
export function parseValidators(attribute) {
  if (!attribute) return [];
  const text = String(attribute).trim();

  let specs;
  if (text.startsWith('[')) {
    try {
      specs = JSON.parse(text);
    } catch {
      return [];
    }
    if (!Array.isArray(specs)) return [];
  } else {
    specs = text.split(',').map((part) => {
      const [name, ...params] = part.trim().split(':');
      return { name, args: params.map(p => (p !== '' && !Number.isNaN(Number(p)) ? Number(p) : p)) };
    });
  }

  return specs.map((spec) => {
    if (!spec || typeof spec.name !== 'string') return null;
    const { name } = spec;
    if (!Object.hasOwn(validators, name) || HELPER_NAMES.has(name)) return null;

    const entry = validators[name];
    if (typeof entry !== 'function') return null;

    // Built-ins are rebuilt through their factory, never the direct form.
    const args = Array.isArray(spec.args) ? spec.args.map(reviveArg) : [];
    return entry[BUILTIN] ? entry[BUILTIN].factory(...args) : entry;
  }).filter(Boolean);
}
