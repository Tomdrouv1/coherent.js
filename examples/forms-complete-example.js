/**
 * @name Forms & Validation
 * @category Full Apps
 * @description User registration form with validation, built from pure objects.
 */

import { render } from '@coherent.js/core';
import { createFormBuilder, validate, validators } from '@coherent.js/forms';

// ============================================================================
// Validation schema
// ============================================================================

const registrationSchema = {
  username: [validators.required(), validators.minLength(3), validators.maxLength(20)],
  email: [validators.required(), validators.email()],
  password: [validators.required(), validators.minLength(8)],
  website: [validators.url()]
};

// ============================================================================
// Form component
// ============================================================================

export function RegistrationForm() {
  const form = createFormBuilder({
    fields: [
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
      { name: 'website', type: 'url', label: 'Website (optional)' }
    ]
  });

  return form.buildForm({ submitText: 'Create account' });
}

export function App() {
  return {
    div: {
      className: 'registration-page',
      children: [
        { h1: { text: 'Create your account' } },
        { p: { text: 'All components are pure JavaScript objects — no JSX.' } },
        RegistrationForm()
      ]
    }
  };
}

// ============================================================================
// Demo — render the form and run the validators
// ============================================================================

console.log('='.repeat(80));
console.log('Forms & Validation example');
console.log('='.repeat(80));

console.log('\n📝 Rendering registration form...');
const htmlOut = render(App());
console.log(`✅ Rendered ${htmlOut.length} characters`);
console.log(htmlOut.includes('name="username"') ? '   Contains username field ✓' : '   Missing username field ✗');

console.log('\n🔍 Validating good data...');
const good = await validate(
  { username: 'ada', email: 'ada@example.com', password: 'correct-horse-battery', website: 'https://example.com' },
  registrationSchema
);
console.log(`✅ isValid: ${good.isValid}`);

console.log('\n🔍 Validating bad data...');
const bad = await validate(
  { username: 'ab', email: 'not-an-email', password: 'short', website: 'nope' },
  registrationSchema
);
console.log(`❌ isValid: ${bad.isValid}`);
for (const [field, message] of Object.entries(bad.errors)) {
  console.log(`   ${field}: ${message}`);
}

console.log(`\n${'='.repeat(80)}`);
console.log('✅ Forms example complete!');
console.log('='.repeat(80));

export { registrationSchema };
