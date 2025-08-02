import { renderToString, withState } from '../src/coherent.js';

// Example 1: Basic component composition
const Header = ({ title, subtitle }) => ({
  header: {
    className: 'app-header',
    children: [
      { h1: { text: title } },
      subtitle ? { p: { text: subtitle } } : null
    ].filter(Boolean)
  }
});

const Footer = ({ copyright }) => ({
  footer: {
    className: 'app-footer',
    children: [
      { p: { text: `© ${new Date().getFullYear()} ${copyright}` } }
    ]
  }
});

const Layout = ({ header, footer, children }) => ({
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
const withLoading = (WrappedComponent) => 
  withState({ loading: false, error: null })(({ state, setState, ...props }) => {
    if (state.loading) {
      return {
        div: {
          className: 'loading-container',
          children: [
            { h3: { text: 'Loading...' } },
            { div: { className: 'spinner' } }
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

// Example component that uses loading state
const DataDisplay = withLoading(({ data, setLoading, setError }) => {
  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, this would be actual data fetching
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    div: {
      className: 'data-display',
      children: [
        { h2: { text: 'Data Display with Loading State' } },
        { p: { text: `Items: ${data?.length || 0}` } },
        { button: { text: 'Load Data', onclick: loadData } }
      ]
    }
  };
});

// Example 3: Component composition with mixins
const withTimestamp = (Component) => (props) => ({
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

const withBorder = (Component) => (props) => ({
  div: {
    className: 'border-wrapper',
    style: 'border: 2px solid #ccc; padding: 10px; margin: 10px 0;',
    children: [Component(props)]
  }
});

const SimpleCard = ({ title, content }) => ({
  div: {
    className: 'simple-card',
    children: [
      { h3: { text: title } },
      { p: { text: content } }
    ]
  }
});

// Compose multiple HOCs
const EnhancedCard = withBorder(withTimestamp(SimpleCard));

// Example 4: Component composition using compose utility
const Notification = ({ type, message, onClose }) => ({
  div: {
    className: `notification notification--${type}`,
    children: [
      { span: { text: message } },
      { button: { 
        text: '×', 
        className: 'close-btn',
        onclick: onClose 
      }}
    ]
  }
});

const Button = ({ text, onClick, variant = 'primary' }) => ({
  button: {
    className: `btn btn--${variant}`,
    text: text,
    onclick: onClick
  }
});

const FormField = ({ label, type = 'text', value, onChange, placeholder }) => ({
  div: {
    className: 'form-field',
    children: [
      { label: { text: label } },
      { input: { type, value, placeholder, oninput: (e) => onChange(e.target.value) } }
    ]
  }
});

// Compose multiple components into a form
const ContactForm = withState({
  name: '',
  email: '',
  message: ''
})(({ state, setState }) => ({
  form: {
    className: 'contact-form',
    children: [
      { h2: { text: 'Contact Us' } },
      FormField({
        label: 'Name',
        value: state.name,
        onChange: (value) => setState({ name: value }),
        placeholder: 'Your name'
      }),
      FormField({
        label: 'Email',
        type: 'email',
        value: state.email,
        onChange: (value) => setState({ email: value }),
        placeholder: 'your@email.com'
      }),
      FormField({
        label: 'Message',
        type: 'textarea',
        value: state.message,
        onChange: (value) => setState({ message: value }),
        placeholder: 'Your message here...'
      }),
      Button({
        text: 'Send Message',
        variant: 'primary',
        onClick: () => {
          console.log('Form submitted:', state);
          // Reset form
          setState({ name: '', email: '', message: '' });
        }
      })
    ]
  }
}));

// Example 5: Conditional composition
const ConditionalWrapper = ({ condition, wrapper, children }) => 
  condition ? wrapper(children) : children;

const Card = ({ title, children, elevated = false }) => ({
  div: {
    className: `card ${elevated ? 'card--elevated' : ''}`,
    children: [
      title ? { h3: { text: title } } : null,
      { div: { className: 'card-content', children: [children] } }
    ].filter(Boolean)
  }
});

// Render examples
console.log('=== Component Composition Examples ===\n');

console.log('1. Basic Layout Composition:');
const page = Layout({
  header: Header({ title: 'My App', subtitle: 'Built with Coherent.js' }),
  footer: Footer({ copyright: 'Coherent.js Examples' }),
  children: [
    { h2: { text: 'Welcome to the App' } },
    { p: { text: 'This page demonstrates component composition.' } }
  ]
});

console.log(renderToString(Notification({ type: 'info', message: 'This is a notification message', onClose: () => {} })));

console.log(renderToString(page));

console.log('\n2. Higher-Order Component with Loading State:');
console.log(renderToString(DataDisplay({ data: [1, 2, 3] })));

console.log('\n3. Multiple HOC Composition:');
console.log(renderToString(EnhancedCard({ 
  title: 'Enhanced Card', 
  content: 'This card has a border and timestamp.' 
})));

console.log('\n4. Form Component Composition:');
console.log(renderToString(ContactForm()));

console.log('\n5. Conditional Composition:');
const conditionalCard = ConditionalWrapper({
  condition: true,
  wrapper: (children) => Card({ title: 'Wrapped Content', elevated: true, children }),
  children: { p: { text: 'This content may or may not be wrapped.' } }
});

console.log(renderToString(conditionalCard));
