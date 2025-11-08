/**
 * Coherent.js I18n
 * 
 * Complete internationalization solution
 * 
 * @module i18n
 */

export * from './translator.js';
export * from './formatters.js';
export * from './locale.js';

export { Translator, createTranslator, createScopedTranslator } from './translator.js';
export { DateFormatter, NumberFormatter, CurrencyFormatter, ListFormatter, createFormatters } from './formatters.js';
export { LocaleManager, createLocaleManager, detectLocale, normalizeLocale, isRTL } from './locale.js';
