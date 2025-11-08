/**
 * Complete Forms Example - User Registration & Profile Management
 * 
 * This example demonstrates:
 * - Form validation
 * - Custom validators
 * - Async validation
 * - Multi-step forms
 * - Form builder
 * - Error handling
 * - Success/failure states
 */

import { html, render } from '@coherent.js/core';
import { 
  createFormValidator, 
  validators, 
  FormBuilder
} from '@coherent.js/forms';

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Check if username is available (simulated async check)
 */
async function usernameAvailable(value) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const takenUsernames = ['admin', 'root', 'user', 'test'];
  if (takenUsernames.includes(value.toLowerCase())) {
    return 'This username is already taken';
  }
  return null;
}

/**
 * Password strength validator
 */
function passwordStrength(value) {
  if (!value) return null;
  
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
    .filter(Boolean).length;
  
  if (strength < 3) {
    return 'Password must contain uppercase, lowercase, numbers, and special characters';
  }
  
  return null;
}

/**
 * Confirm password matches
 */
function confirmPassword(confirmValue, formData) {
  if (confirmValue !== formData.password) {
    return 'Passwords do not match';
  }
  return null;
}

/**
 * Age validator
 */
function ageValidator(value) {
  const age = parseInt(value, 10);
  if (age < 18) {
    return 'You must be at least 18 years old';
  }
  if (age > 120) {
    return 'Please enter a valid age';
  }
  return null;
}

/**
 * Phone number validator
 */
function phoneValidator(value) {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  if (!phoneRegex.test(value)) {
    return 'Please enter a valid phone number';
  }
  if (value.replace(/\D/g, '').length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  return null;
}

// ============================================================================
// Form Schemas
// ============================================================================

/**
 * Step 1: Basic Information
 */
const basicInfoSchema = {
  username: [
    validators.required('Username is required'),
    validators.minLength(3, 'Username must be at least 3 characters'),
    validators.maxLength(20, 'Username must not exceed 20 characters'),
    validators.pattern(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    usernameAvailable,
  ],
  email: [
    validators.required('Email is required'),
    validators.email('Please enter a valid email address'),
  ],
  password: [
    validators.required('Password is required'),
    validators.minLength(8, 'Password must be at least 8 characters'),
    passwordStrength,
  ],
  confirmPassword: [
    validators.required('Please confirm your password'),
    confirmPassword,
  ],
};

/**
 * Step 2: Personal Information
 */
const personalInfoSchema = {
  firstName: [
    validators.required('First name is required'),
    validators.minLength(2, 'First name must be at least 2 characters'),
  ],
  lastName: [
    validators.required('Last name is required'),
    validators.minLength(2, 'Last name must be at least 2 characters'),
  ],
  age: [
    validators.required('Age is required'),
    validators.number('Age must be a number'),
    ageValidator,
  ],
  phone: [
    validators.required('Phone number is required'),
    phoneValidator,
  ],
};

/**
 * Step 3: Preferences
 */
const preferencesSchema = {
  newsletter: [],
  notifications: [],
  theme: [
    validators.required('Please select a theme'),
  ],
  bio: [
    validators.maxLength(500, 'Bio must not exceed 500 characters'),
  ],
};

// ============================================================================
// Components
// ============================================================================

/**
 * Input Field Component with Validation
 */
function InputField({ 
  label, 
  name, 
  type = 'text', 
  value = '', 
  error = null, 
  required = false,
  placeholder = '',
  disabled = false,
}) {
  return html`
    <div class="form-group ${error ? 'has-error' : ''}">
      <label for="${name}">
        ${label}
        ${required ? html`<span class="required">*</span>` : ''}
      </label>
      <input
        type="${type}"
        id="${name}"
        name="${name}"
        value="${value}"
        placeholder="${placeholder}"
        ${required ? 'required' : ''}
        ${disabled ? 'disabled' : ''}
        class="${error ? 'error' : ''}"
      />
      ${error ? html`<span class="error-message">${error}</span>` : ''}
    </div>
  `;
}

/**
 * Textarea Field Component
 */
function TextareaField({ 
  label, 
  name, 
  value = '', 
  error = null, 
  required = false,
  placeholder = '',
  rows = 4,
}) {
  return html`
    <div class="form-group ${error ? 'has-error' : ''}">
      <label for="${name}">
        ${label}
        ${required ? html`<span class="required">*</span>` : ''}
      </label>
      <textarea
        id="${name}"
        name="${name}"
        placeholder="${placeholder}"
        rows="${rows}"
        ${required ? 'required' : ''}
        class="${error ? 'error' : ''}"
      >${value}</textarea>
      ${error ? html`<span class="error-message">${error}</span>` : ''}
      <span class="char-count">${value.length}/500</span>
    </div>
  `;
}

/**
 * Select Field Component
 */
function SelectField({ 
  label, 
  name, 
  value = '', 
  options = [], 
  error = null, 
  required = false,
}) {
  return html`
    <div class="form-group ${error ? 'has-error' : ''}">
      <label for="${name}">
        ${label}
        ${required ? html`<span class="required">*</span>` : ''}
      </label>
      <select
        id="${name}"
        name="${name}"
        ${required ? 'required' : ''}
        class="${error ? 'error' : ''}"
      >
        <option value="">Select ${label}</option>
        ${options.map(opt => html`
          <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
            ${opt.label}
          </option>
        `)}
      </select>
      ${error ? html`<span class="error-message">${error}</span>` : ''}
    </div>
  `;
}

/**
 * Checkbox Field Component
 */
function CheckboxField({ label, name, checked = false, description = '' }) {
  return html`
    <div class="form-group checkbox-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          name="${name}"
          ${checked ? 'checked' : ''}
        />
        <span>${label}</span>
      </label>
      ${description ? html`<p class="field-description">${description}</p>` : ''}
    </div>
  `;
}

/**
 * Progress Indicator
 */
function ProgressIndicator({ currentStep, totalSteps }) {
  const percentage = (currentStep / totalSteps) * 100;
  
  return html`
    <div class="progress-indicator">
      <div class="progress-steps">
        ${Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const status = step < currentStep ? 'completed' : 
                        step === currentStep ? 'active' : 'pending';
          
          return html`
            <div class="step ${status}">
              <div class="step-number">${step}</div>
              <div class="step-label">Step ${step}</div>
            </div>
          `;
        })}
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

/**
 * Step 1: Basic Information Form
 */
function BasicInfoForm({ formData, errors }) {
  return html`
    <div class="form-step">
      <h2>Basic Information</h2>
      <p class="step-description">Create your account credentials</p>
      
      ${InputField({
        label: 'Username',
        name: 'username',
        value: formData.username || '',
        error: errors.username,
        required: true,
        placeholder: 'Choose a unique username',
      })}
      
      ${InputField({
        label: 'Email',
        name: 'email',
        type: 'email',
        value: formData.email || '',
        error: errors.email,
        required: true,
        placeholder: 'your.email@example.com',
      })}
      
      ${InputField({
        label: 'Password',
        name: 'password',
        type: 'password',
        value: formData.password || '',
        error: errors.password,
        required: true,
        placeholder: 'Create a strong password',
      })}
      
      ${InputField({
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        value: formData.confirmPassword || '',
        error: errors.confirmPassword,
        required: true,
        placeholder: 'Re-enter your password',
      })}
    </div>
  `;
}

/**
 * Step 2: Personal Information Form
 */
function PersonalInfoForm({ formData, errors }) {
  return html`
    <div class="form-step">
      <h2>Personal Information</h2>
      <p class="step-description">Tell us about yourself</p>
      
      <div class="form-row">
        ${InputField({
          label: 'First Name',
          name: 'firstName',
          value: formData.firstName || '',
          error: errors.firstName,
          required: true,
          placeholder: 'John',
        })}
        
        ${InputField({
          label: 'Last Name',
          name: 'lastName',
          value: formData.lastName || '',
          error: errors.lastName,
          required: true,
          placeholder: 'Doe',
        })}
      </div>
      
      <div class="form-row">
        ${InputField({
          label: 'Age',
          name: 'age',
          type: 'number',
          value: formData.age || '',
          error: errors.age,
          required: true,
          placeholder: '25',
        })}
        
        ${InputField({
          label: 'Phone Number',
          name: 'phone',
          type: 'tel',
          value: formData.phone || '',
          error: errors.phone,
          required: true,
          placeholder: '+1 (555) 123-4567',
        })}
      </div>
    </div>
  `;
}

/**
 * Step 3: Preferences Form
 */
function PreferencesForm({ formData, errors }) {
  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto (System)' },
  ];
  
  return html`
    <div class="form-step">
      <h2>Preferences</h2>
      <p class="step-description">Customize your experience</p>
      
      ${SelectField({
        label: 'Theme',
        name: 'theme',
        value: formData.theme || '',
        options: themeOptions,
        error: errors.theme,
        required: true,
      })}
      
      ${TextareaField({
        label: 'Bio',
        name: 'bio',
        value: formData.bio || '',
        error: errors.bio,
        placeholder: 'Tell us about yourself...',
        rows: 4,
      })}
      
      ${CheckboxField({
        label: 'Subscribe to newsletter',
        name: 'newsletter',
        checked: formData.newsletter || false,
        description: 'Receive updates about new features and content',
      })}
      
      ${CheckboxField({
        label: 'Enable notifications',
        name: 'notifications',
        checked: formData.notifications || false,
        description: 'Get notified about important updates',
      })}
    </div>
  `;
}

/**
 * Review Step
 */
function ReviewStep({ formData }) {
  return html`
    <div class="form-step review-step">
      <h2>Review Your Information</h2>
      <p class="step-description">Please review your information before submitting</p>
      
      <div class="review-section">
        <h3>Account Information</h3>
        <dl>
          <dt>Username:</dt>
          <dd>${formData.username}</dd>
          <dt>Email:</dt>
          <dd>${formData.email}</dd>
        </dl>
      </div>
      
      <div class="review-section">
        <h3>Personal Information</h3>
        <dl>
          <dt>Name:</dt>
          <dd>${formData.firstName} ${formData.lastName}</dd>
          <dt>Age:</dt>
          <dd>${formData.age}</dd>
          <dt>Phone:</dt>
          <dd>${formData.phone}</dd>
        </dl>
      </div>
      
      <div class="review-section">
        <h3>Preferences</h3>
        <dl>
          <dt>Theme:</dt>
          <dd>${formData.theme}</dd>
          <dt>Newsletter:</dt>
          <dd>${formData.newsletter ? 'Yes' : 'No'}</dd>
          <dt>Notifications:</dt>
          <dd>${formData.notifications ? 'Yes' : 'No'}</dd>
          ${formData.bio ? html`
            <dt>Bio:</dt>
            <dd>${formData.bio}</dd>
          ` : ''}
        </dl>
      </div>
    </div>
  `;
}

/**
 * Success Message
 */
function SuccessMessage({ formData }) {
  return html`
    <div class="success-message">
      <div class="success-icon">✓</div>
      <h2>Registration Successful!</h2>
      <p>Welcome, ${formData.firstName}! Your account has been created.</p>
      <p class="success-details">
        We've sent a confirmation email to <strong>${formData.email}</strong>
      </p>
      <button class="btn-primary">Go to Dashboard</button>
    </div>
  `;
}

/**
 * Multi-Step Registration Form
 */
function RegistrationForm({ 
  currentStep = 1, 
  formData = {}, 
  errors = {},
  isSubmitting = false,
  isSuccess = false,
}) {
  const totalSteps = 4; // 3 form steps + 1 review step
  
  if (isSuccess) {
    return html`
      <div class="registration-container">
        ${SuccessMessage({ formData })}
      </div>
    `;
  }
  
  return html`
    <div class="registration-container">
      <div class="registration-header">
        <h1>Create Your Account</h1>
        <p>Join our community today</p>
      </div>
      
      ${ProgressIndicator({ currentStep, totalSteps })}
      
      <form class="registration-form" onsubmit="return handleSubmit(event)">
        ${currentStep === 1 ? BasicInfoForm({ formData, errors }) : ''}
        ${currentStep === 2 ? PersonalInfoForm({ formData, errors }) : ''}
        ${currentStep === 3 ? PreferencesForm({ formData, errors }) : ''}
        ${currentStep === 4 ? ReviewStep({ formData }) : ''}
        
        <div class="form-actions">
          ${currentStep > 1 ? html`
            <button type="button" class="btn-secondary" onclick="previousStep()">
              Previous
            </button>
          ` : ''}
          
          ${currentStep < totalSteps ? html`
            <button type="button" class="btn-primary" onclick="nextStep()">
              Next
            </button>
          ` : html`
            <button type="submit" class="btn-primary" ${isSubmitting ? 'disabled' : ''}>
              ${isSubmitting ? 'Submitting...' : 'Create Account'}
            </button>
          `}
        </div>
      </form>
    </div>
  `;
}

/**
 * Main App Component
 */
function App() {
  // Simulated form state
  const formData = {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    age: '28',
    phone: '+1 (555) 123-4567',
    theme: 'dark',
    bio: 'Full-stack developer passionate about web technologies.',
    newsletter: true,
    notifications: true,
  };
  
  const errors = {};
  
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Registration - Coherent.js Forms Example</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
          }
          
          .registration-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
          }
          
          .registration-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
          }
          
          .registration-header h1 {
            font-size: 2em;
            margin-bottom: 10px;
          }
          
          .progress-indicator {
            padding: 30px 40px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
          }
          
          .progress-steps {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          
          .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
          }
          
          .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e9ecef;
            color: #6c757d;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .step.active .step-number {
            background: #667eea;
            color: white;
          }
          
          .step.completed .step-number {
            background: #28a745;
            color: white;
          }
          
          .step-label {
            font-size: 0.85em;
            color: #6c757d;
          }
          
          .progress-bar {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
          }
          
          .registration-form {
            padding: 40px;
          }
          
          .form-step h2 {
            color: #2c3e50;
            margin-bottom: 10px;
          }
          
          .step-description {
            color: #6c757d;
            margin-bottom: 30px;
          }
          
          .form-group {
            margin-bottom: 25px;
          }
          
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #2c3e50;
          }
          
          .required {
            color: #dc3545;
            margin-left: 4px;
          }
          
          input, select, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
          }
          
          input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
          }
          
          input.error, select.error, textarea.error {
            border-color: #dc3545;
          }
          
          .error-message {
            display: block;
            color: #dc3545;
            font-size: 0.85em;
            margin-top: 6px;
          }
          
          .char-count {
            display: block;
            text-align: right;
            font-size: 0.85em;
            color: #6c757d;
            margin-top: 4px;
          }
          
          .checkbox-group {
            display: flex;
            flex-direction: column;
          }
          
          .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: normal;
          }
          
          .checkbox-label input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
          }
          
          .field-description {
            font-size: 0.85em;
            color: #6c757d;
            margin-top: 6px;
            margin-left: 30px;
          }
          
          .review-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          
          .review-section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.1em;
          }
          
          .review-section dl {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
          }
          
          .review-section dt {
            font-weight: 600;
            color: #6c757d;
          }
          
          .review-section dd {
            color: #2c3e50;
          }
          
          .form-actions {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #e9ecef;
          }
          
          button {
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            flex: 1;
          }
          
          .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          
          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          
          .btn-secondary {
            background: #e9ecef;
            color: #2c3e50;
          }
          
          .btn-secondary:hover {
            background: #dee2e6;
          }
          
          .success-message {
            padding: 60px 40px;
            text-align: center;
          }
          
          .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #28a745;
            color: white;
            font-size: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
          }
          
          .success-message h2 {
            color: #2c3e50;
            margin-bottom: 15px;
          }
          
          .success-details {
            color: #6c757d;
            margin: 20px 0 30px;
          }
          
          @media (max-width: 768px) {
            .form-row {
              grid-template-columns: 1fr;
            }
            
            .progress-steps {
              flex-wrap: wrap;
            }
            
            .step {
              flex-basis: 50%;
              margin-bottom: 15px;
            }
          }
        </style>
      </head>
      <body>
        ${RegistrationForm({ 
          currentStep: 4, 
          formData, 
          errors,
          isSubmitting: false,
          isSuccess: false,
        })}
      </body>
    </html>
  `;
}

// ============================================================================
// Demo: Form Validation
// ============================================================================

console.log('='.repeat(80));
console.log('Coherent.js Forms Complete Example');
console.log('='.repeat(80));

// Test validation
console.log('\n🧪 Testing Form Validation...\n');

const validator = createFormValidator(basicInfoSchema);

// Test valid data
const validData = {
  username: 'johndoe123',
  email: 'john@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
};

const validResult = validator.validate(validData);
console.log('✅ Valid data:', validResult.isValid ? 'PASSED' : 'FAILED');

// Test invalid data
const invalidData = {
  username: 'ab', // Too short
  email: 'invalid-email', // Invalid format
  password: 'weak', // Too weak
  confirmPassword: 'different', // Doesn't match
};

const invalidResult = validator.validate(invalidData);
console.log('❌ Invalid data:', !invalidResult.isValid ? 'PASSED' : 'FAILED');
console.log('   Errors found:', Object.keys(invalidResult.errors).length);

// Render the form
console.log('\n📝 Rendering Registration Form...\n');
const renderedForm = render(App());
console.log('✅ Form rendered successfully');
console.log(`   Length: ${renderedForm.length} characters`);

console.log('\n' + '='.repeat(80));
console.log('✅ Forms example complete!');
console.log('='.repeat(80));

export { App, RegistrationForm, basicInfoSchema, personalInfoSchema, preferencesSchema };
