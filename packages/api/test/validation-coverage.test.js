/**
 * Tests for API Validation Utilities
 */

import { describe, it, expect, vi } from 'vitest';
import { ValidationError } from '../src/errors.js';
import { validateAgainstSchema, validateField, withValidation } from '../src/validation.js';

describe('API Validation Utilities', () => {
  describe('validateAgainstSchema', () => {
    it('should validate empty object schema successfully', () => {
      const schema = { type: 'object' };
      const data = {};

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-object data for object schema', () => {
      const schema = { type: 'object' };
      const data = 'string';

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected object');
    });

    it('should reject null for object schema', () => {
      const schema = { type: 'object' };
      const data = null;

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should reject array for object schema', () => {
      const schema = { type: 'object' };
      const data = [];

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should validate required fields', () => {
      const schema = {
        type: 'object',
        required: ['name', 'email']
      };

      // Missing required fields
      let data = {};
      let result = validateAgainstSchema(schema, data);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Partial required fields
      data = { name: 'John' };
      result = validateAgainstSchema(schema, data);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');

      // All required fields present
      data = { name: 'John', email: 'john@example.com' };
      result = validateAgainstSchema(schema, data);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate multiple missing required fields', () => {
      const schema = {
        type: 'object',
        required: ['name', 'email', 'age']
      };

      const data = {};
      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.field)).toEqual(['name', 'email', 'age']);
    });

    it('should validate object properties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' }
        }
      };

      const data = {
        name: 'John',
        age: 30,
        active: true
      };

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate nested object properties', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contact: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' }
                }
              }
            }
          }
        }
      };

      const data = {
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com',
            phone: '123-456-7890'
          }
        }
      };

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect all validation errors', () => {
      const schema = {
        type: 'object',
        required: ['name', 'age'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string' }
        }
      };

      const data = {
        name: 123, // wrong type
        email: 456 // wrong type
      };

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });

    it('should validate string field', () => {
      const schema = { type: 'string' };

      const result = validateField(schema, 'test');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-string field', () => {
      const schema = { type: 'string' };

      const result = validateField(schema, 123);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected string');
    });

    it('should validate number field', () => {
      const schema = { type: 'number' };

      const result = validateField(schema, 123);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-number field', () => {
      const schema = { type: 'number' };

      const result = validateField(schema, '123');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected number');
    });

    it('should validate boolean field', () => {
      const schema = { type: 'boolean' };

      const result = validateField(schema, true);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-boolean field', () => {
      const schema = { type: 'boolean' };

      const result = validateField(schema, 'true');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected boolean');
    });

    it('should validate array field', () => {
      const schema = { type: 'array' };

      const result = validateField(schema, [1, 2, 3]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject non-array field', () => {
      const schema = { type: 'array' };

      const result = validateField(schema, 'not an array');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Expected array');
    });

    it('should validate string minimum length', () => {
      const schema = {
        type: 'string',
        minLength: 5
      };

      const result = validateField(schema, 'hello');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject string below minimum length', () => {
      const schema = {
        type: 'string',
        minLength: 5
      };

      const result = validateField(schema, 'hi');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('at least 5 characters');
    });

    it('should validate string maximum length', () => {
      const schema = {
        type: 'string',
        maxLength: 10
      };

      const result = validateField(schema, 'hello');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject string above maximum length', () => {
      const schema = {
        type: 'string',
        maxLength: 5
      };

      const result = validateField(schema, 'too long string');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('at most 5 characters');
    });

    it('should validate email format', () => {
      const schema = {
        type: 'string',
        format: 'email'
      };

      const result = validateField(schema, 'test@example.com');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid email format', () => {
      const schema = {
        type: 'string',
        format: 'email'
      };

      const result = validateField(schema, 'invalid-email');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid email format');
    });

    it('should validate number minimum value', () => {
      const schema = {
        type: 'number',
        minimum: 10
      };

      const result = validateField(schema, 15);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject number below minimum', () => {
      const schema = {
        type: 'number',
        minimum: 10
      };

      const result = validateField(schema, 5);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('at least 10');
    });

    it('should validate number maximum value', () => {
      const schema = {
        type: 'number',
        maximum: 100
      };

      const result = validateField(schema, 50);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject number above maximum', () => {
      const schema = {
        type: 'number',
        maximum: 100
      };

      const result = validateField(schema, 150);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('at most 100');
    });

    it('should handle schema without type', () => {
      const schema = {};
      const data = 'anything';

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty string for length validation', () => {
      const schema = {
        type: 'string',
        minLength: 1
      };

      const result = validateField(schema, '');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('withValidation', () => {
    it('should create validation middleware', () => {
      const schema = { type: 'object' };

      const middleware = withValidation(schema);

      expect(typeof middleware).toBe('function');
    });

    it('should pass validation for valid data', () => {
      const schema = { type: 'object' };
      const middleware = withValidation(schema);

      const mockReq = { body: {} };
      const mockRes = {};
      const mockNext = vi.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate complex nested schemas', () => {
      const schema = {
        type: 'object',
        required: ['user'],
        properties: {
          user: {
            type: 'object',
            required: ['profile'],
            properties: {
              profile: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' }
                }
              }
            }
          }
        }
      };

      const data = {
        user: {
          profile: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      };

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect multiple validation errors in middleware', () => {
      const schema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' }
        }
      };

      const mockReq = { body: { name: 'Jo', email: 'invalid' } };
      const mockRes = {};
      const mockNext = vi.fn();

      const middleware = withValidation(schema);

      try {
        middleware(mockReq, mockRes, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.details.errors.length).toBeGreaterThan(1);
      }
    });

    it('should handle empty schema', () => {
      const schema = {};
      const data = { anything: 'goes' };

      const result = validateAgainstSchema(schema, data);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty string in email validation', () => {
      const schema = {
        type: 'string',
        format: 'email'
      };

      const result = validateField(schema, '');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle zero in number validation', () => {
      const schema = {
        type: 'number',
        minimum: 0
      };

      const result = validateField(schema, 0);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle negative numbers', () => {
      const schema = {
        type: 'number',
        minimum: -10
      };

      const result = validateField(schema, -5);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
