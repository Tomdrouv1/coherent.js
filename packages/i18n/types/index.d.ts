/**
 * Coherent.js I18n TypeScript Definitions
 * @module @coherent.js/i18n
 */

// ===== Translator Types =====

export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

export interface TranslatorOptions {
  locale: string;
  messages: TranslationMessages;
  fallbackLocale?: string;
  fallbackMessages?: TranslationMessages;
  interpolation?: {
    prefix?: string;
    suffix?: string;
  };
  pluralization?: boolean;
  contextSeparator?: string;
}

export class Translator {
  constructor(options: TranslatorOptions);
  t(key: string, params?: Record<string, any>): string;
  translate(key: string, params?: Record<string, any>): string;
  has(key: string): boolean;
  setLocale(locale: string): void;
  getLocale(): string;
  addMessages(messages: TranslationMessages, locale?: string): void;
  removeMessages(keys: string[], locale?: string): void;
}

export function createTranslator(options: TranslatorOptions): Translator;
export function createScopedTranslator(translator: Translator, scope: string): Translator;

// ===== Formatters Types =====

export interface DateFormatterOptions {
  locale?: string;
  timeZone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  format?: string;
}

export class DateFormatter {
  constructor(locale?: string, options?: DateFormatterOptions);
  format(date: Date | number | string): string;
  formatRelative(date: Date | number | string): string;
  formatDistance(date: Date | number | string, baseDate?: Date | number): string;
}

export interface NumberFormatterOptions {
  locale?: string;
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export class NumberFormatter {
  constructor(locale?: string, options?: NumberFormatterOptions);
  format(value: number): string;
  formatCompact(value: number): string;
  formatPercent(value: number): string;
}

export interface CurrencyFormatterOptions {
  locale?: string;
  currency: string;
  display?: 'symbol' | 'code' | 'name';
}

export class CurrencyFormatter {
  constructor(locale?: string, options?: CurrencyFormatterOptions);
  format(value: number): string;
}

export interface ListFormatterOptions {
  locale?: string;
  type?: 'conjunction' | 'disjunction' | 'unit';
  style?: 'long' | 'short' | 'narrow';
}

export class ListFormatter {
  constructor(locale?: string, options?: ListFormatterOptions);
  format(list: string[]): string;
}

export interface Formatters {
  date: DateFormatter;
  number: NumberFormatter;
  currency: CurrencyFormatter;
  list: ListFormatter;
}

export function createFormatters(locale: string): Formatters;

// ===== Locale Manager Types =====

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
  dateFormat?: string;
  timeFormat?: string;
  firstDayOfWeek?: number;
}

export class LocaleManager {
  constructor(locales: LocaleConfig[]);
  addLocale(locale: LocaleConfig): void;
  removeLocale(code: string): void;
  getLocale(code: string): LocaleConfig | undefined;
  getAllLocales(): LocaleConfig[];
  setCurrentLocale(code: string): void;
  getCurrentLocale(): LocaleConfig;
}

export function createLocaleManager(locales: LocaleConfig[]): LocaleManager;
export function detectLocale(): string;
export function normalizeLocale(locale: string): string;
export function isRTL(locale: string): boolean;
