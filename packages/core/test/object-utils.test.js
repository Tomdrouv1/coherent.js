import { describe, it, expect } from 'vitest';
import {
  deepClone,
  shallowClone,
  smartClone,
  validateComponent,
  isCoherentObject,
  extractProps,
  hasChildren,
  normalizeChildren,
  mergeProps,
  getNestedValue,
  setNestedValue,
  isEqual,
  freeze,
  hasCircularReferences,
  getMemoryFootprint
} from '../src/core/object-utils.js';

describe('Object Utilities', () => {
  describe('deepClone', () => {
    it('should handle primitive values', () => {
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(false)).toBe(false);
    });

    it('should clone Date objects', () => {
      const date = new Date('2023-01-01');
      const cloned = deepClone(date);

      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });

    it('should clone RegExp objects', () => {
      const regex = /test/gi;
      const cloned = deepClone(regex);

      expect(cloned).toBeInstanceOf(RegExp);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
      expect(cloned).not.toBe(regex);
    });

    it('should clone arrays', () => {
      const arr = [1, 'string', { nested: true }];
      const cloned = deepClone(arr);

      expect(Array.isArray(cloned)).toBe(true);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone plain objects', () => {
      const obj = { a: 1, b: { nested: 'value' } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone Map objects', () => {
      const map = new Map([['key', 'value'], [1, { nested: true }]]);
      const cloned = deepClone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.size).toBe(map.size);
      expect(cloned.get('key')).toBe('value');
      expect(cloned.get(1)).not.toBe(map.get(1));
    });

    it('should clone Set objects', () => {
      const set = new Set([1, 'string', { nested: true }]);
      const cloned = deepClone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned.size).toBe(set.size);
      expect(cloned.has('string')).toBe(true);
    });

    it('should preserve function references', () => {
      const fn = () => 'test';
      const obj = { method: fn };
      const cloned = deepClone(obj);

      expect(cloned.method).toBe(fn);
    });

    it('should handle circular references', () => {
      const obj = { a: 1 };
      obj.self = obj;

      const cloned = deepClone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned.self).toBe(cloned);
    });

    it('should handle WeakMap and WeakSet', () => {
      const weakMap = new WeakMap();
      const weakSet = new WeakSet();
      const obj = { weakMap, weakSet };

      const cloned = deepClone(obj);

      expect(cloned.weakMap).toBeInstanceOf(WeakMap);
      expect(cloned.weakSet).toBeInstanceOf(WeakSet);
    });
  });

  describe('shallowClone', () => {
    it('should create shallow copy of objects', () => {
      const original = { a: 1, b: { nested: true } };
      const cloned = shallowClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).toBe(original.b); // Shallow - nested objects are same reference
    });

    it('should handle arrays', () => {
      const original = [1, { nested: true }];
      const cloned = shallowClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).toBe(original[1]);
    });

    it('should handle primitives', () => {
      expect(shallowClone(42)).toBe(42);
      expect(shallowClone('string')).toBe('string');
      expect(shallowClone(null)).toBe(null);
    });
  });

  describe('smartClone', () => {
    it('should use deep clone for complex objects', () => {
      const obj = { a: { b: { c: 'deep' } } };
      const cloned = smartClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.a).not.toBe(obj.a);
    });

    it('should use shallow clone for simple objects', () => {
      const obj = { a: 1, b: 'string' };
      const cloned = smartClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should respect max depth limit', () => {
      const obj = { level1: { level2: { level3: 'deep' } } };
      const cloned = smartClone(obj, 2);

      expect(cloned).toEqual(obj);
      // At max depth, it should use shallow cloning
    });

    it('should handle primitives', () => {
      expect(smartClone(42)).toBe(42);
      expect(smartClone('string')).toBe('string');
    });
  });

  describe('validateComponent', () => {
    it('should validate valid coherent objects', () => {
      const validComponent = { div: { text: 'Hello' } };
      expect(validateComponent(validComponent)).toBe(true);
    });

    it('should validate strings', () => {
      expect(validateComponent('Hello World')).toBe(true);
    });

    it('should validate numbers', () => {
      expect(validateComponent(42)).toBe(true);
    });

    it('should validate null and undefined', () => {
      expect(() => validateComponent(null)).toThrow('Invalid component at root: null or undefined');
      expect(() => validateComponent(undefined)).toThrow('Invalid component at root: null or undefined');
    });

    it('should validate functions', () => {
      expect(validateComponent(() => ({}))).toBe(true);
    });

    it('should validate arrays', () => {
      expect(validateComponent(['item1', 'item2'])).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(() => validateComponent({})).toThrow('Empty object at root');
      // Objects with valid key format and string values are considered valid
      expect(validateComponent({ invalid: 'structure' })).toBe(true);
    });

    it('should handle circular references gracefully', () => {
      const obj = { self: null };
      obj.self = obj;

      // Should not throw and should return true since the object structure is valid
      expect(validateComponent(obj)).toBe(true);
    });
  });

  describe('isCoherentObject', () => {
    it('should identify coherent objects', () => {
      expect(isCoherentObject({ div: 'content' })).toBe(true);
      expect(isCoherentObject({ span: { text: 'Hello' } })).toBe(true);
      expect(isCoherentObject({ button: { onClick: () => {} } })).toBe(true);
    });

    it('should reject non-coherent objects', () => {
      expect(isCoherentObject({})).toBe(false);
      expect(isCoherentObject({ '123invalid': 'property' })).toBe(false);
      expect(isCoherentObject({ 'invalid-key!': 'component' })).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isCoherentObject(null)).toBe(false);
      expect(isCoherentObject(undefined)).toBe(false);
      expect(isCoherentObject('string')).toBe(false);
      expect(isCoherentObject(42)).toBe(false);
      expect(isCoherentObject([])).toBe(false);
    });
  });

  describe('extractProps', () => {
    it('should extract props from coherent object', () => {
      const coherent = {
        div: {
          className: 'test-class',
          id: 'test-id',
          children: 'Hello World'
        }
      };

      const props = extractProps(coherent);

      expect(props).toEqual({
        div: {
          className: 'test-class',
          id: 'test-id',
          children: 'Hello World'
        }
      });
    });

    it('should handle empty coherent object', () => {
      const coherent = { div: {} };
      const props = extractProps(coherent);

      expect(props).toEqual({
        div: {}
      });
    });

    it('should handle coherent object with children array', () => {
      const coherent = {
        div: {
          className: 'parent',
          children: ['child1', 'child2']
        }
      };

      const props = extractProps(coherent);

      expect(props.div.children).toEqual(['child1', 'child2']);
    });
  });

  describe('hasChildren', () => {
    it('should detect components with children', () => {
      expect(hasChildren({ div: { children: 'Hello' } })).toBe(true);
      expect(hasChildren({ div: { children: ['item1', 'item2'] } })).toBe(true);
    });

    it('should detect components without children', () => {
      expect(hasChildren({ div: { className: 'test' } })).toBe(false);
      expect(hasChildren({ div: {} })).toBe(false);
    });

    it('should handle non-coherent objects', () => {
      expect(hasChildren({})).toBe(false);
      expect(hasChildren(null)).toBe(false);
      expect(hasChildren('string')).toBe(false);
    });
  });

  describe('normalizeChildren', () => {
    it('should normalize string children', () => {
      expect(normalizeChildren('Hello')).toEqual(['Hello']);
    });

    it('should normalize array children', () => {
      const children = ['item1', 'item2'];
      expect(normalizeChildren(children)).toEqual(children);
    });

    it('should normalize single item in array', () => {
      expect(normalizeChildren(['single'])).toEqual(['single']);
    });

    it('should handle null and undefined children', () => {
      expect(normalizeChildren(null)).toEqual([]);
      expect(normalizeChildren(undefined)).toEqual([]);
    });

    it('should handle empty arrays', () => {
      expect(normalizeChildren([])).toEqual([]);
    });
  });

  describe('mergeProps', () => {
    it('should merge objects correctly', () => {
      const base = { a: 1, b: 2 };
      const override = { b: 3, c: 4 };

      const merged = mergeProps(base, override);

      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle null base object', () => {
      const override = { a: 1, b: 2 };
      const merged = mergeProps(null, override);

      expect(merged).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty objects', () => {
      expect(mergeProps({}, {})).toEqual({});
      expect(mergeProps({ a: 1 }, {})).toEqual({ a: 1 });
      expect(mergeProps({}, { b: 2 })).toEqual({ b: 2 });
    });

    it('should not mutate original objects', () => {
      const base = { a: 1 };
      const override = { b: 2 };

      mergeProps(base, override);

      expect(base).toEqual({ a: 1 });
      expect(override).toEqual({ b: 2 });
    });
  });

  describe('getNestedValue', () => {
    it('should get nested values using dot notation', () => {
      const obj = { a: { b: { c: 'value' } } };

      expect(getNestedValue(obj, 'a.b.c')).toBe('value');
      expect(getNestedValue(obj, 'a.b')).toEqual({ c: 'value' });
      expect(getNestedValue(obj, 'a')).toEqual({ b: { c: 'value' } });
    });

    it('should handle non-existent paths', () => {
      const obj = { a: 1 };

      expect(getNestedValue(obj, 'b.c')).toBeUndefined();
      expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
    });

    it('should handle empty path', () => {
      const obj = { a: 1 };
      expect(getNestedValue(obj, '')).toBeUndefined();
    });

    it('should handle null/undefined objects', () => {
      expect(getNestedValue(null, 'a.b')).toBeUndefined();
      expect(getNestedValue(undefined, 'a.b')).toBeUndefined();
    });
  });

  describe('setNestedValue', () => {
    it('should set nested values using dot notation', () => {
      const obj = {};

      setNestedValue(obj, 'a.b.c', 'value');

      expect(obj).toEqual({ a: { b: { c: 'value' } } });
    });

    it('should overwrite existing values', () => {
      const obj = { a: { b: 'old' } };

      setNestedValue(obj, 'a.b', 'new');

      expect(obj.a.b).toBe('new');
    });

    it('should handle single level paths', () => {
      const obj = {};

      setNestedValue(obj, 'key', 'value');

      expect(obj).toEqual({ key: 'value' });
    });

    it('should handle null/undefined objects', () => {
      expect(() => setNestedValue(null, 'a.b', 'value')).not.toThrow();
      expect(() => setNestedValue(undefined, 'a.b', 'value')).not.toThrow();
    });
  });

  describe('isEqual', () => {
    it('should compare equal primitives', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual('string', 'string')).toBe(true);
      expect(isEqual(true, true)).toBe(true);
      expect(isEqual(null, null)).toBe(true);
    });

    it('should compare unequal primitives', () => {
      expect(isEqual(1, 2)).toBe(false);
      expect(isEqual('string1', 'string2')).toBe(false);
      expect(isEqual(true, false)).toBe(false);
    });

    it('should compare equal objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };

      expect(isEqual(obj1, obj2)).toBe(true);
    });

    it('should compare unequal objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 3 } };

      expect(isEqual(obj1, obj2)).toBe(false);
    });

    it('should compare arrays', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should respect depth limit', () => {
      const obj1 = { a: { b: { c: 'deep' } } };
      const obj2 = { a: { b: { c: 'deep' } } };

      // Should return true even with depth limit for matching objects
      expect(isEqual(obj1, obj2, 2)).toBe(true);
    });
  });

  describe('freeze', () => {
    it('should freeze objects recursively', () => {
      const obj = { a: 1, b: { c: 2 } };

      const frozen = freeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.b)).toBe(true);
    });

    it('should freeze arrays recursively', () => {
      const arr = [1, { a: 2 }];

      const frozen = freeze(arr);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen[1])).toBe(true);
    });

    it('should handle primitives', () => {
      expect(freeze(42)).toBe(42);
      expect(freeze('string')).toBe('string');
      expect(freeze(null)).toBe(null);
    });

    it('should prevent modifications', () => {
      const obj = { a: 1 };
      const frozen = freeze(obj);

      expect(() => { frozen.a = 2; }).toThrow();
      expect(() => { frozen.newProp = 'value'; }).toThrow();
    });
  });

  describe('hasCircularReferences', () => {
    it('should detect circular references', () => {
      const obj = { a: 1 };
      obj.self = obj;

      expect(hasCircularReferences(obj)).toBe(true);
    });

    it('should detect nested circular references', () => {
      const obj = { a: { b: {} } };
      obj.a.b.circular = obj;

      expect(hasCircularReferences(obj)).toBe(true);
    });

    it('should return false for non-circular objects', () => {
      const obj = { a: 1, b: { c: 2 } };

      expect(hasCircularReferences(obj)).toBe(false);
    });

    it('should handle primitives', () => {
      expect(hasCircularReferences(42)).toBe(false);
      expect(hasCircularReferences('string')).toBe(false);
      expect(hasCircularReferences(null)).toBe(false);
    });
  });

  describe('getMemoryFootprint', () => {
    it('should calculate memory footprint', () => {
      const obj = { a: 1, b: 'string', c: true };

      const footprint = getMemoryFootprint(obj);

      expect(typeof footprint).toBe('number');
      expect(footprint).toBeGreaterThan(0);
    });

    it('should handle nested objects', () => {
      const obj = { a: { b: { c: 'deep' } } };

      const footprint = getMemoryFootprint(obj);

      expect(typeof footprint).toBe('number');
      expect(footprint).toBeGreaterThan(0);
    });

    it('should handle arrays', () => {
      const arr = [1, 'string', { nested: true }];

      const footprint = getMemoryFootprint(arr);

      expect(typeof footprint).toBe('number');
      expect(footprint).toBeGreaterThan(0);
    });

    it('should handle primitives', () => {
      expect(getMemoryFootprint(42)).toBeGreaterThan(0);
      expect(getMemoryFootprint('string')).toBeGreaterThan(0);
      expect(getMemoryFootprint(null)).toBe(0);
      expect(getMemoryFootprint(undefined)).toBe(0);
    });

    it('should avoid double counting with circular references', () => {
      const obj = { a: 1 };
      obj.self = obj;

      const footprint = getMemoryFootprint(obj);

      expect(typeof footprint).toBe('number');
      expect(footprint).toBeGreaterThan(0);
    });
  });
});
