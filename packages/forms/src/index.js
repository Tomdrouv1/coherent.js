/**
 * Coherent.js Forms
 *
 * SSR + Hydration form system
 *
 * @module forms
 */

// SERVER-SIDE: Build forms with validation metadata
export { FormBuilder, createFormBuilder, buildForm, DEFAULT_CLASS_NAMES } from './form-builder.js';

// CLIENT-SIDE: Hydrate server-rendered forms
export { hydrateForm } from './form-hydration.js';

// SHARED: Validators (used by both server and client). One registry and one
// calling convention, identical to `@coherent.js/forms/validators`.
export { validators, FormValidator, createValidator, validate } from './validation.js';
export { validateField, validateForm, registerValidator, composeValidators } from './validators.js';

// 1.0: removed deprecated SPA exports (createForm, formValidators, enhancedForm,
// advanced-validation). See docs/migration/1.0#removed-forms-spa-apis.
