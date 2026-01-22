/**
 * Coherent.js I18n TypeScript Definitions
 * @module @coherent.js/i18n
 */

import type { CoherentNode } from '@coherent.js/core';

// ============================================================================
// Translation Key Types
// ============================================================================

/**
 * Translation key type (can be extended for type-safe translations)
 */
export type TranslationKey = string;

/**
 * Nested translation messages object
 */
export type TranslationMessages = {
  [key: string]: string | TranslationMessages;
};

/**
 * Helper type to flatten nested keys with dot notation
 * @example FlattenKeys<{ home: { title: 'Title' } }> = 'home.title'
 */
export type FlattenKeys<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : {
      [K in keyof T]: FlattenKeys<
        T[K],
        `${Prefix}${Prefix extends '' ? '' : '.'}${K & string}`
      >;
    }[keyof T];

// ============================================================================
// Translation Function Types
// ============================================================================

/**
 * Translation function with overloads for different use cases
 */
export interface TranslationFunction {
  /**
   * Translate a key
   */
  (key: TranslationKey): string;

  /**
   * Translate a key with interpolation parameters
   */
  (key: TranslationKey, params: Record<string, string | number>): string;

  /**
   * Translate a key with interpolation and pluralization
   */
  (key: TranslationKey, params: Record<string, string | number>, count: number): string;
}

/**
 * Create a typed translator for a specific message shape
 * @template T - The translation messages type
 */
export function createTypedTranslator<T extends TranslationMessages>(
  messages: T
): (key: FlattenKeys<T>, params?: Record<string, string | number>) => string;

// ============================================================================
// I18n Configuration
// ============================================================================

/**
 * I18n configuration options
 */
export interface I18nConfig {
  /** Default locale code (e.g., 'en', 'en-US') */
  defaultLocale: string;
  /** List of supported locale codes */
  supportedLocales: string[];
  /** Fallback locale when translation is missing */
  fallbackLocale?: string;
  /** Async function to load messages for a locale */
  loadMessages?: (locale: string) => Promise<TranslationMessages>;
  /** Pre-loaded messages by locale */
  messages?: Record<string, TranslationMessages>;
  /** Handler for missing translation keys */
  missingKeyHandler?: (key: string, locale: string) => string;
  /** Interpolation settings */
  interpolation?: {
    /** Interpolation prefix (default: '{{') */
    prefix?: string;
    /** Interpolation suffix (default: '}}') */
    suffix?: string;
    /** Escape HTML in interpolated values */
    escapeHtml?: boolean;
  };
  /** Enable pluralization support */
  pluralization?: boolean;
  /** Context separator for contextual translations */
  contextSeparator?: string;
}

// ============================================================================
// I18n Instance
// ============================================================================

/**
 * I18n instance interface
 */
export interface I18nInstance {
  /** Current locale code */
  readonly locale: string;

  /** Translation function */
  t: TranslationFunction;

  /**
   * Change the current locale
   */
  setLocale(locale: string): Promise<void>;

  /**
   * Get the current locale code
   */
  getLocale(): string;

  /**
   * Get list of supported locales
   */
  getSupportedLocales(): string[];

  /**
   * Check if a translation key exists
   */
  hasTranslation(key: TranslationKey): boolean;

  /**
   * Format a number according to locale
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;

  /**
   * Format a date according to locale
   */
  formatDate(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string;

  /**
   * Format a currency value
   */
  formatCurrency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string;

  /**
   * Format a relative time (e.g., "3 days ago")
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string;

  /**
   * Format a list (e.g., "A, B, and C")
   */
  formatList(values: string[], options?: Intl.ListFormatOptions): string;

  /**
   * Add messages for a locale
   */
  addMessages(messages: TranslationMessages, locale?: string): void;

  /**
   * Get all messages for current locale
   */
  getMessages(): TranslationMessages;
}

/**
 * Create an i18n instance
 */
export function createI18n(config: I18nConfig): I18nInstance;

/**
 * Hook to get the translation function (for component usage)
 */
export function useTranslation(): TranslationFunction;

/**
 * Hook to get and set the current locale
 */
export function useLocale(): [string, (locale: string) => Promise<void>];

// ============================================================================
// Translator Class
// ============================================================================

/**
 * Translator options
 */
export interface TranslatorOptions {
  /** Current locale code */
  locale: string;
  /** Translation messages for current locale */
  messages: TranslationMessages;
  /** Fallback locale code */
  fallbackLocale?: string;
  /** Fallback messages */
  fallbackMessages?: TranslationMessages;
  /** Interpolation settings */
  interpolation?: {
    prefix?: string;
    suffix?: string;
  };
  /** Enable pluralization */
  pluralization?: boolean;
  /** Context separator */
  contextSeparator?: string;
}

/**
 * Translator class
 */
export class Translator {
  constructor(options: TranslatorOptions);

  /**
   * Translate a key
   */
  t(key: string, params?: Record<string, unknown>): string;

  /**
   * Alias for t()
   */
  translate(key: string, params?: Record<string, unknown>): string;

  /**
   * Check if a translation exists
   */
  has(key: string): boolean;

  /**
   * Set the current locale
   */
  setLocale(locale: string): void;

  /**
   * Get the current locale
   */
  getLocale(): string;

  /**
   * Add translation messages
   */
  addMessages(messages: TranslationMessages, locale?: string): void;

  /**
   * Remove translation messages
   */
  removeMessages(keys: string[], locale?: string): void;
}

/**
 * Create a translator instance
 */
export function createTranslator(options: TranslatorOptions): Translator;

/**
 * Create a scoped translator (prefixes all keys)
 */
export function createScopedTranslator(translator: Translator, scope: string): Translator;

// ============================================================================
// Formatters
// ============================================================================

/**
 * Date formatter options
 */
export interface DateFormatterOptions {
  locale?: string;
  timeZone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  format?: string;
}

/**
 * Date formatter class
 */
export class DateFormatter {
  constructor(locale?: string, options?: DateFormatterOptions);

  /** Format a date */
  format(date: Date | number | string): string;

  /** Format as relative time (e.g., "2 hours ago") */
  formatRelative(date: Date | number | string): string;

  /** Format distance between dates */
  formatDistance(date: Date | number | string, baseDate?: Date | number): string;
}

/**
 * Number formatter options
 */
export interface NumberFormatterOptions {
  locale?: string;
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

/**
 * Number formatter class
 */
export class NumberFormatter {
  constructor(locale?: string, options?: NumberFormatterOptions);

  /** Format a number */
  format(value: number): string;

  /** Format as compact notation */
  formatCompact(value: number): string;

  /** Format as percentage */
  formatPercent(value: number): string;
}

/**
 * Currency formatter options
 */
export interface CurrencyFormatterOptions {
  locale?: string;
  currency: string;
  display?: 'symbol' | 'code' | 'name';
}

/**
 * Currency formatter class
 */
export class CurrencyFormatter {
  constructor(locale?: string, options?: CurrencyFormatterOptions);

  /** Format a currency value */
  format(value: number): string;
}

/**
 * List formatter options
 */
export interface ListFormatterOptions {
  locale?: string;
  type?: 'conjunction' | 'disjunction' | 'unit';
  style?: 'long' | 'short' | 'narrow';
}

/**
 * List formatter class
 */
export class ListFormatter {
  constructor(locale?: string, options?: ListFormatterOptions);

  /** Format a list of items */
  format(list: string[]): string;
}

/**
 * All formatters for a locale
 */
export interface Formatters {
  date: DateFormatter;
  number: NumberFormatter;
  currency: CurrencyFormatter;
  list: ListFormatter;
}

/**
 * Create all formatters for a locale
 */
export function createFormatters(locale: string): Formatters;

// ============================================================================
// Locale Management
// ============================================================================

/**
 * Locale configuration
 */
export interface LocaleConfig {
  /** Locale code (e.g., 'en-US') */
  code: string;
  /** English name */
  name: string;
  /** Native name */
  nativeName: string;
  /** Text direction */
  direction?: 'ltr' | 'rtl';
  /** Date format pattern */
  dateFormat?: string;
  /** Time format pattern */
  timeFormat?: string;
  /** First day of week (0 = Sunday, 1 = Monday, etc.) */
  firstDayOfWeek?: number;
}

/**
 * Locale manager class
 */
export class LocaleManager {
  constructor(locales: LocaleConfig[]);

  /** Add a locale configuration */
  addLocale(locale: LocaleConfig): void;

  /** Remove a locale */
  removeLocale(code: string): void;

  /** Get locale configuration */
  getLocale(code: string): LocaleConfig | undefined;

  /** Get all locale configurations */
  getAllLocales(): LocaleConfig[];

  /** Set current locale */
  setCurrentLocale(code: string): void;

  /** Get current locale configuration */
  getCurrentLocale(): LocaleConfig;
}

/**
 * Create a locale manager
 */
export function createLocaleManager(locales: LocaleConfig[]): LocaleManager;

/**
 * Detect user's preferred locale
 */
export function detectLocale(): string;

/**
 * Normalize a locale code (e.g., 'en_US' -> 'en-US')
 */
export function normalizeLocale(locale: string): string;

/**
 * Check if a locale uses RTL text direction
 */
export function isRTL(locale: string): boolean;

// ============================================================================
// Component Helpers
// ============================================================================

/**
 * Create a translated component node
 */
export function translatedNode(
  key: TranslationKey,
  tagName?: string,
  params?: Record<string, string | number>
): CoherentNode;

/**
 * Create an i18n context provider component
 */
export function createI18nProvider(
  i18n: I18nInstance,
  children: CoherentNode
): CoherentNode;
