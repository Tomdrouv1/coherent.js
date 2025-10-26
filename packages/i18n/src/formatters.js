/**
 * Coherent.js I18n Formatters
 * 
 * Locale-aware formatting for dates, numbers, and currencies
 * 
 * @module i18n/formatters
 */

/**
 * Date Formatter
 * Formats dates according to locale
 */
export class DateFormatter {
  constructor(locale = 'en') {
    this.locale = locale;
  }

  /**
   * Format a date
   * 
   * @param {Date|string|number} date - Date to format
   * @param {Object} [options] - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  format(date, options = {}) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const formatter = new Intl.DateTimeFormat(this.locale, options);
      return formatter.format(dateObj);
    }
    
    // Fallback
    return dateObj.toLocaleDateString();
  }

  /**
   * Format date as short (e.g., 1/1/2024)
   */
  short(date) {
    return this.format(date, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }

  /**
   * Format date as medium (e.g., Jan 1, 2024)
   */
  medium(date) {
    return this.format(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format date as long (e.g., January 1, 2024)
   */
  long(date) {
    return this.format(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date as full (e.g., Monday, January 1, 2024)
   */
  full(date) {
    return this.format(date, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format time
   */
  time(date, options = {}) {
    return this.format(date, {
      hour: 'numeric',
      minute: 'numeric',
      ...options
    });
  }

  /**
   * Format date and time
   */
  dateTime(date, options = {}) {
    return this.format(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      ...options
    });
  }

  /**
   * Format relative time (e.g., "2 days ago")
   */
  relative(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
      
      if (diffDay > 0) {
        return rtf.format(-diffDay, 'day');
      } else if (diffHour > 0) {
        return rtf.format(-diffHour, 'hour');
      } else if (diffMin > 0) {
        return rtf.format(-diffMin, 'minute');
      } else {
        return rtf.format(-diffSec, 'second');
      }
    }

    // Fallback
    if (diffDay > 0) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else if (diffHour > 0) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }
}

/**
 * Number Formatter
 * Formats numbers according to locale
 */
export class NumberFormatter {
  constructor(locale = 'en') {
    this.locale = locale;
  }

  /**
   * Format a number
   * 
   * @param {number} value - Number to format
   * @param {Object} [options] - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  format(value, options = {}) {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const formatter = new Intl.NumberFormat(this.locale, options);
      return formatter.format(value);
    }
    
    // Fallback
    return value.toLocaleString();
  }

  /**
   * Format as decimal
   */
  decimal(value, decimals = 2) {
    return this.format(value, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Format as percentage
   */
  percent(value, decimals = 0) {
    return this.format(value, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Format as compact (e.g., 1.2K, 3.4M)
   */
  compact(value) {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        const formatter = new Intl.NumberFormat(this.locale, {
          notation: 'compact',
          compactDisplay: 'short'
        });
        return formatter.format(value);
      } catch (e) {
        // Fallback for older browsers
      }
    }
    
    // Manual compact formatting
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)  }B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)  }M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)  }K`;
    }
    
    return String(value);
  }

  /**
   * Format with units
   */
  unit(value, unit, options = {}) {
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      try {
        const formatter = new Intl.NumberFormat(this.locale, {
          style: 'unit',
          unit,
          ...options
        });
        return formatter.format(value);
      } catch (e) {
        // Fallback
      }
    }
    
    return `${value} ${unit}`;
  }
}

/**
 * Currency Formatter
 * Formats currency values according to locale
 */
export class CurrencyFormatter {
  constructor(locale = 'en', defaultCurrency = 'USD') {
    this.locale = locale;
    this.defaultCurrency = defaultCurrency;
  }

  /**
   * Format a currency value
   * 
   * @param {number} value - Amount to format
   * @param {string} [currency] - Currency code (e.g., 'USD', 'EUR')
   * @param {Object} [options] - Additional options
   * @returns {string} Formatted currency
   */
  format(value, currency = null, options = {}) {
    const currencyCode = currency || this.defaultCurrency;
    
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const formatter = new Intl.NumberFormat(this.locale, {
        style: 'currency',
        currency: currencyCode,
        ...options
      });
      return formatter.format(value);
    }
    
    // Fallback
    return `${currencyCode} ${value.toFixed(2)}`;
  }

  /**
   * Format without decimal places
   */
  whole(value, currency = null) {
    return this.format(value, currency, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  /**
   * Format with symbol only (no code)
   */
  symbol(value, currency = null) {
    return this.format(value, currency, {
      currencyDisplay: 'symbol'
    });
  }

  /**
   * Format with narrow symbol
   */
  narrowSymbol(value, currency = null) {
    return this.format(value, currency, {
      currencyDisplay: 'narrowSymbol'
    });
  }

  /**
   * Format with code (e.g., USD 100.00)
   */
  code(value, currency = null) {
    return this.format(value, currency, {
      currencyDisplay: 'code'
    });
  }
}

/**
 * List Formatter
 * Formats lists according to locale
 */
export class ListFormatter {
  constructor(locale = 'en') {
    this.locale = locale;
  }

  /**
   * Format a list
   * 
   * @param {Array} items - Items to format
   * @param {Object} [options] - Formatting options
   * @returns {string} Formatted list
   */
  format(items, options = {}) {
    if (typeof Intl !== 'undefined' && Intl.ListFormat) {
      const formatter = new Intl.ListFormat(this.locale, options);
      return formatter.format(items);
    }
    
    // Fallback
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    return `${rest.join(', ')}, and ${last}`;
  }

  /**
   * Format as conjunction (and)
   */
  and(items) {
    return this.format(items, { type: 'conjunction' });
  }

  /**
   * Format as disjunction (or)
   */
  or(items) {
    return this.format(items, { type: 'disjunction' });
  }

  /**
   * Format as unit list
   */
  unit(items) {
    return this.format(items, { type: 'unit' });
  }
}

/**
 * Create formatters for a locale
 * 
 * @param {string} locale - Locale code
 * @param {Object} [options] - Formatter options
 * @returns {Object} Formatter instances
 */
export function createFormatters(locale = 'en', options = {}) {
  return {
    date: new DateFormatter(locale),
    number: new NumberFormatter(locale),
    currency: new CurrencyFormatter(locale, options.defaultCurrency),
    list: new ListFormatter(locale)
  };
}

export default {
  DateFormatter,
  NumberFormatter,
  CurrencyFormatter,
  ListFormatter,
  createFormatters
};
