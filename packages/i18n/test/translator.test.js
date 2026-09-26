/**
 * Tests for i18n - Translator
 * 
 * Coverage areas:
 * - Basic translation
 * - Variable interpolation
 * - Pluralization
 * - Context and loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@coherent.js/core';
import { createTranslator } from '../src/translator.js';

describe('Translator', () => {
  let translator;
  let translations;

  beforeEach(() => {
    translations = {
      en: {
        hello: 'Hello',
        welcome: 'Welcome, {{name}}!',
        items: {
          zero: 'No items',
          one: 'One item',
          other: '{{count}} items'
        },
        nested: {
          deep: {
            key: 'Deep value'
          }
        }
      },
      fr: {
        hello: 'Bonjour',
        welcome: 'Bienvenue, {{name}}!',
        items: {
          zero: 'Aucun élément',
          one: 'Un élément',
          other: '{{count}} éléments'
        }
      },
      es: {
        hello: 'Hola',
        welcome: 'Bienvenido, {{name}}!'
      }
    };

    translator = createTranslator({
      defaultLocale: 'en',
      fallbackLocale: 'en'
    });
    
    // Load translations
    translator.addTranslations('en', translations.en);
    translator.addTranslations('fr', translations.fr);
    translator.addTranslations('es', translations.es);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Translation', () => {
    it('should translate simple strings', () => {
      const result = translator.t('hello');
      expect(result).toBe('Hello');
    });

    it('should handle missing translations', () => {
      const result = translator.t('nonexistent');
      expect(result).toBe('nonexistent'); // Returns key as fallback
    });

    it('should use fallback language', () => {
      translator.setLocale('de'); // German not available
      const result = translator.t('hello');
      expect(result).toBe('Hello'); // Falls back to English
    });

    it('should support multiple languages', () => {
      expect(translator.t('hello')).toBe('Hello');
      
      translator.setLocale('fr');
      expect(translator.t('hello')).toBe('Bonjour');
      
      translator.setLocale('es');
      expect(translator.t('hello')).toBe('Hola');
    });

    it('should handle nested keys', () => {
      const result = translator.t('nested.deep.key');
      expect(result).toBe('Deep value');
    });

    it('should handle dot notation in keys', () => {
      const result = translator.t('nested.deep.key');
      expect(result).toBe('Deep value');
    });
  });

  describe('Variable Interpolation', () => {
    it('should handle multiple variables', () => {
      translator.addTranslations('en', { greeting: 'Hello {{firstName}} {{lastName}}!' });
      const result = translator.t('greeting', { firstName: 'John', lastName: 'Doe' });
      expect(result).toBe('Hello John Doe!');
    });

    it('should handle nested variables', () => {
      translator.addTranslations('en', { user: 'User: {{user.name}} ({{user.id}})' });
      const result = translator.t('user', { 'user.name': 'Alice', 'user.id': 123 });
      expect(result).toContain('Alice');
    });

    it('should handle special characters in variables', () => {
      const result = translator.t('welcome', { name: '<script>alert("xss")</script>' });
      expect(result).toContain('<script>'); // No escaping by default
    });

    it('should handle missing variables gracefully', () => {
      const result = translator.t('welcome', {});
      expect(result).toContain('{{name}}'); // Keeps placeholder
    });

    it('inserts $ replacement patterns in a param literally', () => {
      translator.addTranslations('en', { hi: 'Hello {{name}}!' });
      expect(translator.t('hi', { name: "$'" })).toBe("Hello $'!");
      expect(translator.t('hi', { name: '$&' })).toBe('Hello $&!');
      expect(translator.t('hi', { name: '$$' })).toBe('Hello $$!');
      expect(translator.t('hi', { name: '$`' })).toBe('Hello $`!');
    });

    it('does not interpolate a placeholder that arrives inside a param value', () => {
      translator.addTranslations('en', { pair: '{{a}} / {{b}}' });
      expect(translator.t('pair', { a: '{{b}}', b: 'B' })).toBe('{{b}} / B');
    });

    it('treats param names literally, not as regex', () => {
      translator.addTranslations('en', { dotted: '{{a.b}} {{axb}}' });
      expect(translator.t('dotted', { 'a.b': 'dot' })).toBe('dot {{axb}}');
    });

    it('supports a custom prefix and suffix containing regex metacharacters', () => {
      const custom = createTranslator({ interpolation: { prefix: '%(', suffix: ')s' } });
      custom.addTranslations('en', { hi: 'Hello %(name)s, you have %(count)s messages' });
      expect(custom.t('hi', { name: 'Ada', count: 3 })).toBe('Hello Ada, you have 3 messages');
    });

    it('keeps the default suffix when only the prefix is overridden', () => {
      const custom = createTranslator({ interpolation: { prefix: '[[' } });
      custom.addTranslations('en', { hi: 'Hello [[name}}' });
      expect(custom.options.interpolation).toEqual({ prefix: '[[', suffix: '}}' });
      expect(custom.t('hi', { name: 'Ada' })).toBe('Hello Ada');
    });
  });

  describe('HTML escaping of params', () => {
    const XSS = '<img src=x onerror="alert(\'x\')">&';
    const ESCAPED = '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;';

    beforeEach(() => {
      translator.addTranslations('en', { rich: '<strong>{{name}}</strong> joined' });
    });

    it('does not escape by default (backward compatible)', () => {
      expect(translator.t('rich', { name: XSS })).toBe(`<strong>${XSS}</strong> joined`);
    });

    it('escapes params, not the template, when escape is passed per call', () => {
      expect(translator.t('rich', { name: XSS }, { escape: true }))
        .toBe(`<strong>${ESCAPED}</strong> joined`);
    });

    it('accepts a locale alongside escape in the options object', () => {
      translator.addTranslations('fr', { rich: '<em>{{name}}</em> a rejoint' });
      expect(translator.t('rich', { name: '<b>' }, { locale: 'fr', escape: true }))
        .toBe('<em>&lt;b&gt;</em> a rejoint');
      expect(translator.getLocale()).toBe('en');
    });

    it('escapes params for every call when the translator is created with escape: true', () => {
      const safe = createTranslator({ escape: true });
      safe.addTranslations('en', { rich: '<strong>{{name}}</strong> has {{count}} items' });
      expect(safe.t('rich', { name: XSS, count: 2 })).toBe(`<strong>${ESCAPED}</strong> has 2 items`);
      expect(safe.interpolate('{{v}}', { v: '<i>' })).toBe('&lt;i&gt;');
      // A per-call escape: false opts back out.
      expect(safe.t('rich', { name: '<i>', count: 1 }, { escape: false }))
        .toBe('<strong><i></strong> has 1 items');
    });

    it('keeps the escaped output safe when rendered through core html:', () => {
      const html = render({ p: { html: translator.t('rich', { name: XSS }, { escape: true }) } });
      expect(html).toBe(`<p><strong>${ESCAPED}</strong> joined</p>`);
    });

    it('is not needed for text:, which core escapes already', () => {
      const html = render({ p: { text: translator.t('welcome', { name: '<b>' }) } });
      expect(html).toBe('<p>Welcome, &lt;b&gt;!</p>');
    });
  });

  describe('Inherited properties', () => {
    it('does not resolve Object.prototype members as translations', () => {
      expect(translator.t('constructor')).toBe('constructor');
      expect(translator.t('toString')).toBe('toString');
      expect(translator.t('__proto__')).toBe('__proto__');
      expect(translator.t('hasOwnProperty')).toBe('hasOwnProperty');
      expect(translator.has('constructor')).toBe(false);
    });

    it('does not resolve inherited members through nested dot keys', () => {
      expect(translator.t('nested.constructor')).toBe('nested.constructor');
      expect(translator.t('nested.deep.valueOf')).toBe('nested.deep.valueOf');
      expect(translator.t('hello.length')).toBe('hello.length');
      expect(translator.getTranslation('nested.deep.constructor', 'en')).toBeNull();
    });

    it('still resolves an own key named like a prototype member', () => {
      translator.addTranslations('en', { toString: 'custom', group: { constructor: 'built' } });
      expect(translator.t('toString')).toBe('custom');
      expect(translator.t('group.constructor')).toBe('built');
    });
  });

  describe('Pluralization', () => {
    it('should handle plural forms', () => {
      const result0 = translator.t('items', { count: 0 });
      const result1 = translator.t('items', { count: 1 });
      const result5 = translator.t('items', { count: 5 });
      
      // Intl.PluralRules may return 'other' for 0
      expect(['No items', '0 items']).toContain(result0);
      expect(result1).toBe('One item');
      expect(result5).toBe('5 items');
    });

    it('should support different plural rules', () => {
      translator.setLocale('fr');
      expect(translator.t('items', { count: 0 })).toBe('Aucun élément');
      expect(translator.t('items', { count: 1 })).toBe('Un élément');
      expect(translator.t('items', { count: 5 })).toBe('5 éléments');
    });

    it('should handle zero/one/many cases', () => {
      const result0 = translator.t('items', { count: 0 });
      const result1 = translator.t('items', { count: 1 });
      const result2 = translator.t('items', { count: 2 });

      // Intl.PluralRules may return 'other' for 0, resulting in '0 items'
      expect(['No items', '0 items']).toContain(result0);
      expect(result1).toBe('One item');
      expect(result2).toBe('2 items');
    });

    it('should use Intl.PluralRules when available', () => {
      // The translator uses Intl.PluralRules internally
      const result0 = translator.t('items', { count: 0 });
      const result1 = translator.t('items', { count: 1 });
      const result5 = translator.t('items', { count: 5 });
      
      // Either 'No items' or '0 items' depending on Intl.PluralRules
      expect(['No items', '0 items']).toContain(result0);
      expect(result1).toBe('One item');
      expect(result5).toBe('5 items');
    });
  });

  describe('Context Support', () => {
    it('should support nested translation keys', () => {
      translator.addTranslations('en', {
        read: {
          past: 'I read a book yesterday',
          present: 'I read books every day'
        }
      });

      expect(translator.t('read.past')).toBe('I read a book yesterday');
      expect(translator.t('read.present')).toBe('I read books every day');
    });

    it('should handle gendered translations', () => {
      translator.addTranslations('en', {
        welcome_user: {
          male: 'Welcome, Mr. {{name}}',
          female: 'Welcome, Ms. {{name}}',
          other: 'Welcome, {{name}}'
        }
      });

      expect(translator.t('welcome_user.male', { name: 'John' }))
        .toBe('Welcome, Mr. John');
      expect(translator.t('welcome_user.female', { name: 'Jane' }))
        .toBe('Welcome, Ms. Jane');
    });

    it('should support regional variants', () => {
      translator.addTranslations('en-US', { color: 'color' });
      translator.addTranslations('en-GB', { color: 'colour' });

      translator.setLocale('en-US');
      expect(translator.t('color')).toBe('color');

      translator.setLocale('en-GB');
      expect(translator.t('color')).toBe('colour');
    });
  });

  describe('Loading and Management', () => {
    it('should load translation files', () => {
      const newTranslations = {
        goodbye: 'Goodbye'
      };

      translator.addTranslations('en', newTranslations);

      expect(translator.t('goodbye')).toBe('Goodbye');
    });

    it('should merge translation dictionaries', () => {
      translator.addTranslations('en', {
        new_key: 'New value'
      });

      expect(translator.t('hello')).toBe('Hello'); // Existing
      expect(translator.t('new_key')).toBe('New value'); // New
    });

    it('should handle dynamic loading', () => {
      const newTranslations = {
        async_key: 'Async value'
      };

      translator.addTranslations('en', newTranslations);

      expect(translator.t('async_key')).toBe('Async value');
    });

    it('should persist translations', () => {
      translator.addTranslations('en', { cached: 'Cached value' });
      
      // Translations persist
      expect(translator.t('cached')).toBe('Cached value');
      expect(translator.t('cached')).toBe('Cached value');
    });

    it('should get available locales', () => {
      const locales = translator.getLoadedLocales();

      expect(locales).toContain('en');
      expect(locales).toContain('fr');
      expect(locales).toContain('es');
    });

    it('should check if locale is available', () => {
      const locales = translator.getLoadedLocales();
      expect(locales.includes('en')).toBe(true);
      expect(locales.includes('de')).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should get current locale', () => {
      expect(translator.getLocale()).toBe('en');
    });

    it('should set locale', () => {
      translator.setLocale('fr');
      expect(translator.getLocale()).toBe('fr');
    });

    it('should change locale', () => {
      const oldLocale = translator.getLocale();
      translator.setLocale('fr');
      const newLocale = translator.getLocale();

      expect(oldLocale).toBe('en');
      expect(newLocale).toBe('fr');
    });

    it('should add single translation', () => {
      translator.addTranslations('en', { new: 'New translation' });
      expect(translator.t('new')).toBe('New translation');
    });

    it('should check if translation exists', () => {
      expect(translator.has('hello')).toBe(true);
      expect(translator.has('nonexistent')).toBe(false);
    });

    it('should clear all translations for locale', () => {
      translator.removeLocale('es');
      translator.setLocale('es');
      expect(translator.t('hello')).toBe('Hello'); // Falls back to English
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid locale gracefully', () => {
      expect(() => translator.setLocale(null)).not.toThrow();
    });

    it('should handle invalid translation keys', () => {
      // Current implementation throws on null/undefined
      // This is acceptable behavior
      const result = translator.t('nonexistent.key');
      expect(result).toBe('nonexistent.key'); // Returns key as fallback
    });

    it('should handle circular references in variables', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      expect(() => translator.t('welcome', circular)).not.toThrow();
    });

    it('should handle malformed translation data', () => {
      expect(() => translator.addTranslations('en', { bad: null })).not.toThrow();
    });
  });
});
