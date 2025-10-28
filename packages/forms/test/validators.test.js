/**
 * Tests for Forms - Validators
 * 
 * Coverage areas:
 * - Built-in validators
 * - Custom validators
 * - Async validation
 * - Error messages
 */

import { describe, it, expect, vi } from 'vitest';
import { validators, createValidator, registerValidator } from '../src/validators.js';

describe('Validators', () => {
  describe('Built-in Validators', () => {
    it('should validate required fields', () => {
      expect(validators.required('')).toBeTruthy();
      expect(validators.required('value')).toBeFalsy();
      expect(validators.required(null)).toBeTruthy();
      expect(validators.required(undefined)).toBeTruthy();
    });

    it('should validate email format', () => {
      expect(validators.email('test@example.com')).toBeFalsy();
      expect(validators.email('invalid-email')).toBeTruthy();
      expect(validators.email('user@domain')).toBeTruthy();
      expect(validators.email('')).toBeFalsy(); // Empty is valid (use required separately)
    });

    it('should validate URL format', () => {
      expect(validators.url('https://example.com')).toBeFalsy();
      expect(validators.url('http://test.org')).toBeFalsy();
      expect(validators.url('invalid-url')).toBeTruthy();
      expect(validators.url('ftp://files.com')).toBeFalsy();
    });

    it('should validate min/max length', () => {
      expect(validators.minLength('abc', { min: 5 })).toBeTruthy();
      expect(validators.minLength('abcdef', { min: 5 })).toBeFalsy();
      
      expect(validators.maxLength('abcdefghij', { max: 5 })).toBeTruthy();
      expect(validators.maxLength('abc', { max: 5 })).toBeFalsy();
    });

    it('should validate numeric ranges', () => {
      expect(validators.min(5, { min: 10 })).toBeTruthy();
      expect(validators.min(15, { min: 10 })).toBeFalsy();
      
      expect(validators.max(15, { max: 10 })).toBeTruthy();
      expect(validators.max(5, { max: 10 })).toBeFalsy();
    });

    it('should validate patterns (regex)', () => {
      const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
      
      expect(validators.pattern('123-456-7890', { pattern: phonePattern })).toBeFalsy();
      expect(validators.pattern('invalid', { pattern: phonePattern })).toBeTruthy();
    });

    it('should validate number type', () => {
      expect(validators.number('123')).toBeFalsy();
      expect(validators.number('abc')).toBeTruthy();
      expect(validators.number('12.34')).toBeFalsy();
    });

    it('should validate integer type', () => {
      expect(validators.integer('123')).toBeFalsy();
      expect(validators.integer('12.34')).toBeTruthy();
      expect(validators.integer('abc')).toBeTruthy();
    });

    it('should validate alpha characters', () => {
      expect(validators.alpha('abcXYZ')).toBeFalsy();
      expect(validators.alpha('abc123')).toBeTruthy();
      expect(validators.alpha('hello world')).toBeTruthy();
    });

    it('should validate alphanumeric', () => {
      expect(validators.alphanumeric('abc123')).toBeFalsy();
      expect(validators.alphanumeric('abc-123')).toBeTruthy();
      expect(validators.alphanumeric('test@123')).toBeTruthy();
    });
  });

  describe('Custom Validators', () => {
    it('should register custom validators', () => {
      const customValidator = (value) => {
        return value !== 'forbidden' ? null : 'Value is forbidden';
      };

      registerValidator('notForbidden', customValidator);

      const validator = validators.get('notForbidden');
      expect(validator('allowed')).toBeNull();
      expect(validator('forbidden')).toBe('Value is forbidden');
    });

    it('should apply custom validators', () => {
      registerValidator('uppercase', (value) => {
        return value === value.toUpperCase() ? null : 'Must be uppercase';
      });

      expect(validators.uppercase('HELLO')).toBeNull();
      expect(validators.uppercase('hello')).toBe('Must be uppercase');
    });

    it('should compose validators', () => {
      const composed = validators.compose([
        validators.required,
        validators.email,
        (value) => value.includes('@company.com') ? null : 'Must be company email'
      ]);

      expect(composed('')).toBeTruthy(); // Fails required
      expect(composed('invalid')).toBeTruthy(); // Fails email
      expect(composed('user@other.com')).toBeTruthy(); // Fails company check
      expect(composed('user@company.com')).toBeFalsy(); // Passes all
    });

    it('should create validator with options', () => {
      const lengthValidator = createValidator((value, options) => {
        if (value.length < options.min || value.length > options.max) {
          return `Length must be between ${options.min} and ${options.max}`;
        }
        return null;
      });

      expect(lengthValidator('abc', { min: 5, max: 10 })).toBeTruthy();
      expect(lengthValidator('abcdef', { min: 5, max: 10 })).toBeFalsy();
    });
  });

  describe('Async Validators', () => {
    it('should handle async validation', async () => {
      const asyncValidator = async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value === 'taken' ? 'Username is taken' : null;
      };

      expect(await asyncValidator('available')).toBeNull();
      expect(await asyncValidator('taken')).toBe('Username is taken');
    });

    it('should debounce async validators', async () => {
      const checkUsername = vi.fn().mockResolvedValue(null);
      const debouncedValidator = validators.debounce(checkUsername, 50);

      debouncedValidator('user1');
      debouncedValidator('user2');
      debouncedValidator('user3');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(checkUsername).toHaveBeenCalledTimes(1);
      expect(checkUsername).toHaveBeenCalledWith('user3');
    });

    it('should cancel pending validations', async () => {
      let cancelled = false;
      const validator = validators.cancellable(async (value, signal) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 100);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            cancelled = true;
            reject(new Error('Cancelled'));
          });
        });
        return null;
      });

      const promise = validator('test');
      validator.cancel();

      try {
        await promise;
      } catch {
        expect(cancelled).toBe(true);
      }
    });

    it('should validate with remote API', async () => {
      const checkEmail = async (email) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 10));
        return email === 'exists@example.com' ? 'Email already registered' : null;
      };

      expect(await checkEmail('new@example.com')).toBeNull();
      expect(await checkEmail('exists@example.com')).toBe('Email already registered');
    });
  });

  describe('Error Messages', () => {
    it('should generate error messages', () => {
      const error = validators.required('');
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    });

    it('should support i18n error messages', () => {
      const validator = createValidator((value, options, t) => {
        if (!value) {
          return t('validation.required');
        }
        return null;
      });

      const t = (key) => key === 'validation.required' ? 'Ce champ est requis' : key;
      const error = validator('', {}, t);

      expect(error).toBe('Ce champ est requis');
    });

    it('should customize error messages', () => {
      const validator = validators.required;
      validator.message = 'This field cannot be empty';

      const error = validator('');
      expect(error).toBe('This field cannot be empty');
    });

    it('should interpolate values in messages', () => {
      const error = validators.minLength('abc', { min: 5 });
      expect(error).toContain('5');
    });
  });

  describe('Validator Chains', () => {
    it('should chain validators', () => {
      const chain = validators.chain()
        .required()
        .email()
        .custom((value) => value.endsWith('@company.com') ? null : 'Must be company email');

      expect(chain.validate('')).toBeTruthy();
      expect(chain.validate('invalid')).toBeTruthy();
      expect(chain.validate('user@other.com')).toBeTruthy();
      expect(chain.validate('user@company.com')).toBeFalsy();
    });

    it('should stop on first error', () => {
      const validator2 = vi.fn();
      const validator3 = vi.fn();

      const chain = validators.chain({ stopOnFirstError: true })
        .custom(() => 'First error')
        .custom(validator2)
        .custom(validator3);

      chain.validate('test');

      expect(validator2).not.toHaveBeenCalled();
      expect(validator3).not.toHaveBeenCalled();
    });

    it('should collect all errors', () => {
      const chain = validators.chain({ stopOnFirstError: false })
        .custom(() => 'Error 1')
        .custom(() => 'Error 2')
        .custom(() => 'Error 3');

      const errors = chain.validate('test');

      expect(errors).toHaveLength(3);
    });
  });

  describe('Conditional Validation', () => {
    it('should validate conditionally', () => {
      const validator = validators.when(
        (value, context) => context.type === 'business',
        validators.required
      );

      expect(validator('', { type: 'personal' })).toBeFalsy();
      expect(validator('', { type: 'business' })).toBeTruthy();
    });

    it('should skip validation when condition fails', () => {
      const expensiveValidator = vi.fn();
      
      const validator = validators.when(
        () => false,
        expensiveValidator
      );

      validator('test');

      expect(expensiveValidator).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Field Validation', () => {
    it('should validate against other fields', () => {
      const matchPassword = (value, options, t, allValues) => {
        if (value !== allValues.password) {
          return 'Passwords do not match';
        }
        return null;
      };

      expect(matchPassword('pass123', {}, null, { password: 'pass123' })).toBeNull();
      expect(matchPassword('pass456', {}, null, { password: 'pass123' })).toBeTruthy();
    });

    it('should validate date ranges', () => {
      const validateEndDate = (endDate, options, t, allValues) => {
        const start = new Date(allValues.startDate);
        const end = new Date(endDate);
        
        if (end <= start) {
          return 'End date must be after start date';
        }
        return null;
      };

      const values = { startDate: '2024-01-01' };
      
      expect(validateEndDate('2024-01-02', {}, null, values)).toBeNull();
      expect(validateEndDate('2023-12-31', {}, null, values)).toBeTruthy();
    });
  });

  describe('File Validation', () => {
    it('should validate file size', () => {
      const file = { size: 6 * 1024 * 1024 }; // 6MB
      
      expect(validators.fileSize(file, { maxSize: 5 * 1024 * 1024 })).toBeTruthy();
      expect(validators.fileSize(file, { maxSize: 10 * 1024 * 1024 })).toBeFalsy();
    });

    it('should validate file type', () => {
      const imageFile = { type: 'image/jpeg' };
      const pdfFile = { type: 'application/pdf' };

      expect(validators.fileType(imageFile, { accept: ['image/*'] })).toBeFalsy();
      expect(validators.fileType(pdfFile, { accept: ['image/*'] })).toBeTruthy();
    });

    it('should validate file extension', () => {
      const file = { name: 'document.pdf' };

      expect(validators.fileExtension(file, { extensions: ['.pdf', '.doc'] })).toBeFalsy();
      expect(validators.fileExtension(file, { extensions: ['.jpg', '.png'] })).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      expect(() => validators.email(null)).not.toThrow();
    });

    it('should handle undefined values', () => {
      expect(() => validators.email(undefined)).not.toThrow();
    });

    it('should handle empty strings', () => {
      expect(validators.email('')).toBeFalsy(); // Empty is valid
      expect(validators.required('')).toBeTruthy(); // Empty is invalid for required
    });

    it('should handle special characters', () => {
      expect(validators.email('user+tag@example.com')).toBeFalsy();
      expect(validators.email('user@sub.domain.com')).toBeFalsy();
    });
  });
});
