/**
 * Coherent.js Locale Utilities
 * 
 * Utilities for locale detection and management
 * 
 * @module i18n/locale
 */

/**
 * Detect browser locale
 * 
 * @returns {string} Detected locale code
 */
export function detectLocale() {
  if (typeof navigator !== 'undefined') {
    // Try navigator.language first
    if (navigator.language) {
      return normalizeLocale(navigator.language);
    }
    
    // Try navigator.languages array
    if (navigator.languages && navigator.languages.length > 0) {
      return normalizeLocale(navigator.languages[0]);
    }
    
    // Fallback to userLanguage (IE)
    if (navigator.userLanguage) {
      return normalizeLocale(navigator.userLanguage);
    }
  }
  
  // Default fallback
  return 'en';
}

/**
 * Normalize locale code
 * Converts various formats to standard format (e.g., 'en-US' -> 'en')
 * 
 * @param {string} locale - Locale code
 * @param {boolean} [keepRegion=false] - Keep region code
 * @returns {string} Normalized locale
 */
export function normalizeLocale(locale, keepRegion = false) {
  if (!locale) return 'en';
  
  // Convert to lowercase and replace underscores
  let normalized = locale.toLowerCase().replace('_', '-');
  
  // Extract language code
  if (!keepRegion && normalized.includes('-')) {
    normalized = normalized.split('-')[0];
  }
  
  return normalized;
}

/**
 * Parse locale into components
 * 
 * @param {string} locale - Locale code
 * @returns {Object} Parsed locale components
 */
export function parseLocale(locale) {
  const normalized = locale.replace('_', '-');
  const parts = normalized.split('-');
  
  return {
    language: parts[0]?.toLowerCase() || 'en',
    region: parts[1]?.toUpperCase() || null,
    script: parts.length > 2 ? parts[1] : null,
    full: normalized
  };
}

/**
 * Get locale direction (LTR or RTL)
 * 
 * @param {string} locale - Locale code
 * @returns {string} 'ltr' or 'rtl'
 */
export function getLocaleDirection(locale) {
  const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi'];
  const language = parseLocale(locale).language;
  
  return rtlLocales.includes(language) ? 'rtl' : 'ltr';
}

/**
 * Check if locale is RTL
 * 
 * @param {string} locale - Locale code
 * @returns {boolean} True if RTL
 */
export function isRTL(locale) {
  return getLocaleDirection(locale) === 'rtl';
}

/**
 * Get locale display name
 * 
 * @param {string} locale - Locale code
 * @param {string} [displayLocale] - Locale to display name in
 * @returns {string} Display name
 */
export function getLocaleDisplayName(locale, displayLocale = 'en') {
  if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
    try {
      const displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
      return displayNames.of(locale);
    } catch (e) {
      // Fallback
    }
  }
  
  // Fallback to locale code
  return locale;
}

/**
 * Match locale from available locales
 * Finds best matching locale from available options
 * 
 * @param {string} requestedLocale - Requested locale
 * @param {Array<string>} availableLocales - Available locales
 * @param {string} [defaultLocale='en'] - Default fallback
 * @returns {string} Best matching locale
 */
export function matchLocale(requestedLocale, availableLocales, defaultLocale = 'en') {
  const normalized = normalizeLocale(requestedLocale);
  
  // Exact match
  if (availableLocales.includes(normalized)) {
    return normalized;
  }
  
  // Try with region
  const withRegion = normalizeLocale(requestedLocale, true);
  if (availableLocales.includes(withRegion)) {
    return withRegion;
  }
  
  // Try language match (ignore region)
  const language = parseLocale(requestedLocale).language;
  const languageMatch = availableLocales.find(locale => 
    parseLocale(locale).language === language
  );
  
  if (languageMatch) {
    return languageMatch;
  }
  
  // Fallback to default
  return availableLocales.includes(defaultLocale) ? defaultLocale : availableLocales[0];
}

/**
 * Get supported locales from browser
 * 
 * @returns {Array<string>} Array of supported locales
 */
export function getSupportedLocales() {
  if (typeof navigator !== 'undefined' && navigator.languages) {
    return navigator.languages.map(locale => normalizeLocale(locale));
  }
  
  return [detectLocale()];
}

/**
 * Locale Manager
 * Manages locale state and persistence
 */
export class LocaleManager {
  constructor(options = {}) {
    this.options = {
      defaultLocale: 'en',
      availableLocales: ['en'],
      storageKey: 'coherent-locale',
      autoDetect: true,
      ...options
    };
    
    this.currentLocale = this.options.defaultLocale;
    this.listeners = [];
    
    // Auto-detect or load from storage
    if (this.options.autoDetect) {
      this.currentLocale = this.detectAndMatch();
    }
    
    this.loadFromStorage();
  }

  /**
   * Detect and match best locale
   */
  detectAndMatch() {
    const detected = detectLocale();
    return matchLocale(
      detected,
      this.options.availableLocales,
      this.options.defaultLocale
    );
  }

  /**
   * Get current locale
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Set locale
   */
  setLocale(locale) {
    const matched = matchLocale(
      locale,
      this.options.availableLocales,
      this.options.defaultLocale
    );
    
    if (matched !== this.currentLocale) {
      const oldLocale = this.currentLocale;
      this.currentLocale = matched;
      
      this.saveToStorage();
      this.notifyListeners(oldLocale, matched);
    }
  }

  /**
   * Add locale change listener
   */
  onChange(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of locale change
   */
  notifyListeners(oldLocale, newLocale) {
    this.listeners.forEach(listener => {
      try {
        listener(newLocale, oldLocale);
      } catch (error) {
        console.error('Error in locale change listener:', error);
      }
    });
  }

  /**
   * Save locale to storage
   */
  saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.options.storageKey, this.currentLocale);
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Load locale from storage
   */
  loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.options.storageKey);
        if (stored) {
          this.setLocale(stored);
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
  }

  /**
   * Get available locales
   */
  getAvailableLocales() {
    return [...this.options.availableLocales];
  }

  /**
   * Check if locale is available
   */
  isAvailable(locale) {
    return this.options.availableLocales.includes(locale);
  }
}

/**
 * Create a locale manager
 */
export function createLocaleManager(options = {}) {
  return new LocaleManager(options);
}

export default {
  detectLocale,
  normalizeLocale,
  parseLocale,
  getLocaleDirection,
  isRTL,
  getLocaleDisplayName,
  matchLocale,
  getSupportedLocales,
  LocaleManager,
  createLocaleManager
};
