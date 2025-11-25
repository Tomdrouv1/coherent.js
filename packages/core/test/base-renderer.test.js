import { describe, it, expect } from 'vitest';
import { BaseRenderer, DEFAULT_RENDERER_CONFIG } from '../src/rendering/base-renderer.js';

describe('BaseRenderer', () => {
  describe('Constructor and Configuration', () => {
    it('should create renderer with default config', () => {
      const renderer = new BaseRenderer();
      expect(renderer.config).toEqual(DEFAULT_RENDERER_CONFIG);
      expect(renderer.metrics).toEqual({
        startTime: null,
        endTime: null,
        elementsProcessed: 0
      });
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        maxDepth: 50,
        enableValidation: false,
        chunkSize: 2048
      };
      const renderer = new BaseRenderer(customConfig);

      expect(renderer.config.maxDepth).toBe(50);
      expect(renderer.config.enableValidation).toBe(false);
      expect(renderer.config.chunkSize).toBe(2048);
      expect(renderer.config.enableMonitoring).toBe(DEFAULT_RENDERER_CONFIG.enableMonitoring);
    });

    it('should validate maxDepth configuration', () => {
      expect(() => new BaseRenderer({ maxDepth: 'invalid' })).toThrow('maxDepth must be a number');
      expect(() => new BaseRenderer({ maxDepth: 0 })).toThrow('maxDepth must be a positive number');
      expect(() => new BaseRenderer({ maxDepth: -1 })).toThrow('maxDepth must be a positive number');
    });

    it('should validate chunkSize configuration', () => {
      expect(() => new BaseRenderer({ chunkSize: 'invalid' })).toThrow('chunkSize must be a number');
      expect(() => new BaseRenderer({ chunkSize: 0 })).toThrow('chunkSize must be a positive number');
      expect(() => new BaseRenderer({ chunkSize: -1 })).toThrow('chunkSize must be a positive number');
    });

    it('should validate yieldThreshold configuration', () => {
      expect(() => new BaseRenderer({ yieldThreshold: 'invalid' })).toThrow('yieldThreshold must be a number');
      expect(() => new BaseRenderer({ yieldThreshold: 0 })).toThrow('yieldThreshold must be a positive number');
      expect(() => new BaseRenderer({ yieldThreshold: -1 })).toThrow('yieldThreshold must be a positive number');
    });

    it('should accept valid configurations', () => {
      expect(() => new BaseRenderer({
        maxDepth: 10,
        chunkSize: 512,
        yieldThreshold: 50
      })).not.toThrow();
    });
  });

  describe('Component Validation', () => {
    let renderer;

    beforeEach(() => {
      renderer = new BaseRenderer();
    });

    it('should validate null and undefined components', () => {
      expect(renderer.isValidComponent(null)).toBe(true);
      expect(renderer.isValidComponent(undefined)).toBe(true);
    });

    it('should validate string components', () => {
      expect(renderer.isValidComponent('Hello World')).toBe(true);
      expect(renderer.isValidComponent('')).toBe(true);
    });

    it('should validate number components', () => {
      expect(renderer.isValidComponent(42)).toBe(true);
      expect(renderer.isValidComponent(0)).toBe(true);
      expect(renderer.isValidComponent(-1)).toBe(true);
    });

    it('should validate function components', () => {
      expect(renderer.isValidComponent(() => ({}))).toBe(true);
      expect(renderer.isValidComponent(function() { return {}; })).toBe(true);
    });

    it('should validate array components', () => {
      expect(renderer.isValidComponent(['text', 42, { div: 'content' }])).toBe(true);
      expect(renderer.isValidComponent([])).toBe(true);
    });

    it('should validate coherent objects', () => {
      expect(renderer.isValidComponent({ div: 'Hello' })).toBe(true);
      expect(renderer.isValidComponent({ span: { text: 'World' } })).toBe(true);
      expect(renderer.isValidComponent({ invalid: 'structure' })).toBe(true);
      expect(renderer.isValidComponent({ random: 'object' })).toBe(true);
    });

    it('should reject empty objects', () => {
      expect(renderer.isValidComponent({})).toBe(false);
    });
  });

  describe('Depth Validation', () => {
    let renderer;

    beforeEach(() => {
      renderer = new BaseRenderer({ maxDepth: 5 });
    });

    it('should accept valid depths', () => {
      expect(() => renderer.validateDepth(0)).not.toThrow();
      expect(() => renderer.validateDepth(1)).not.toThrow();
      expect(() => renderer.validateDepth(5)).not.toThrow();
    });

    it('should reject depths exceeding maxDepth', () => {
      expect(() => renderer.validateDepth(6)).toThrow('Maximum render depth (5) exceeded');
      expect(() => renderer.validateDepth(10)).toThrow('Maximum render depth (5) exceeded');
    });
  });

  describe('Component Type Processing', () => {
    let renderer;

    beforeEach(() => {
      renderer = new BaseRenderer();
    });

    it('should process null and undefined components', () => {
      expect(renderer.processComponentType(null)).toEqual({ type: 'empty', value: '' });
      expect(renderer.processComponentType(undefined)).toEqual({ type: 'empty', value: '' });
    });

    it('should process string components', () => {
      expect(renderer.processComponentType('Hello')).toEqual({ type: 'text', value: 'Hello' });
      expect(renderer.processComponentType('')).toEqual({ type: 'text', value: '' });
    });

    it('should process number components', () => {
      expect(renderer.processComponentType(42)).toEqual({ type: 'text', value: '42' });
      expect(renderer.processComponentType(0)).toEqual({ type: 'text', value: '0' });
      expect(renderer.processComponentType(-1)).toEqual({ type: 'text', value: '-1' });
    });

    it('should process boolean components', () => {
      expect(renderer.processComponentType(true)).toEqual({ type: 'text', value: 'true' });
      expect(renderer.processComponentType(false)).toEqual({ type: 'text', value: 'false' });
    });

    it('should process function components', () => {
      const simpleFunction = () => ({ div: 'Hello' });
      const result = renderer.processComponentType(simpleFunction);
      expect(result.type).toBe('function');
      expect(result.value).toBe(simpleFunction);
    });
  });

  describe('Performance Tracking', () => {
    let renderer;

    beforeEach(() => {
      renderer = new BaseRenderer({ enablePerformanceTracking: true });
    });

    it('should initialize metrics correctly', () => {
      expect(renderer.metrics.startTime).toBe(null);
      expect(renderer.metrics.endTime).toBe(null);
      expect(renderer.metrics.elementsProcessed).toBe(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle empty configuration object', () => {
      const renderer = new BaseRenderer({});
      expect(renderer.config).toEqual(DEFAULT_RENDERER_CONFIG);
    });

    it('should handle null configuration', () => {
      const renderer = new BaseRenderer(null);
      expect(renderer.config).toEqual(DEFAULT_RENDERER_CONFIG);
    });

    it('should handle development warnings configuration', () => {
      // The enableDevWarnings is set at module load time based on NODE_ENV
      // So we test that the config property exists and is boolean
      const renderer = new BaseRenderer();
      expect(typeof renderer.config.enableDevWarnings).toBe('boolean');
    });
  });
});
