import { withState } from '../src/coherent.js';
import { makeHydratable, autoHydrate } from '../src/client/hydration.js';

// Example 1: Basic component composition
export const Header = ({ title, subtitle }) => ({
  header: {
    className: 'app-header',
    children: [
      { h1: { text: title } },
      subtitle ? { p: { text: subtitle } } : null
    ].filter(Boolean)
  }
});

export const Footer = ({ copyright }) => ({
  footer: {
    className: 'app-footer',
    children: [
      { p: { text: ` ${new Date().getFullYear()} ${copyright}` } }
    ]
  }
});

export const Layout = ({ header, footer, children }) => ({
  div: {
    className: 'app-layout',
    children: [
      header,
      {
        main: {
          className: 'app-main',
          children: Array.isArray(children) ? children : [children]
        }
      },
      footer
    ]
  }
});

// Example 2: Higher-order component for loading states
export const withLoading = (WrappedComponent) => 
  withState({ loading: false, error: null })(({ state, setState, ...props }) => {
    if (state.loading) {
      return {
        div: {
          className: 'loading-container',
          children: [
            { h3: { text: 'Loading...' } },
            { div: { className: 'spinner', text: '' } }
          ]
        }
      };
    }
    
    if (state.error) {
      return {
        div: {
          className: 'error-container',
          children: [
            { h3: { text: 'Error Occurred' } },
            { p: { text: state.error.message || 'An unknown error occurred' } },
            { button: { 
              text: 'Retry', 
              onclick: () => setState({ error: null }) 
            }}
          ]
        }
      };
    }
    
    // Add loading controls to props
    const propsWithLoading = {
      ...props,
      setLoading: (loading) => setState({ loading }),
      setError: (error) => setState({ error })
    };
    
    return WrappedComponent(propsWithLoading);
  });

// Example 3: Component composition with mixins
export const withTimestamp = (Component) => (props) => ({
  div: {
    className: 'timestamp-wrapper',
    children: [
      Component(props),
      { small: { 
        text: `Last updated: ${new Date().toLocaleTimeString()}`,
        className: 'timestamp'
      }}
    ]
  }
});

export const withBorder = (Component) => (props) => ({
  div: {
    className: 'border-wrapper',
    style: 'border: 2px solid #ccc; padding: 10px; margin: 10px 0; border-radius: 4px;',
    children: [Component(props)]
  }
});

export const SimpleCard = ({ title, content }) => ({
  div: {
    className: 'simple-card',
    children: [
      { h3: { text: title } },
      { p: { text: content } }
    ]
  }
});

// Compose multiple HOCs
export const EnhancedCard = withBorder(withTimestamp(SimpleCard));

// Example 4: Form component with state management and hydration support
const ContactFormComponent = withState({
  name: '',
  email: '',
  message: '',
  submitted: false
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted:', { name: state.name, email: state.email, message: state.message });
    setState({ submitted: true });
    
    // Reset form after 2 seconds
    setTimeout(() => {
      setState({ name: '', email: '', message: '', submitted: false });
    }, 2000);
  };

  const updateField = (field) => (event) => {
    setState({ [field]: event.target.value });
  };

  return {
    div: {
      'data-coherent-component': 'contact-form',
      children: [
        {
          form: {
            className: 'contact-form',
            onsubmit: handleSubmit,
            children: [
              { h2: { text: 'Contact Us' } },
              state.submitted ? {
                div: {
                  className: 'success-message',
                  children: [
                    { p: { text: '✓ Message sent successfully!' } }
                  ]
                }
              } : null,
              {
                div: {
                  className: 'form-field',
                  children: [
                    { label: { text: 'Name', htmlFor: 'contact-name' } },
                    {
                      input: {
                        id: 'contact-name',
                        type: 'text',
                        value: state.name,
                        placeholder: 'Your name',
                        oninput: updateField('name'),
                        required: true
                      }
                    }
                  ]
                }
              },
              {
                div: {
                  className: 'form-field',
                  children: [
                    { label: { text: 'Email', htmlFor: 'contact-email' } },
                    {
                      input: {
                        id: 'contact-email',
                        type: 'email',
                        value: state.email,
                        placeholder: 'your@email.com',
                        oninput: updateField('email'),
                        required: true
                      }
                    }
                  ]
                }
              },
              {
                div: {
                  className: 'form-field',
                  children: [
                    { label: { text: 'Message', htmlFor: 'contact-message' } },
                    {
                      textarea: {
                        id: 'contact-message',
                        value: state.message,
                        placeholder: 'Your message here...',
                        oninput: updateField('message'),
                        rows: 4,
                        required: true
                      }
                    }
                  ]
                }
              },
              {
                button: {
                  className: 'btn btn--primary',
                  type: 'submit',
                  text: state.submitted ? 'Sent!' : 'Send Message',
                  disabled: state.submitted
                }
              }
            ].filter(Boolean)
          }
        }
      ]
    }
  };
});

export const ContactForm = ContactFormComponent;

// Make the contact form hydratable
export const HydratableContactForm = makeHydratable(ContactForm, {
  componentName: 'contact-form'
});

// Complete page demonstrating all composition patterns
export const demoPage = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Component Composition Demo' } },
            {
              style: {
                text: `
                body { 
                  font-family: Arial, sans-serif; 
                  max-width: 900px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  line-height: 1.6;
                }
                .app-header { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  border-radius: 8px; 
                  margin-bottom: 20px; 
                }
                .app-footer { 
                  background: #f8f9fa; 
                  padding: 15px; 
                  border-radius: 8px; 
                  margin-top: 20px; 
                  text-align: center; 
                }
                .app-main { 
                  min-height: 400px; 
                }
                .simple-card { 
                  background: white; 
                  padding: 15px; 
                  margin: 10px 0; 
                }
                .timestamp { 
                  color: #666; 
                  font-style: italic; 
                  margin-top: 10px; 
                  display: block; 
                }
                .contact-form { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  border-radius: 8px; 
                  margin: 20px 0; 
                }
                .form-field { 
                  margin-bottom: 15px; 
                }
                .form-field label { 
                  display: block; 
                  margin-bottom: 5px; 
                  font-weight: bold; 
                }
                .form-field input, .form-field textarea { 
                  width: 100%; 
                  padding: 8px; 
                  border: 1px solid #ddd; 
                  border-radius: 4px; 
                  font-size: 14px; 
                }
                .btn { 
                  padding: 10px 20px; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 14px; 
                }
                .btn--primary { 
                  background: #007bff; 
                  color: white; 
                }
                .btn--primary:hover { 
                  background: #0056b3; 
                }
                .btn:disabled {
                  background: #6c757d;
                  cursor: not-allowed;
                  opacity: 0.6;
                }
                .success-message {
                  background: #d4edda;
                  color: #155724;
                  padding: 10px;
                  border-radius: 4px;
                  margin: 10px 0;
                  border: 1px solid #c3e6cb;
                }
                `
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            Layout({
              header: Header({ 
                title: 'Component Composition Demo', 
                subtitle: 'Exploring different composition patterns in Coherent.js' 
              }),
              footer: Footer({ copyright: 'Coherent.js Examples' }),
              children: [
                { h2: { text: 'Enhanced Card with Multiple HOCs' } },
                { p: { text: 'This card demonstrates composition using withBorder and withTimestamp HOCs:' } },
                EnhancedCard({ 
                  title: 'Enhanced Card Example', 
                  content: 'This card has a border and timestamp automatically added through composition.' 
                }),
                
                { h2: { text: 'Interactive Form with State' } },
                { p: { text: 'This form demonstrates state management, event handling, and client-side hydration:' } },
                HydratableContactForm.renderWithHydration()
              ]
            })
          ]
        }
      }
    ]
  }
};

// Set up client-side hydration (browser only)
if (typeof window !== 'undefined') {
  // Component registry for hydration
  window.componentRegistry = {
    'contact-form': HydratableContactForm
  };
  
  // Auto-hydrate when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      autoHydrate(window.componentRegistry);
      console.log('✅ Component composition hydration complete!');
    }, 100);
  });
}

// Export the demo page as default for live preview
export default demoPage;
