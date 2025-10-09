import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createValidatedState, validators } from '../src/state/state-validation.js';

describe('State Validation', () => {
  describe('createValidatedState', () => {
    it('should create validated state manager', () => {
      const state = createValidatedState({ count: 0 });

      expect(state).toBeDefined();
      expect(typeof state.getState).toBe('function');
      expect(typeof state.setState).toBe('function');
    });

    it('should get and set state', () => {
      const state = createValidatedState({ count: 0 });

      expect(state.getState('count')).toBe(0);

      state.setState({ count: 1 });
      expect(state.getState('count')).toBe(1);
    });

    it('should validate with JSON Schema', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number', minimum: 0 }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema });

      // Valid update
      state.setState({ count: 5 });
      expect(state.getState('count')).toBe(5);

      // Invalid update (negative number)
      state.setState({ count: -1 });
      const errors = state.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(state.getState('count')).toBe(5); // State unchanged
    });

    it('should throw in strict mode', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema, strict: true });

      expect(() => {
        state.setState({ count: 'invalid' });
      }).toThrow('Validation failed');
    });

    it('should coerce types', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' },
          name: { type: 'string' }
        }
      };

      const state = createValidatedState({ count: 0, name: '' }, {
        schema,
        coerce: true
      });

      state.setState({ count: '42', name: 123 });
      expect(state.getState('count')).toBe(42);
      expect(state.getState('name')).toBe('123');
    });

    it('should call onError callback', () => {
      const onError = vi.fn();
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema, onError });

      state.setState({ count: 'invalid' });
      expect(onError).toHaveBeenCalled();
    });

    it('should use custom validators', () => {
      const positiveNumber = (value) => {
        return value > 0 ? true : 'Must be positive';
      };

      const state = createValidatedState({ count: 0 }, {
        validators: {
          count: positiveNumber
        }
      });

      state.setState({ count: 5 });
      expect(state.getState('count')).toBe(5);

      state.setState({ count: -1 });
      const errors = state.getErrors();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate required fields', () => {
      const state = createValidatedState({ name: 'John' }, {
        required: ['name', 'email']
      });

      // Missing email should fail validation
      expect(state.isValid()).toBe(false);
      const errors = state.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.type === 'required' && e.path === 'email')).toBe(true);
    });

    it('should check if state is valid', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number', minimum: 0 }
        }
      };

      const state = createValidatedState({ count: 5 }, { schema });
      expect(state.isValid()).toBe(true);
    });

    it('should validate specific field', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        }
      };

      const state = createValidatedState({ email: '' }, { schema });

      const result1 = state.validateField('email', 'test@example.com');
      expect(result1.valid).toBe(true);

      const result2 = state.validateField('email', 'invalid');
      expect(result2.valid).toBe(false);
    });

    it('should subscribe to state changes', () => {
      const state = createValidatedState({ count: 0 });
      const listener = vi.fn();

      state.subscribe(listener);
      state.setState({ count: 1 });

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].count).toBe(1);
    });

    it('should unsubscribe listeners', () => {
      const state = createValidatedState({ count: 0 });
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);
      state.setState({ count: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      state.setState({ count: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('JSON Schema validation', () => {
    it('should validate string types', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 10 }
        }
      };

      const state = createValidatedState({ name: '' }, { schema });

      state.setState({ name: 'Jo' });
      expect(state.getState('name')).toBe('Jo');

      state.setState({ name: 'A' }); // Too short
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate number ranges', () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number', minimum: 0, maximum: 120 }
        }
      };

      const state = createValidatedState({ age: 25 }, { schema });

      state.setState({ age: 30 });
      expect(state.getState('age')).toBe(30);

      state.setState({ age: 150 }); // Too high
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate enums', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
        }
      };

      const state = createValidatedState({ status: 'active' }, { schema });

      state.setState({ status: 'inactive' });
      expect(state.getState('status')).toBe('inactive');

      state.setState({ status: 'invalid' });
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            minItems: 1,
            maxItems: 5,
            items: { type: 'string' }
          }
        }
      };

      const state = createValidatedState({ tags: [] }, { schema });

      state.setState({ tags: ['tag1', 'tag2'] });
      expect(state.getState('tags')).toEqual(['tag1', 'tag2']);

      state.setState({ tags: [] }); // Too few items
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate unique array items', () => {
      const schema = {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            uniqueItems: true,
            items: { type: 'number' }
          }
        }
      };

      const state = createValidatedState({ ids: [] }, { schema });

      state.setState({ ids: [1, 2, 3] });
      expect(state.getState('ids')).toEqual([1, 2, 3]);

      state.setState({ ids: [1, 2, 2] }); // Duplicate
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number', minimum: 0 }
            },
            required: ['name']
          }
        }
      };

      const state = createValidatedState({ user: { name: '', age: 0 } }, { schema });

      state.setState({ user: { name: 'John', age: 30 } });
      expect(state.getState('user').name).toBe('John');

      state.setState({ user: { age: 25 } }); // Missing required name
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate string patterns', () => {
      const schema = {
        type: 'object',
        properties: {
          username: { type: 'string', pattern: '^[a-z0-9_]+$' }
        }
      };

      const state = createValidatedState({ username: '' }, { schema });

      state.setState({ username: 'user_123' });
      expect(state.getState('username')).toBe('user_123');

      state.setState({ username: 'User-123' }); // Invalid pattern
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate string formats', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          url: { type: 'string', format: 'url' }
        }
      };

      const state = createValidatedState({ email: '', url: '' }, { schema });

      state.setState({ email: 'test@example.com', url: 'https://example.com' });
      expect(state.getState('email')).toBe('test@example.com');

      state.setState({ email: 'invalid' });
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate integer type', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'integer' }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema });

      state.setState({ count: 5 });
      expect(state.getState('count')).toBe(5);

      state.setState({ count: 5.5 }); // Not an integer
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate multiple types', () => {
      const schema = {
        type: 'object',
        properties: {
          value: { type: ['string', 'number'] }
        }
      };

      const state = createValidatedState({ value: '' }, { schema });

      state.setState({ value: 'text' });
      expect(state.getState('value')).toBe('text');

      state.setState({ value: 42 });
      expect(state.getState('value')).toBe(42);

      state.setState({ value: true }); // Invalid type
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should validate multipleOf', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number', multipleOf: 5 }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema });

      state.setState({ count: 10 });
      expect(state.getState('count')).toBe(10);

      state.setState({ count: 7 }); // Not multiple of 5
      expect(state.getErrors().length).toBeGreaterThan(0);
    });

    it('should use custom validation function in schema', () => {
      const schema = {
        type: 'object',
        properties: {
          password: {
            type: 'string',
            validate: (value) => {
              if (value.length < 8) return 'Password too short';
              if (!/[A-Z]/.test(value)) return 'Must contain uppercase';
              return true;
            }
          }
        }
      };

      const state = createValidatedState({ password: '' }, { schema });

      state.setState({ password: 'Password123' });
      expect(state.getState('password')).toBe('Password123');

      state.setState({ password: 'weak' });
      expect(state.getErrors().length).toBeGreaterThan(0);
    });
  });

  describe('Common validators', () => {
    it('email validator', () => {
      expect(validators.email('test@example.com')).toBe(true);
      expect(validators.email('invalid')).toContain('Invalid email');
      expect(validators.email(123)).toContain('must be a string');
    });

    it('url validator', () => {
      expect(validators.url('https://example.com')).toBe(true);
      expect(validators.url('invalid')).toContain('Invalid URL');
    });

    it('range validator', () => {
      const ageValidator = validators.range(0, 120);
      expect(ageValidator(25)).toBe(true);
      expect(ageValidator(150)).toContain('between 0 and 120');
      expect(ageValidator('25')).toContain('must be a number');
    });

    it('length validator', () => {
      const nameValidator = validators.length(2, 50);
      expect(nameValidator('John')).toBe(true);
      expect(nameValidator('J')).toContain('between 2 and 50');
    });

    it('pattern validator', () => {
      const usernameValidator = validators.pattern(/^[a-z0-9_]+$/);
      expect(usernameValidator('user_123')).toBe(true);
      expect(usernameValidator('User-123')).toContain('does not match pattern');
    });

    it('required validator', () => {
      expect(validators.required('value')).toBe(true);
      expect(validators.required('')).toContain('required');
      expect(validators.required(null)).toContain('required');
      expect(validators.required(undefined)).toContain('required');
    });
  });

  describe('Type coercion', () => {
    it('should coerce string to number', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema, coerce: true });

      state.setState({ count: '42' });
      expect(state.getState('count')).toBe(42);
    });

    it('should coerce number to string', () => {
      const schema = {
        type: 'object',
        properties: {
          text: { type: 'string' }
        }
      };

      const state = createValidatedState({ text: '' }, { schema, coerce: true });

      state.setState({ text: 123 });
      expect(state.getState('text')).toBe('123');
    });

    it('should coerce to boolean', () => {
      const schema = {
        type: 'object',
        properties: {
          active: { type: 'boolean' }
        }
      };

      const state = createValidatedState({ active: false }, { schema, coerce: true });

      state.setState({ active: 1 });
      expect(state.getState('active')).toBe(true);

      state.setState({ active: 0 });
      expect(state.getState('active')).toBe(false);
    });

    it('should fail coercion for invalid values', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' }
        }
      };

      const state = createValidatedState({ count: 0 }, { schema, coerce: true });

      state.setState({ count: 'not-a-number' });
      expect(state.getErrors().length).toBeGreaterThan(0);
    });
  });

  describe('Additional properties validation', () => {
    it('should allow additional properties by default', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const state = createValidatedState({ name: '' }, { schema });

      state.setState({ name: 'John', extra: 'value' });
      expect(state.getState()).toHaveProperty('extra');
    });

    it('should reject additional properties when disabled', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: false
      };

      const state = createValidatedState({ name: '' }, { schema, allowUnknown: false });

      state.setState({ name: 'John', extra: 'value' });
      const errors = state.getErrors();
      expect(errors.some(e => e.type === 'additionalProperties')).toBe(true);
    });
  });
});
