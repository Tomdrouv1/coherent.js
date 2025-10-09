import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createForm, formValidators } from '../src/forms/forms.js';

describe('Enhanced Form System', () => {
  let form;

  beforeEach(() => {
    form = createForm({
      fields: {
        email: {
          type: 'email',
          required: true,
          validators: [formValidators.email]
        },
        password: {
          type: 'password',
          required: true,
          validators: [formValidators.minLength(8)]
        }
      }
    });
  });

  describe('Basic Functionality', () => {
    it('should create a form instance', () => {
      expect(form).toBeDefined();
      expect(form.registerField).toBeInstanceOf(Function);
      expect(form.validateForm).toBeInstanceOf(Function);
      expect(form.handleSubmit).toBeInstanceOf(Function);
    });

    it('should register fields', () => {
      const field = form.getField('email');
      expect(field).toBeDefined();
      expect(field.name).toBe('email');
      expect(field.type).toBe('email');
      expect(field.required).toBe(true);
    });

    it('should set and get field values', () => {
      form.setFieldValue('email', 'test@example.com', false);
      expect(form.getFieldValue('email')).toBe('test@example.com');
    });

    it('should get all form values', () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'password123', false);

      const values = form.getValues();
      expect(values.email).toBe('test@example.com');
      expect(values.password).toBe('password123');
    });

    it('should set multiple values at once', () => {
      form.setValues({
        email: 'test@example.com',
        password: 'password123'
      }, false);

      expect(form.getFieldValue('email')).toBe('test@example.com');
      expect(form.getFieldValue('password')).toBe('password123');
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields', async () => {
      form.setFieldValue('email', '', false);

      const result = await form.validateField('email');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('required');
    });

    it('should validate email format', async () => {
      form.setFieldValue('email', 'invalid-email', false);

      const result = await form.validateField('email');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass validation for valid values', async () => {
      form.setFieldValue('email', 'test@example.com', false);

      const result = await form.validateField('email');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimum length', async () => {
      form.setFieldValue('password', 'short', false);

      const result = await form.validateField('password');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate entire form', async () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'short', false);

      const result = await form.validateForm();

      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors)).toContain('password');
    });

    it('should return valid for empty form when all fields valid', async () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'validpassword', false);

      const result = await form.validateForm();

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('Async Validation', () => {
    it('should handle async validators', async () => {
      const asyncForm = createForm({
        fields: {
          email: {
            validators: [formValidators.asyncEmail]
          }
        },
        validation: {
          async: true,
          debounce: 50
        }
      });

      asyncForm.setFieldValue('email', 'test@example.com', false);

      const result = await asyncForm.validateField('email');

      expect(result.valid).toBe(true);
    });

    it('should debounce async validation', async () => {
      let callCount = 0;

      const asyncForm = createForm({
        fields: {
          username: {
            validators: [{
              name: 'unique',
              validate: async (value) => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, 10));
                return true;
              },
              debounce: 50
            }]
          }
        },
        validation: {
          async: true
        }
      });

      // Trigger validation multiple times quickly
      asyncForm.setFieldValue('username', 'test1', false);
      asyncForm.validateField('username');

      asyncForm.setFieldValue('username', 'test2', false);
      asyncForm.validateField('username');

      asyncForm.setFieldValue('username', 'test3', false);
      await asyncForm.validateField('username');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only call validator once due to debouncing
      expect(callCount).toBe(1);
    });

    it('should handle async validator errors', async () => {
      const asyncForm = createForm({
        fields: {
          email: {
            validators: [{
              name: 'checkEmail',
              validate: async (value) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return value !== 'taken@example.com';
              },
              message: 'Email is already taken'
            }]
          }
        },
        validation: {
          async: true
        }
      });

      asyncForm.setFieldValue('email', 'taken@example.com', false);

      const result = await asyncForm.validateField('email');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('Email is already taken');
    });
  });

  describe('Field Transformations', () => {
    it('should apply input transformations', () => {
      const transformForm = createForm({
        fields: {
          email: {
            transform: {
              input: (value) => value.toLowerCase().trim()
            }
          }
        }
      });

      transformForm.setFieldValue('email', '  TEST@EXAMPLE.COM  ', false);

      expect(transformForm.getFieldValue('email')).toBe('test@example.com');
    });

    it('should apply output transformations', async () => {
      const transformForm = createForm({
        fields: {
          phone: {
            transform: {
              input: (value) => value.replace(/\D/g, ''),
              output: (value) => `+1${value}`
            }
          }
        }
      });

      transformForm.setFieldValue('phone', '123-456-7890', false);

      const onSubmit = vi.fn();
      await transformForm.handleSubmit(onSubmit);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+11234567890'
        })
      );
    });
  });

  describe('Conditional Validation', () => {
    it('should skip validation when condition is false', async () => {
      const conditionalForm = createForm({
        fields: {
          billingAddress: {
            required: true,
            validateWhen: (formData) => formData.sameAsShipping === false
          },
          sameAsShipping: {}
        }
      });

      conditionalForm.setFieldValue('sameAsShipping', true, false);
      conditionalForm.setFieldValue('billingAddress', '', false);

      const result = await conditionalForm.validateField('billingAddress');

      expect(result.valid).toBe(true);
    });

    it('should validate when condition is true', async () => {
      const conditionalForm = createForm({
        fields: {
          billingAddress: {
            required: true,
            validateWhen: (formData) => formData.sameAsShipping === false
          },
          sameAsShipping: {}
        }
      });

      conditionalForm.setFieldValue('sameAsShipping', false, false);
      conditionalForm.setFieldValue('billingAddress', '', false);

      const result = await conditionalForm.validateField('billingAddress');

      expect(result.valid).toBe(false);
    });
  });

  describe('Form Middleware', () => {
    it('should execute middleware before submit', async () => {
      const middlewareFn = vi.fn((action, data, next) => {
        if (action === 'beforeSubmit') {
          return { ...data, middlewareRan: true };
        }
        return next();
      });

      const middlewareForm = createForm({
        fields: {
          email: { validators: [formValidators.email] }
        },
        middleware: [middlewareFn]
      });

      middlewareForm.setFieldValue('email', 'test@example.com', false);

      const onSubmit = vi.fn();
      await middlewareForm.handleSubmit(onSubmit);

      expect(middlewareFn).toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          middlewareRan: true
        })
      );
    });

    it('should execute multiple middleware in order', async () => {
      const executionOrder = [];

      const middleware1 = async (action, data, next) => {
        if (action === 'beforeSubmit') {
          executionOrder.push(1);
        }
        return next();
      };

      const middleware2 = async (action, data, next) => {
        if (action === 'beforeSubmit') {
          executionOrder.push(2);
        }
        return next();
      };

      const middlewareForm = createForm({
        fields: {},
        middleware: [middleware1, middleware2]
      });

      const onSubmit = vi.fn();
      await middlewareForm.handleSubmit(onSubmit);

      expect(executionOrder).toEqual([1, 2]);
    });

    it('should track middleware executions', async () => {
      const middlewareForm = createForm({
        fields: {},
        middleware: [(action, data, next) => next()]
      });

      await middlewareForm.handleSubmit(vi.fn());

      const stats = middlewareForm.getStats();
      expect(stats.middlewareExecutions).toBeGreaterThan(0);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'validpassword', false);

      const onSubmit = vi.fn().mockResolvedValue({ success: true });

      const result = await form.handleSubmit(onSubmit);

      expect(result.success).toBe(true);
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validpassword'
      });
    });

    it('should not submit with invalid data', async () => {
      form.setFieldValue('email', 'invalid-email', false);
      form.setFieldValue('password', 'short', false);

      const onSubmit = vi.fn();

      const result = await form.handleSubmit(onSubmit);

      expect(result.success).toBe(false);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();

      const successForm = createForm({
        fields: {
          email: { validators: [formValidators.email] }
        },
        submission: {
          onSuccess,
          validateBeforeSubmit: false
        }
      });

      successForm.setFieldValue('email', 'test@example.com', false);

      const onSubmit = vi.fn().mockResolvedValue({ data: 'success' });

      await successForm.handleSubmit(onSubmit);

      expect(onSuccess).toHaveBeenCalledWith({ data: 'success' });
    });

    it('should call onError callback on validation failure', async () => {
      const onError = vi.fn();

      const errorForm = createForm({
        fields: {
          email: { required: true, validators: [formValidators.email] }
        },
        submission: {
          onError,
          validateBeforeSubmit: true
        }
      });

      // Set empty value which should fail required validation
      errorForm.setFieldValue('email', '', false);

      const result = await errorForm.handleSubmit(vi.fn());

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });

    it('should reset form on success if configured', async () => {
      const resetForm = createForm({
        fields: {
          email: {}
        },
        submission: {
          resetOnSuccess: true,
          validateBeforeSubmit: false
        },
        state: {
          initialValues: { email: '' }
        }
      });

      resetForm.setFieldValue('email', 'test@example.com', false);

      await resetForm.handleSubmit(vi.fn().mockResolvedValue({}));

      expect(resetForm.getFieldValue('email')).toBe('');
    });

    it('should track submission count', async () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'validpassword', false);

      await form.handleSubmit(vi.fn().mockResolvedValue({}));
      await form.handleSubmit(vi.fn().mockResolvedValue({}));

      const state = form.getState();
      expect(state.submitCount).toBe(2);
    });
  });

  describe('State Tracking', () => {
    it('should track dirty state', () => {
      const dirtyForm = createForm({
        fields: { email: {} },
        state: {
          trackDirty: true,
          initialValues: { email: '' }
        }
      });

      expect(dirtyForm.isDirty('email')).toBe(false);

      dirtyForm.setFieldValue('email', 'test@example.com', false);

      expect(dirtyForm.isDirty('email')).toBe(true);
      expect(dirtyForm.isDirty()).toBe(true);
    });

    it('should track touched state', () => {
      expect(form.isTouched('email')).toBe(false);

      form.setFieldTouched('email', true);

      expect(form.isTouched('email')).toBe(true);
      expect(form.isTouched()).toBe(true);
    });

    it('should track visited state', () => {
      expect(form._state.visited.email).toBe(false);

      form.setFieldVisited('email', true);

      expect(form._state.visited.email).toBe(true);
    });

    it('should get complete form state', () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldTouched('email', true);

      const state = form.getState();

      expect(state.values).toBeDefined();
      expect(state.errors).toBeDefined();
      expect(state.touched).toBeDefined();
      expect(state.dirty).toBeDefined();
      expect(state.isValid).toBeDefined();
      expect(state.isDirty).toBeDefined();
      expect(state.isTouched).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should get field errors', async () => {
      form.setFieldValue('email', 'invalid', false);
      await form.validateField('email');

      const errors = form.getErrors('email');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should get all errors', async () => {
      form.setFieldValue('email', 'invalid', false);
      form.setFieldValue('password', 'short', false);

      await form.validateForm();

      const errors = form.getErrors();
      expect(Object.keys(errors)).toContain('email');
      expect(Object.keys(errors)).toContain('password');
    });

    it('should format errors as simple array', async () => {
      const simpleForm = createForm({
        fields: {
          email: { required: true, validators: [formValidators.email] }
        },
        errors: {
          format: 'simple'
        }
      });

      simpleForm.setFieldValue('email', '', false);
      await simpleForm.validateForm();

      const errors = simpleForm.getErrors();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
      expect(typeof errors[0]).toBe('string');
    });

    it('should use custom error formatter', async () => {
      const customForm = createForm({
        fields: {
          email: { required: true }
        },
        errors: {
          customFormatter: (errors) => {
            return Object.entries(errors).map(([field, errs]) => ({
              field,
              count: errs.length
            }));
          }
        }
      });

      customForm.setFieldValue('email', '', false);
      await customForm.validateForm();

      const errors = customForm.getErrors();
      expect(errors[0]).toHaveProperty('field');
      expect(errors[0]).toHaveProperty('count');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset form to initial values', () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldTouched('email', true);

      form.reset();

      expect(form.getFieldValue('email')).toBe('');
      expect(form.isTouched('email')).toBe(false);
    });

    it('should reset to custom values', () => {
      form.reset({ email: 'new@example.com', password: 'newpass' });

      expect(form.getFieldValue('email')).toBe('new@example.com');
      expect(form.getFieldValue('password')).toBe('newpass');
    });
  });

  describe('Statistics', () => {
    it('should track validation statistics', async () => {
      await form.validateField('email');
      await form.validateField('password');

      const stats = form.getStats();
      expect(stats.validations).toBe(2);
    });

    it('should track submission statistics', async () => {
      form.setFieldValue('email', 'test@example.com', false);
      form.setFieldValue('password', 'validpassword', false);

      await form.handleSubmit(vi.fn().mockResolvedValue({}));
      await form.handleSubmit(vi.fn().mockRejectedValue(new Error()));

      const stats = form.getStats();
      expect(stats.submissions).toBe(2);
      expect(stats.successfulSubmissions).toBe(1);
      expect(stats.failedSubmissions).toBe(1);
    });
  });
});
