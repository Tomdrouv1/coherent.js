/**
 * Coherent.js I18n TypeScript Definitions
 * @module @coherent.js/i18n
 */

// ============================================================================
// Translation Messages
// ============================================================================

/** Translation key, dot-separated for nested lookups (`'home.title'`). */
export type TranslationKey = string;

/**
 * A translation tree. Leaves are strings, or plural objects keyed by CLDR
 * category (`one`, `other`, ...) selected via a `count` parameter.
 */
export type TranslationMessages = {
  [key: string]: string | PluralForms | TranslationMessages;
};

/** Plural variants for one key, selected by `Intl.PluralRules`. */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other?: string;
}

/** Interpolation parameters; `count` also drives plural selection. */
export interface TranslationParams {
  count?: number;
  [param: string]: unknown;
}

// ============================================================================
// Translator
// ============================================================================

export interface TranslatorOptions {
  /** Locale used until `setLocale()` is called; defaults to `'en'` */
  defaultLocale?: string;
  /** Locale consulted when a key is missing; defaults to `'en'` */
  fallbackLocale?: string;
  /** Called instead of returning the key when a translation is missing */
  missingKeyHandler?: ((key: string, locale: string) => string) | null;
  interpolation?: {
    /** Defaults to `'{{'` */
    prefix?: string;
    /** Defaults to `'}}'` */
    suffix?: string;
  };
  [option: string]: unknown;
}

/**
 * Holds translations per locale and resolves keys with interpolation,
 * pluralization and fallback.
 *
 * ```ts
 * const t = new Translator({ defaultLocale: 'fr' });
 * t.addTranslations('fr', { greeting: 'Bonjour {{name}}' });
 * t.t('greeting', { name: 'Ada' }); // 'Bonjour Ada'
 * ```
 */
export class Translator {
  constructor(options?: TranslatorOptions);

  options: TranslatorOptions;
  translations: Map<string, TranslationMessages>;
  currentLocale: string;
  loadedLocales: Set<string>;

  /** Deep-merge messages into a locale */
  addTranslations(locale: string, translations: TranslationMessages): void;

  /** Recursively merge `source` into `target` */
  deepMerge(target: TranslationMessages, source: TranslationMessages): TranslationMessages;

  /** Switch the active locale */
  setLocale(locale: string): void;

  /** The active locale */
  getLocale(): string;

  /**
   * Resolve a key. Falls back to the fallback locale, then to
   * `missingKeyHandler`, then to the key itself.
   */
  t(key: TranslationKey, params?: TranslationParams, locale?: string | null): string;

  /** Look a key up in one locale without fallback; `null` if absent */
  getTranslation(
    key: TranslationKey,
    locale: string
  ): string | PluralForms | TranslationMessages | null;

  /** Pick the plural form matching `count` */
  selectPlural(pluralObject: PluralForms, count: number, locale: string): string;

  /** Substitute `{{param}}` placeholders */
  interpolate(str: string, params: TranslationParams): string;

  /** Whether a key resolves in the given (or current) locale */
  has(key: TranslationKey, locale?: string | null): boolean;

  /** All messages for a locale, or `{}` */
  getTranslations(locale?: string | null): TranslationMessages;

  /** Locales that have been marked loaded */
  getLoadedLocales(): string[];

  /** Drop a locale's messages, resetting the current locale if it was active */
  removeLocale(locale: string): void;

  /** Drop every locale and reset to the default */
  clear(): void;
}

/** Create a {@link Translator}. */
export function createTranslator(options?: TranslatorOptions): Translator;

/**
 * Wrap a translator so every key is prefixed with `namespace`.
 */
export function createScopedTranslator(
  translator: Translator,
  namespace: string
): {
  t(key: TranslationKey, params?: TranslationParams, locale?: string | null): string;
  has(key: TranslationKey, locale?: string | null): boolean;
  getLocale(): string;
  setLocale(locale: string): void;
};

// ============================================================================
// Formatters
// ============================================================================

/** Locale-aware date and time formatting. */
export class DateFormatter {
  constructor(locale?: string);

  locale: string;

  /** Format with explicit `Intl.DateTimeFormat` options */
  format(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string;

  /** Short date (e.g. `1/15/25`) */
  short(date: Date | number | string): string;

  /** Medium date (e.g. `Jan 15, 2025`) */
  medium(date: Date | number | string): string;

  /** Long date (e.g. `January 15, 2025`) */
  long(date: Date | number | string): string;

  /** Full date, including weekday */
  full(date: Date | number | string): string;

  /** Time only */
  time(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string;

  /** Date and time together */
  dateTime(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string;

  /** Relative to now (e.g. `2 hours ago`) */
  relative(date: Date | number | string): string;
}

/** Locale-aware number formatting. */
export class NumberFormatter {
  constructor(locale?: string);

  locale: string;

  /** Format with explicit `Intl.NumberFormat` options */
  format(value: number, options?: Intl.NumberFormatOptions): string;

  /** Fixed number of fraction digits; defaults to 2 */
  decimal(value: number, decimals?: number): string;

  /** Percentage; `value` is a ratio, so `0.42` renders as `42%` */
  percent(value: number, decimals?: number): string;

  /** Compact notation (e.g. `1.2K`) */
  compact(value: number): string;

  /** Value with a unit (e.g. `5 km`) */
  unit(value: number, unit: string, options?: Intl.NumberFormatOptions): string;
}

/** Locale-aware currency formatting. */
export class CurrencyFormatter {
  constructor(locale?: string, defaultCurrency?: string);

  locale: string;

  /** Format using the given currency, or the configured default */
  format(value: number, currency?: string | null, options?: Intl.NumberFormatOptions): string;

  /** No fraction digits */
  whole(value: number, currency?: string | null): string;

  /** Symbol notation (`$1.00`) */
  symbol(value: number, currency?: string | null): string;

  /** Narrow symbol notation */
  narrowSymbol(value: number, currency?: string | null): string;

  /** Code notation (`USD 1.00`) */
  code(value: number, currency?: string | null): string;
}

/** Locale-aware list formatting. */
export class ListFormatter {
  constructor(locale?: string);

  locale: string;

  /** Format with explicit `Intl.ListFormat` options */
  format(items: string[], options?: Intl.ListFormatOptions): string;

  /** Conjunction (`A, B, and C`) */
  and(items: string[]): string;

  /** Disjunction (`A, B, or C`) */
  or(items: string[]): string;

  /** Unit list (`A, B, C`) */
  unit(items: string[]): string;
}

/** Every formatter for one locale. */
export interface Formatters {
  date: DateFormatter;
  number: NumberFormatter;
  currency: CurrencyFormatter;
  list: ListFormatter;
}

/** Create all four formatters for a locale. */
export function createFormatters(
  locale?: string,
  options?: { defaultCurrency?: string }
): Formatters;

// ============================================================================
// Locale Utilities
// ============================================================================

/** Text direction. */
export type LocaleDirection = 'ltr' | 'rtl';

/** A locale code split into its parts. */
export interface ParsedLocale {
  language: string;
  region: string | null;
  script: string | null;
  full: string;
}

/** The environment's preferred locale, or `'en'` outside a browser. */
export function detectLocale(): string;

/**
 * Lowercase a locale code and normalize the separator. The region is dropped
 * unless `keepRegion` is set, so `'en_US'` gives `'en'`, or `'en-us'` when
 * kept. Empty input gives `'en'`.
 */
export function normalizeLocale(locale: string | null | undefined, keepRegion?: boolean): string;

/** Split a locale code into language, region and script. */
export function parseLocale(locale: string): ParsedLocale;

/** Text direction for a locale. */
export function getLocaleDirection(locale: string): LocaleDirection;

/** Whether a locale is right-to-left. */
export function isRTL(locale: string): boolean;

/** Human-readable name of a locale, rendered in `displayLocale`. */
export function getLocaleDisplayName(locale: string, displayLocale?: string): string;

/**
 * Pick the closest available locale, falling back to the language subtag and
 * finally to `defaultLocale`.
 */
export function matchLocale(
  requestedLocale: string,
  availableLocales: string[],
  defaultLocale?: string
): string;

/** The environment's preferred locales, most preferred first. */
export function getSupportedLocales(): string[];

export interface LocaleManagerOptions {
  /** Locale used when detection and storage yield nothing; defaults to `'en'` */
  defaultLocale?: string;
  /** Locales this app ships; defaults to `['en']` */
  availableLocales?: string[];
  /** localStorage key; defaults to `'coherent-locale'` */
  storageKey?: string;
  /** Detect from the environment on construction; defaults to `true` */
  autoDetect?: boolean;
  [option: string]: unknown;
}

/** Called after the locale changes. */
export type LocaleChangeListener = (newLocale: string, oldLocale: string) => void;

/**
 * Tracks the active locale, persisting it to localStorage where available.
 */
export class LocaleManager {
  constructor(options?: LocaleManagerOptions);

  options: LocaleManagerOptions;
  currentLocale: string;
  listeners: LocaleChangeListener[];

  /** Detect the environment locale and match it against the available ones */
  detectAndMatch(): string;

  /** The active locale */
  getLocale(): string;

  /** Match, store and broadcast a new locale; a no-op if unchanged */
  setLocale(locale: string): void;

  /** Subscribe to locale changes; returns an unsubscribe function */
  onChange(listener: LocaleChangeListener): () => void;

  /** Invoke every listener, swallowing listener errors */
  notifyListeners(oldLocale: string, newLocale: string): void;

  /** Persist the active locale, ignoring storage failures */
  saveToStorage(): void;

  /** Restore a persisted locale, ignoring storage failures */
  loadFromStorage(): void;

  /** Copy of the configured available locales */
  getAvailableLocales(): string[];

  /** Whether a locale is in the available list */
  isAvailable(locale: string): boolean;
}

/** Create a {@link LocaleManager}. */
export function createLocaleManager(options?: LocaleManagerOptions): LocaleManager;
