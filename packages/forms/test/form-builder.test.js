/**
 * Tests for Forms - FormBuilder
 * 
 * Coverage areas:
 * - Form creation and field management
 * - Field types and configuration
 * - Validation and error handling
 * - Form submission and serialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormBuilder, createForm } from '../src/form-builder.js';

describe('FormBuilder', () => {
  let form;

  beforeEach(() => {
    form = new FormBuilder({
      name: 'testForm',
      method: 'POST',
      action: '/submit'
    });
  });

  describe('Form Creation', () => {
    it('should create form with fields', () => {
      form.addField('username', {
        type: 'text',
        label: 'Username',
        required: true
      });

      const fields = form.getFields();
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('username');
    });

    it('should add fields dynamically', () => {
      form.addField('email', { type: 'email' });
      form.addField('password', { type: 'password' });

      expect(form.getFields()).toHaveLength(2);
    });

    it('should remove fields', () => {
      form.addField('temp', { type: 'text' });
      form.removeField('temp');

      expect(form.getFields()).toHaveLength(0);
    });

    it('should update field config', () => {
      form.addField('username', { type: 'text', required: false });
      form.updateField('username', { required: true });

      const field = form.getField('username');
      expect(field.required).toBe(true);
    });

    it('should get field by name', () => {
      form.addField('email', { type: 'email', label: 'Email Address' });
      
      const field = form.getField('email');
      expect(field).toBeDefined();
      expect(field.label).toBe('Email Address');
    });
  });

  describe('Field Types', () => {
    it('should create text fields', () => {
      form.addField('name', {
        type: 'text',
        placeholder: 'Enter your name'
      });

      const field = form.getField('name');
      expect(field.type).toBe('text');
      expect(field.placeholder).toBe('Enter your name');
    });

    it('should create number fields', () => {
      form.addField('age', {
        type: 'number',
        min: 0,
        max: 120
      });

      const field = form.getField('age');
      expect(field.type).toBe('number');
      expect(field.min).toBe(0);
      expect(field.max).toBe(120);
    });

    it('should create select fields', () => {
      form.addField('country', {
        type: 'select',
        options: [
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' }
        ]
      });

      const field = form.getField('country');
      expect(field.type).toBe('select');
      expect(field.options).toHaveLength(2);
    });

    it('should create checkbox fields', () => {
      form.addField('terms', {
        type: 'checkbox',
        label: 'I agree to terms'
      });

      const field = form.getField('terms');
      expect(field.type).toBe('checkbox');
    });

    it('should create radio fields', () => {
      form.addField('gender', {
        type: 'radio',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' }
        ]
      });

      const field = form.getField('gender');
      expect(field.type).toBe('radio');
      expect(field.options).toHaveLength(2);
    });

    it('should create file upload fields', () => {
      form.addField('avatar', {
        type: 'file',
        accept: 'image/*',
        maxSize: 5242880 // 5MB
      });

      const field = form.getField('avatar');
      expect(field.type).toBe('file');
      expect(field.accept).toBe('image/*');
    });

    it('should create textarea fields', () => {
      form.addField('bio', {
        type: 'textarea',
        rows: 5,
        maxLength: 500
      });

      const field = form.getField('bio');
      expect(field.type).toBe('textarea');
      expect(field.rows).toBe(5);
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      form.addField('username', {
        type: 'text',
        required: true
      });

      form.setValues({ username: '' });
      const errors = form.validate();

      expect(errors.username).toBeDefined();
      expect(errors.username).toContain('required');
    });

    it('should validate field types', () => {
      form.addField('email', {
        type: 'email',
        required: true
      });

      form.setValues({ email: 'invalid-email' });
      const errors = form.validate();

      expect(errors.email).toBeDefined();
    });

    it('should validate custom rules', () => {
      form.addField('password', {
        type: 'password',
        validate: (value) => {
          if (value.length < 8) {
            return 'Password must be at least 8 characters';
          }
          return null;
        }
      });

      form.setValues({ password: 'short' });
      const errors = form.validate();

      expect(errors.password).toBe('Password must be at least 8 characters');
    });

    it('should show validation errors', () => {
      form.addField('email', { type: 'email', required: true });
      form.setValues({ email: 'invalid' });
      
      const errors = form.validate();
      const hasErrors = form.hasErrors();

      expect(hasErrors).toBe(true);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should clear validation errors', () => {
      form.addField('email', { type: 'email', required: true });
      form.setValues({ email: 'invalid' });
      form.validate();

      form.clearErrors();

      expect(form.hasErrors()).toBe(false);
    });

    it('should validate on field change', () => {
      form.addField('email', {
        type: 'email',
        required: true,
        validateOnChange: true
      });

      form.setValue('email', 'invalid');

      expect(form.getFieldError('email')).toBeDefined();
    });
  });

  describe('Form Submission', () => {
    it('should handle form submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue({ success: true });
      
      form.addField('username', { type: 'text', required: true });
      form.setValues({ username: 'testuser' });
      form.onSubmit(onSubmit);

      await form.submit();

      expect(onSubmit).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('should prevent invalid submission', async () => {
      const onSubmit = vi.fn();
      
      form.addField('email', { type: 'email', required: true });
      form.setValues({ email: '' });
      form.onSubmit(onSubmit);

      await form.submit();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should serialize form data', () => {
      form.addField('username', { type: 'text' });
      form.addField('email', { type: 'email' });
      form.setValues({
        username: 'john',
        email: 'john@example.com'
      });

      const data = form.serialize();

      expect(data).toEqual({
        username: 'john',
        email: 'john@example.com'
      });
    });

    it('should reset form after submission', async () => {
      form.addField('message', { type: 'text' });
      form.setValues({ message: 'Hello' });
      form.onSubmit(async () => ({ success: true }));

      await form.submit();
      form.reset();

      expect(form.getValue('message')).toBe('');
    });

    it('should handle submission errors', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
      const onError = vi.fn();

      form.addField('data', { type: 'text' });
      form.setValues({ data: 'test' });
      form.onSubmit(onSubmit);
      form.onError(onError);

      await form.submit();

      expect(onError).toHaveBeenCalled();
    });

    it('should track submission state', async () => {
      form.addField('data', { type: 'text' });
      form.setValues({ data: 'test' });
      form.onSubmit(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      const submitPromise = form.submit();
      expect(form.isSubmitting()).toBe(true);

      await submitPromise;
      expect(form.isSubmitting()).toBe(false);
    });
  });

  describe('Field Values', () => {
    it('should set field value', () => {
      form.addField('name', { type: 'text' });
      form.setValue('name', 'John Doe');

      expect(form.getValue('name')).toBe('John Doe');
    });

    it('should set multiple values', () => {
      form.addField('firstName', { type: 'text' });
      form.addField('lastName', { type: 'text' });

      form.setValues({
        firstName: 'John',
        lastName: 'Doe'
      });

      expect(form.getValue('firstName')).toBe('John');
      expect(form.getValue('lastName')).toBe('Doe');
    });

    it('should get all values', () => {
      form.addField('email', { type: 'email' });
      form.addField('age', { type: 'number' });

      form.setValues({
        email: 'test@example.com',
        age: 25
      });

      const values = form.getValues();

      expect(values).toEqual({
        email: 'test@example.com',
        age: 25
      });
    });

    it('should handle default values', () => {
      form.addField('country', {
        type: 'select',
        defaultValue: 'us'
      });

      expect(form.getValue('country')).toBe('us');
    });

    it('should reset to default values', () => {
      form.addField('name', {
        type: 'text',
        defaultValue: 'Guest'
      });

      form.setValue('name', 'John');
      form.reset();

      expect(form.getValue('name')).toBe('Guest');
    });
  });

  describe('Helper Functions', () => {
    it('should create form with factory function', () => {
      const newForm = createForm({
        name: 'contactForm',
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'message', type: 'textarea', required: true }
        ]
      });

      expect(newForm).toBeInstanceOf(FormBuilder);
      expect(newForm.getFields()).toHaveLength(2);
    });

    it('should check if form is valid', () => {
      form.addField('email', { type: 'email', required: true });
      form.setValues({ email: 'valid@example.com' });

      expect(form.isValid()).toBe(true);
    });

    it('should check if form is dirty', () => {
      form.addField('name', { type: 'text' });
      
      expect(form.isDirty()).toBe(false);
      
      form.setValue('name', 'Changed');
      
      expect(form.isDirty()).toBe(true);
    });

    it('should get form HTML', () => {
      form.addField('username', { type: 'text', label: 'Username' });
      
      const html = form.toHTML();

      expect(html).toContain('<form');
      expect(html).toContain('username');
    });
  });

  describe('Field Groups', () => {
    it('should create field groups', () => {
      form.addGroup('personal', {
        label: 'Personal Information',
        fields: [
          { name: 'firstName', type: 'text' },
          { name: 'lastName', type: 'text' }
        ]
      });

      const group = form.getGroup('personal');
      expect(group).toBeDefined();
      expect(group.fields).toHaveLength(2);
    });

    it('should validate field groups', () => {
      form.addGroup('contact', {
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'phone', type: 'tel', required: true }
        ]
      });

      form.setValues({ email: '', phone: '' });
      const errors = form.validate();

      expect(errors.email).toBeDefined();
      expect(errors.phone).toBeDefined();
    });
  });

  describe('Conditional Fields', () => {
    it('should show/hide fields conditionally', () => {
      form.addField('hasAddress', { type: 'checkbox' });
      form.addField('address', {
        type: 'text',
        showIf: (values) => values.hasAddress === true
      });

      form.setValue('hasAddress', false);
      expect(form.isFieldVisible('address')).toBe(false);

      form.setValue('hasAddress', true);
      expect(form.isFieldVisible('address')).toBe(true);
    });

    it('should not validate hidden fields', () => {
      form.addField('subscribe', { type: 'checkbox' });
      form.addField('email', {
        type: 'email',
        required: true,
        showIf: (values) => values.subscribe === true
      });

      form.setValues({ subscribe: false, email: '' });
      const errors = form.validate();

      expect(errors.email).toBeUndefined();
    });
  });
});
