/**
 * Enhanced OOP State Patterns for Coherent.js
 *
 * Specialized state classes that encapsulate complex behaviors
 * while maintaining the hybrid FP/OOP architecture
 */

import { createReactiveState } from './reactive-state.js';

/**
 * Form State - OOP encapsulation for form logic
 */
export class FormState {
  constructor(initialValues = {}, options = {}) {
    this._state = createReactiveState({
      values: { ...initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true
    }, options);

    this._validators = {};
    this._options = options;
  }

  // OOP methods for form management
  setValue(field, value) {
    this._state.set('values', {
      ...this._state.get('values'),
      [field]: value
    });
    this._validateField(field);
    this._state.set('touched', {
      ...this._state.get('touched'),
      [field]: true
    });
  }

  getValue(field) {
    return this._state.get('values')[field];
  }

  setError(field, error) {
    this._state.set('errors', {
      ...this._state.get('errors'),
      [field]: error
    });
    this._updateIsValid();
  }

  addValidator(field, validator) {
    this._validators[field] = validator;
  }

  validateAll() {
    const values = this._state.get('values');
    const errors = {};

    Object.entries(this._validators).forEach(([field, validator]) => {
      const error = validator(values[field], values);
      if (error) {
        errors[field] = error;
      }
    });

    this._state.set('errors', errors);
    this._updateIsValid();
    return Object.keys(errors).length === 0;
  }

  async submit(onSubmit) {
    if (!this.validateAll()) return false;

    this._state.set('isSubmitting', true);

    try {
      await onSubmit(this._state.get('values'));
      return true;
    } catch (error) {
      this.setError('_form', error.message);
      return false;
    } finally {
      this._state.set('isSubmitting', false);
    }
  }

  reset() {
    this._state.set('values', {});
    this._state.set('errors', {});
    this._state.set('touched', {});
    this._state.set('isSubmitting', false);
    this._state.set('isValid', true);
  }

  // Watch methods for FP integration
  watchValues(callback) {
    return this._state.watch('values', callback);
  }

  watchErrors(callback) {
    return this._state.watch('errors', callback);
  }

  watchSubmitting(callback) {
    return this._state.watch('isSubmitting', callback);
  }

  // Private methods
  _validateField(field) {
    const value = this.getValue(field);
    const validator = this._validators[field];

    if (validator) {
      const error = validator(value, this._state.get('values'));
      this.setError(field, error);
    }
  }

  _updateIsValid() {
    const hasErrors = Object.keys(this._state.get('errors')).some(key =>
      this._state.get('errors')[key]
    );
    this._state.set('isValid', !hasErrors);
  }
}

/**
 * List State - OOP for collection management
 */
export class ListState {
  constructor(initialItems = [], options = {}) {
    this._state = createReactiveState({
      items: [...initialItems],
      loading: false,
      error: null,
      filters: {},
      sortBy: null,
      sortOrder: 'asc',
      page: 1,
      pageSize: options.pageSize || 10
    }, options);

    this._options = options;
  }

  // OOP methods for list operations
  addItem(item) {
    this._state.set('items', [...this._state.get('items'), item]);
  }

  removeItem(indexOrPredicate) {
    const items = this._state.get('items');
    let newItems;

    if (typeof indexOrPredicate === 'number') {
      newItems = items.filter((_, i) => i !== indexOrPredicate);
    } else {
      newItems = items.filter(item => !indexOrPredicate(item));
    }

    this._state.set('items', newItems);
  }

  updateItem(indexOrPredicate, updates) {
    const items = this._state.get('items');
    const newItems = items.map((item, i) => {
      if (typeof indexOrPredicate === 'number') {
        return i === indexOrPredicate ? { ...item, ...updates } : item;
      } else {
        return indexOrPredicate(item) ? { ...item, ...updates } : item;
      }
    });

    this._state.set('items', newItems);
  }

  filter(filters) {
    this._state.set('filters', filters);
    this._state.set('page', 1); // Reset to first page
  }

  sort(sortBy, order = 'asc') {
    this._state.set('sortBy', sortBy);
    this._state.set('sortOrder', order);
  }

  setPage(page) {
    this._state.set('page', Math.max(1, page));
  }

  async load(loader) {
    this._state.set('loading', true);
    this._state.set('error', null);

    try {
      const items = await loader(this._state.get('filters'));
      this._state.set('items', items);
      return items;
    } catch (error) {
      this._state.set('error', error.message);
      return [];
    } finally {
      this._state.set('loading', false);
    }
  }

  // Computed properties
  get filteredItems() {
    const items = this._state.get('items');
    const filters = this._state.get('filters');

    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }

  get sortedItems() {
    const items = this.filteredItems;
    const sortBy = this._state.get('sortBy');
    const sortOrder = this._state.get('sortOrder');

    if (!sortBy) return items;

    return [...items].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === bVal) return 0;

      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  get paginatedItems() {
    const items = this.sortedItems;
    const page = this._state.get('page');
    const pageSize = this._state.get('pageSize');

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return items.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this.sortedItems.length / this._state.get('pageSize'));
  }

  // Watch methods
  watchItems(callback) {
    return this._state.watch('items', callback);
  }

  watchLoading(callback) {
    return this._state.watch('loading', callback);
  }
}

/**
 * Modal State - OOP for modal/dialog management
 */
export class ModalState {
  constructor(_initialState = {}) {
    this._state = createReactiveState({
      isOpen: false,
      data: null,
      loading: false,
      error: null
    });

    this._resolvers = new Map();
    this._currentId = 0;
  }

  // OOP methods for modal control
  async open(data) {
    return new Promise((resolve) => {
      const id = ++this._currentId;
      this._resolvers.set(id, resolve);

      this._state.set('data', data);
      this._state.set('isOpen', true);
      this._state.set('error', null);
    });
  }

  close(result = null) {
    const currentId = this._currentId;
    const resolver = this._resolvers.get(currentId);

    if (resolver) {
      resolver(result);
      this._resolvers.delete(currentId);
    }

    this._state.set('isOpen', false);
    this._state.set('data', null);
  }

  setLoading(loading) {
    this._state.set('loading', loading);
  }

  setError(error) {
    this._state.set('error', error);
  }

  // Watch methods
  watchOpen(callback) {
    return this._state.watch('isOpen', callback);
  }

  watchData(callback) {
    return this._state.watch('data', callback);
  }
}

/**
 * Router State - OOP for navigation state
 */
export class RouterState {
  constructor(initialRoute = '/', options = {}) {
    this._state = createReactiveState({
      current: initialRoute,
      params: {},
      query: {},
      history: [initialRoute],
      canGoBack: false,
      canGoForward: false
    }, options);

    this._routes = new Map();
    this._options = options;
  }

  // OOP methods for routing
  addRoute(path, handler) {
    this._routes.set(path, handler);
  }

  navigate(path, params = {}, query = {}) {
    this._state.set('history', [...this._state.get('history'), path]);
    this._state.set('current', path);
    this._state.set('params', params);
    this._state.set('query', query);
    this._updateNavigationState();
  }

  back() {
    const history = this._state.get('history');
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const previousRoute = newHistory[newHistory.length - 1];

      this._state.set('history', newHistory);
      this._state.set('current', previousRoute);
      this._updateNavigationState();
    }
  }

  forward() {
    // Implementation for forward navigation
    // Would need to track forward history separately
  }

  // Watch methods
  watchRoute(callback) {
    return this._state.watch('current', callback);
  }

  watchParams(callback) {
    return this._state.watch('params', callback);
  }

  // Private methods
  _updateNavigationState() {
    const history = this._state.get('history');
    this._state.set('canGoBack', history.length > 1);
    this._state.set('canGoForward', false); // Simplified
  }
}

/**
 * Factory functions for creating enhanced state
 */
export function createFormState(initialValues, options) {
  return new FormState(initialValues, options);
}

export function createListState(initialItems, options) {
  return new ListState(initialItems, options);
}

export function createModalState(initialState) {
  return new ModalState(initialState);
}

export function createRouterState(initialRoute, options) {
  return new RouterState(initialRoute, options);
}

/**
 * Demo showing hybrid FP/OOP usage
 */
export function demoEnhancedPatterns() {
  // OOP state management
  const userForm = createFormState({
    name: '',
    email: '',
    age: ''
  });

  const userList = createListState([]);
  const userModal = createModalState();

  // Add validators (OOP methods)
  userForm.addValidator('name', (value) => {
    if (!value || value.length < 2) {
      return 'Name must be at least 2 characters';
    }
  });

  userForm.addValidator('email', (value) => {
    if (!value.includes('@')) {
      return 'Invalid email address';
    }
  });

  // FP component that uses OOP state
  const UserForm = () => ({
    form: {
      onsubmit: async (e) => {
        e.preventDefault();
        const success = await userForm.submit(async (values) => {
          userList.addItem(values);
          userModal.close();
        });

        if (!success) {
          console.log('Form validation failed');
        }
      },
      children: [
        { input: {
          type: 'text',
          placeholder: 'Name',
          value: userForm.getValue('name'),
          oninput: (e) => userForm.setValue('name', e.target.value)
        }},
        { input: {
          type: 'email',
          placeholder: 'Email',
          value: userForm.getValue('email'),
          oninput: (e) => userForm.setValue('email', e.target.value)
        }},
        { button: {
          type: 'submit',
          text: userForm._state.get('isSubmitting') ? 'Saving...' : 'Save User',
          disabled: !userForm._state.get('isValid') || userForm._state.get('isSubmitting')
        }}
      ]
    }
  });

  return {
    UserForm,
    userForm,
    userList,
    userModal
  };
}

export default {
  FormState,
  ListState,
  ModalState,
  RouterState,
  createFormState,
  createListState,
  createModalState,
  createRouterState,
  demoEnhancedPatterns
};
