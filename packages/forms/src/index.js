/**
 * Coherent.js Forms
 *
 * SSR + Hydration form system
 *
 * @module forms
 */

// SERVER-SIDE: Build forms with validation metadata
export { FormBuilder, createFormBuilder, buildForm } from './form-builder.js';

// CLIENT-SIDE: Hydrate server-rendered forms
export { hydrateForm } from './form-hydration.js';

// SHARED: Validators (used by both server and client)
export { validators, FormValidator, createValidator, validate } from './validation.js';
export * from './validators.js';

// 1.0: removed deprecated SPA exports (createForm, formValidators, enhancedForm,
// advanced-validation). See docs/migration/1.0#removed-forms-spa-apis.
