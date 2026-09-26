/**
 * Coherent.js Translator
 * 
 * Handles translation of strings with interpolation and pluralization
 * 
 * @module i18n/translator
 */

/**
 * Escape a string for literal use inside a regular expression.
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape a value for HTML text or a quoted attribute.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * The primary language subtag of a locale (`pt-BR` → `pt`).
 * @param {unknown} locale
 * @returns {string}
 */
function primaryLanguage(locale) {
  return String(locale).split(/[-_]/)[0].toLowerCase();
}

/**
 * `t()`'s third argument is either a locale string (the original signature)
 * or an options object `{ locale, escape }`.
 * @param {unknown} localeOrOptions
 * @returns {{ locale?: string | null, escape?: boolean }}
 */
function normalizeCallOptions(localeOrOptions) {
  if (localeOrOptions !== null && typeof localeOrOptions === 'object') {
    return localeOrOptions;
  }
  return { locale: localeOrOptions };
}

/**
 * Translator
 * Manages translations and locale switching
 */
export class Translator {
  constructor(options = {}) {
    const { interpolation, ...rest } = options;
    this.options = {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      missingKeyHandler: null,
      // HTML-escape interpolated params (never the translation itself).
      escape: false,
      ...rest,
      // Merged, so overriding only `prefix` keeps the default `suffix`.
      interpolation: {
        prefix: '{{',
        suffix: '}}',
        ...interpolation
      }
    };
    
    this.translations = new Map();
    this.currentLocale = this.options.defaultLocale;
    this.loadedLocales = new Set();
  }

  /**
   * Add translations for a locale
   * 
   * @param {string} locale - Locale code (e.g., 'en', 'fr', 'es')
   * @param {Object} translations - Translation object
   */
  addTranslations(locale, translations) {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, {});
    }
    
    const existing = this.translations.get(locale);
    this.translations.set(locale, this.deepMerge(existing, translations));
    this.loadedLocales.add(locale);
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Loaded locales that can serve `locale`, most specific first: the locale
   * itself, then its parents with trailing subtags dropped (`zh-Hant-TW` →
   * `zh-Hant` → `zh`). Matching ignores case and accepts `_` for `-`.
   *
   * @param {string} locale
   * @returns {string[]}
   */
  localeCandidates(locale) {
    if (typeof locale !== 'string' || locale === '') return [];

    const byLowerCase = new Map();
    for (const loaded of this.loadedLocales) {
      byLowerCase.set(String(loaded).toLowerCase(), loaded);
    }

    const candidates = [];
    const parts = locale.replace(/_/g, '-').toLowerCase().split('-');
    while (parts.length > 0) {
      const match = byLowerCase.get(parts.join('-'));
      if (match !== undefined && !candidates.includes(match)) {
        candidates.push(match);
      }
      parts.pop();
    }
    return candidates;
  }

  /**
   * Resolve a requested locale to a loaded one (`fr-FR` → `fr` when only
   * `fr` is loaded), or `null` when neither it nor a parent is loaded.
   *
   * @param {string} locale
   * @returns {string|null}
   */
  resolveLocale(locale) {
    return this.localeCandidates(locale)[0] ?? null;
  }

  /**
   * Set current locale
   *
   * Resolves to the closest loaded locale (`fr-FR` → `fr`); if neither it nor
   * a parent is loaded, the fallback locale is used.
   *
   * @param {string} locale - Locale code
   */
  setLocale(locale) {
    const resolved = this.resolveLocale(locale);
    if (resolved === null) {
      console.warn(`Locale ${locale} not loaded, using fallback`);
      this.currentLocale = this.options.fallbackLocale;
    } else {
      this.currentLocale = resolved;
    }
  }

  /**
   * Get current locale
   * 
   * @returns {string} Current locale code
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Get a translator bound to one locale, without touching the shared
   * instance's current locale.
   *
   * Use this on the server: `setLocale()` mutates `currentLocale`, which every
   * concurrent request rendering with the same instance shares, so one
   * request's locale leaks into another's output. A bound translator always
   * passes its own locale. It reads the shared translations live, so
   * translations added later are visible.
   *
   * The locale resolves like `setLocale()` (`fr-FR` → `fr`), falling back to
   * the fallback locale — silently, since request locales are untrusted input.
   *
   * @param {string} locale - Requested locale (e.g. from Accept-Language)
   * @param {{escape?: boolean}} [options] - `escape` default for this
   *   translator's calls (defaults to the shared instance's `escape`)
   * @returns {{ locale: string, t: Function, has: Function, getLocale: () => string }}
   */
  forLocale(locale, options = {}) {
    const boundLocale = this.resolveLocale(locale) ?? this.options.fallbackLocale;

    return {
      locale: boundLocale,
      t: (key, params = {}, localeOrOptions = null) => {
        const callOptions = normalizeCallOptions(localeOrOptions);
        return this.t(key, params, {
          locale: callOptions.locale || boundLocale,
          escape: callOptions.escape ?? options.escape ?? this.options.escape
        });
      },
      has: (key, override = null) => this.has(key, override || boundLocale),
      getLocale: () => boundLocale
    };
  }

  /**
   * Translate a key
   *
   * @param {string} key - Translation key (supports dot notation)
   * @param {Object} [params] - Interpolation parameters
   * @param {string|{locale?: string|null, escape?: boolean}|null} [localeOrOptions]
   *   Override locale, or `{ locale, escape }`. `escape: true` HTML-escapes the
   *   interpolated params (defaults to the translator's `escape` option).
   * @returns {string} Translated string
   */
  t(key, params = {}, localeOrOptions = null) {
    const callOptions = normalizeCallOptions(localeOrOptions);
    const targetLocale = callOptions.locale || this.currentLocale;
    const escape = callOptions.escape ?? this.options.escape;
    params = params || {};

    // Look the key up in the target locale, its parents (fr-FR → fr), then
    // the fallback locale and its parents.
    const chain = [
      ...this.localeCandidates(targetLocale),
      ...this.localeCandidates(this.options.fallbackLocale)
    ];
    let translation = null;
    let messageLocale = targetLocale;
    for (const candidate of chain) {
      translation = this.getTranslation(key, candidate);
      if (translation !== null) {
        messageLocale = candidate;
        break;
      }
    }

    // Handle missing translation
    if (translation === null) {
      if (this.options.missingKeyHandler) {
        return this.options.missingKeyHandler(key, targetLocale);
      }
      return key;
    }

    // Handle pluralization with the rules of the language the message is
    // written in: English fallback text must not use Russian plural rules.
    if (typeof translation === 'object' && params.count !== undefined) {
      const pluralLocale = primaryLanguage(messageLocale) === primaryLanguage(targetLocale)
        ? targetLocale
        : messageLocale;
      translation = this.selectPlural(translation, params.count, pluralLocale);
    }
    
    // Interpolate parameters
    if (typeof translation === 'string') {
      return this.interpolate(translation, params, { escape });
    }
    
    return String(translation);
  }

  /**
   * Get translation from nested object
   */
  getTranslation(key, locale) {
    const translations = this.translations.get(locale);
    if (!translations) return null;
    
    const keys = String(key).split('.');
    let value = translations;

    for (const k of keys) {
      // Own properties only: `constructor`, `toString`, `__proto__` … are
      // inherited from Object.prototype and are not translations.
      if (value && typeof value === 'object' && Object.hasOwn(value, k)) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Select plural form
   */
  selectPlural(pluralObject, count, locale) {
    // Check for explicit zero first (takes precedence over Intl rules)
    if (count === 0 && pluralObject.zero) {
      return pluralObject.zero;
    }
    
    // Use Intl.PluralRules for locale-specific pluralization
    if (typeof Intl !== 'undefined' && Intl.PluralRules) {
      let rule;
      try {
        rule = new Intl.PluralRules(locale).select(count);
      } catch {
        // Not a valid BCP 47 tag (e.g. `en_US`): use the simple rules below.
      }

      if (rule !== undefined && pluralObject[rule]) {
        return pluralObject[rule];
      }
    }
    
    // Fallback to simple rules
    if (count === 1 && pluralObject.one) {
      return pluralObject.one;
    } else if (pluralObject.other) {
      return pluralObject.other;
    }
    
    return pluralObject.one || pluralObject.other || '';
  }

  /**
   * Interpolate parameters into string
   *
   * @param {string} str - Translation template (trusted; never escaped)
   * @param {Object} params - Values for the placeholders
   * @param {{escape?: boolean}} [options] - `escape: true` HTML-escapes each
   *   value; defaults to the translator's `escape` option
   */
  interpolate(str, params, options = {}) {
    if (!params || typeof params !== 'object') return str;

    const escape = options.escape ?? this.options.escape;
    const format = escape ? escapeHtml : String;

    const names = Object.keys(params);
    if (names.length === 0) return str;

    const { prefix, suffix } = this.options.interpolation;
    // Longest names first, so `{{ab}}` is never read as `{{a}}` + `b}}`.
    const alternatives = names
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|');
    const pattern = new RegExp(`${escapeRegExp(prefix)}(${alternatives})${escapeRegExp(suffix)}`, 'g');

    // One pass with a replacer function: `$&`, `$'` or `$$` in a value are
    // inserted literally, and a value that itself contains a placeholder is
    // not interpolated a second time.
    return str.replace(pattern, (_match, name) => format(params[name]));
  }

  /**
   * Check if translation exists
   * 
   * @param {string} key - Translation key
   * @param {string} [locale] - Locale to check
   * @returns {boolean} True if translation exists
   */
  has(key, locale = null) {
    const targetLocale = locale || this.currentLocale;
    // The locale and its parents (fr-FR → fr), but not the fallback locale.
    return this.localeCandidates(targetLocale)
      .some(candidate => this.getTranslation(key, candidate) !== null);
  }

  /**
   * Get all translations for current locale
   * 
   * @returns {Object} All translations
   */
  getTranslations(locale = null) {
    const targetLocale = locale || this.currentLocale;
    return this.translations.get(targetLocale) || {};
  }

  /**
   * Get all loaded locales
   * 
   * @returns {Array<string>} Array of locale codes
   */
  getLoadedLocales() {
    return Array.from(this.loadedLocales);
  }

  /**
   * Remove translations for a locale
   * 
   * @param {string} locale - Locale code
   */
  removeLocale(locale) {
    this.translations.delete(locale);
    this.loadedLocales.delete(locale);
    
    if (this.currentLocale === locale) {
      this.currentLocale = this.options.defaultLocale;
    }
  }

  /**
   * Clear all translations
   */
  clear() {
    this.translations.clear();
    this.loadedLocales.clear();
    this.currentLocale = this.options.defaultLocale;
  }
}

/**
 * Create a translator instance
 * 
 * @param {Object} [options] - Translator options
 * @returns {Translator} Translator instance
 */
export function createTranslator(options = {}) {
  return new Translator(options);
}

/**
 * Create a scoped translator
 * Automatically prefixes all keys with a namespace
 * 
 * @param {Translator} translator - Base translator
 * @param {string} namespace - Namespace prefix
 * @returns {Object} Scoped translator
 */
export function createScopedTranslator(translator, namespace) {
  return {
    t: (key, params, locale) => {
      return translator.t(`${namespace}.${key}`, params, locale);
    },
    has: (key, locale) => {
      return translator.has(`${namespace}.${key}`, locale);
    },
    getLocale: () => translator.getLocale(),
    setLocale: (locale) => translator.setLocale(locale)
  };
}

export default {
  Translator,
  createTranslator,
  createScopedTranslator
};
