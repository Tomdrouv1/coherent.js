/**
 * Tests for i18n - LocaleManager
 * 
 * Coverage areas:
 * - Locale management
 * - Fallback handling
 * - Loading and caching
 * - Events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocaleManager, createLocaleManager } from '../src/locale-manager.js';

describe('LocaleManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LocaleManager({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      supportedLocales: ['en', 'fr', 'es', 'de']
    });
  });

  describe('Locale Management', () => {
    it('should get current locale', () => {
      expect(manager.getCurrentLocale()).toBe('en');
    });

    it('should set current locale', () => {
      manager.setLocale('fr');
      expect(manager.getCurrentLocale()).toBe('fr');
    });

    it('should detect browser locale', () => {
      const detected = manager.detectBrowserLocale();
      expect(typeof detected).toBe('string');
    });

    it('should validate locale codes', () => {
      expect(manager.isValidLocale('en')).toBe(true);
      expect(manager.isValidLocale('fr')).toBe(true);
      expect(manager.isValidLocale('invalid')).toBe(false);
    });

    it('should get supported locales', () => {
      const locales = manager.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('fr');
      expect(locales).toContain('es');
    });

    it('should add supported locale', () => {
      manager.addSupportedLocale('it');
      expect(manager.isValidLocale('it')).toBe(true);
    });
  });

  describe('Fallback Handling', () => {
    it('should use fallback locale', () => {
      manager.setLocale('invalid');
      expect(manager.getCurrentLocale()).toBe('en'); // Falls back
    });

    it('should chain fallback locales', () => {
      manager.setFallbackChain(['en-US', 'en', 'fr']);
      const chain = manager.getFallbackChain();
      expect(chain).toEqual(['en-US', 'en', 'fr']);
    });

    it('should handle missing locales', () => {
      expect(() => manager.setLocale('nonexistent')).not.toThrow();
    });

    it('should resolve locale with fallback', () => {
      const resolved = manager.resolveLocale('en-US');
      expect(['en-US', 'en']).toContain(resolved);
    });
  });

  describe('Loading and Caching', () => {
    it('should load locale data', async () => {
      const data = { hello: 'Hello' };
      await manager.loadLocaleData('en', data);
      
      const loaded = manager.getLocaleData('en');
      expect(loaded).toEqual(data);
    });

    it('should lazy load locales', async () => {
      const loader = vi.fn().mockResolvedValue({ hello: 'Bonjour' });
      
      await manager.lazyLoad('fr', loader);
      
      expect(loader).toHaveBeenCalled();
      expect(manager.getLocaleData('fr')).toEqual({ hello: 'Bonjour' });
    });

    it('should cache locale data', async () => {
      const loader = vi.fn().mockResolvedValue({ hello: 'Hola' });
      
      await manager.lazyLoad('es', loader);
      await manager.lazyLoad('es', loader); // Second call
      
      expect(loader).toHaveBeenCalledTimes(1); // Cached
    });

    it('should clear locale cache', () => {
      manager.loadLocaleData('en', { hello: 'Hello' });
      manager.clearCache('en');
      
      expect(manager.getLocaleData('en')).toBeUndefined();
    });

    it('should preload multiple locales', async () => {
      const loaders = {
        fr: () => Promise.resolve({ hello: 'Bonjour' }),
        es: () => Promise.resolve({ hello: 'Hola' })
      };
      
      await manager.preloadLocales(['fr', 'es'], loaders);
      
      expect(manager.getLocaleData('fr')).toBeDefined();
      expect(manager.getLocaleData('es')).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit locale change events', () => {
      const listener = vi.fn();
      manager.on('localeChange', listener);
      
      manager.setLocale('fr');
      
      expect(listener).toHaveBeenCalledWith({
        from: 'en',
        to: 'fr'
      });
    });

    it('should notify listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.on('localeChange', listener1);
      manager.on('localeChange', listener2);
      
      manager.setLocale('es');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle locale errors', () => {
      const errorListener = vi.fn();
      manager.on('error', errorListener);
      
      manager.setLocale(null);
      
      expect(errorListener).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      const unsubscribe = manager.on('localeChange', listener);
      
      unsubscribe();
      manager.setLocale('fr');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Locale Matching', () => {
    it('should match exact locale', () => {
      const match = manager.matchLocale('en-US');
      expect(match).toBe('en-US');
    });

    it('should match base locale', () => {
      const match = manager.matchLocale('en-GB');
      expect(['en-GB', 'en']).toContain(match);
    });

    it('should find best match', () => {
      const match = manager.findBestMatch(['fr-CA', 'fr-FR', 'en']);
      expect(['fr', 'en']).toContain(match);
    });

    it('should handle locale preferences', () => {
      const preferences = ['fr-CA', 'fr', 'en'];
      const match = manager.matchPreferences(preferences);
      expect(['fr', 'en']).toContain(match);
    });
  });

  describe('Helper Functions', () => {
    it('should create manager with factory', () => {
      const newManager = createLocaleManager({ defaultLocale: 'fr' });
      expect(newManager).toBeInstanceOf(LocaleManager);
      expect(newManager.getCurrentLocale()).toBe('fr');
    });

    it('should parse locale code', () => {
      const parsed = manager.parseLocale('en-US');
      expect(parsed).toEqual({
        language: 'en',
        region: 'US'
      });
    });

    it('should format locale code', () => {
      const formatted = manager.formatLocale('en', 'US');
      expect(formatted).toBe('en-US');
    });

    it('should get locale display name', () => {
      const name = manager.getDisplayName('fr', 'en');
      expect(name).toContain('French');
    });
  });

  describe('Configuration', () => {
    it('should respect default locale', () => {
      const customManager = new LocaleManager({ defaultLocale: 'fr' });
      expect(customManager.getCurrentLocale()).toBe('fr');
    });

    it('should respect supported locales', () => {
      const customManager = new LocaleManager({
        supportedLocales: ['en', 'fr']
      });
      
      expect(customManager.isValidLocale('en')).toBe(true);
      expect(customManager.isValidLocale('es')).toBe(false);
    });

    it('should handle auto-detection', () => {
      const autoManager = new LocaleManager({ autoDetect: true });
      expect(autoManager.getCurrentLocale()).toBeDefined();
    });
  });
});
