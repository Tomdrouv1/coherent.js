/**
 * Coherent.js Forms
 *
 * SSR + Hydration form system
 *
 * @module forms
 */

// ============================================================================
// SSR + HYDRATION PATTERN (Recommended)
// ============================================================================

// SERVER-SIDE: Build forms with validation metadata
export { FormBuilder, createFormBuilder, buildForm } from './form-builder.js';

// CLIENT-SIDE: Hydrate server-rendered forms
export { hydrateForm } from './form-hydration.js';

// SHARED: Validators (used by both server and client)
export { validators, FormValidator, createValidator, validate } from './validation.js';
export * from './validators.js';

// ============================================================================
// DEPRECATED: SPA-only form builders (use SSR + Hydration instead)
// ============================================================================

// These are kept for backward compatibility but NOT recommended
// They create forms from scratch on the client (SPA pattern)
// For SSR apps, use createFormBuilder() + hydrateForm() instead

// @deprecated Use createFormBuilder() on server + hydrateForm() on client
export { createForm, formValidators, enhancedForm } from './forms.js';

// @deprecated Use validators with hydrateForm() instead
export * from './advanced-validation.js';
