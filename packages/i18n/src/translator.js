/**
 * Coherent.js Translator
 * 
 * Handles translation of strings with interpolation and pluralization
 * 
 * @module i18n/translator
 */

/**
 * Translator
 * Manages translations and locale switching
 */
export class Translator {
  constructor(options = {}) {
    this.options = {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      missingKeyHandler: null,
      interpolation: {
        prefix: '{{',
        suffix: '}}'
      },
      ...options
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
   * Set current locale
   * 
   * @param {string} locale - Locale code
   */
  setLocale(locale) {
    if (!this.loadedLocales.has(locale)) {
      console.warn(`Locale ${locale} not loaded, using fallback`);
      this.currentLocale = this.options.fallbackLocale;
    } else {
      this.currentLocale = locale;
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
   * Translate a key
   * 
   * @param {string} key - Translation key (supports dot notation)
   * @param {Object} [params] - Interpolation parameters
   * @param {string} [locale] - Override locale
   * @returns {string} Translated string
   */
  t(key, params = {}, locale = null) {
    const targetLocale = locale || this.currentLocale;
    
    // Get translation
    let translation = this.getTranslation(key, targetLocale);
    
    // Fallback to default locale
    if (translation === null && targetLocale !== this.options.fallbackLocale) {
      translation = this.getTranslation(key, this.options.fallbackLocale);
    }
    
    // Handle missing translation
    if (translation === null) {
      if (this.options.missingKeyHandler) {
        return this.options.missingKeyHandler(key, targetLocale);
      }
      return key;
    }
    
    // Handle pluralization
    if (typeof translation === 'object' && params.count !== undefined) {
      translation = this.selectPlural(translation, params.count, targetLocale);
    }
    
    // Interpolate parameters
    if (typeof translation === 'string') {
      return this.interpolate(translation, params);
    }
    
    return String(translation);
  }

  /**
   * Get translation from nested object
   */
  getTranslation(key, locale) {
    const translations = this.translations.get(locale);
    if (!translations) return null;
    
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
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
      const rules = new Intl.PluralRules(locale);
      const rule = rules.select(count);
      
      if (pluralObject[rule]) {
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
   */
  interpolate(str, params) {
    const { prefix, suffix } = this.options.interpolation;
    let result = str;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `${prefix}${key}${suffix}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
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
    return this.getTranslation(key, targetLocale) !== null;
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
