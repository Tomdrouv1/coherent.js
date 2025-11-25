/**
 * Enhanced FP Component Composition Tools for Coherent.js
 *
 * Advanced composition utilities that maintain functional purity
 * while providing powerful component patterns
 */

/**
 * Higher-Order Component (HOC) patterns
 */
export const hoc = {
  /**
   * Wrap component with additional props
   */
  withProps(additionalProps) {
    return (Component) => (props) => {
      return Component({ ...props, ...additionalProps });
    };
  },

  /**
   * Conditional rendering HOC
   */
  withCondition(condition) {
    return (Component) => (props) => {
      return condition(props) ? Component(props) : null;
    };
  },

  /**
   * Loading state HOC
   */
  withLoading(loadingComponent) {
    return (Component) => (props) => {
      return props.loading ? loadingComponent(props) : Component(props);
    };
  },

  /**
   * Error boundary HOC
   */
  withError(errorComponent) {
    return (Component) => (props) => {
      try {
        return Component(props);
      } catch (error) {
        return errorComponent({ error, ...props });
      }
    };
  },

  /**
   * Memoization HOC
   */
  withMemo(getMemoKey) {
    const cache = new Map();

    return (Component) => (props) => {
      const key = getMemoKey ? getMemoKey(props) : JSON.stringify(props);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = Component(props);
      cache.set(key, result);
      return result;
    };
  }
};

/**
 * Component composition utilities
 */
export const compose = {
  /**
   * Combine multiple components into one
   */
  combine(...components) {
    return (props) => ({
      fragment: {
        children: components.map(Component => Component(props))
      }
    });
  },

  /**
   * Pipe components through transformations
   */
  pipe(...transformers) {
    return (Component) => {
      return transformers.reduce((acc, transformer) => transformer(acc), Component);
    };
  },

  /**
   * Branch based on conditions
   */
  branch(condition, leftComponent, rightComponent) {
    return (props) => {
      return condition(props) ? leftComponent(props) : rightComponent(props);
    };
  },

  /**
   * Render component or fallback
   */
  maybe(Component, fallback = null) {
    return (props) => {
      return Component ? Component(props) : fallback;
    };
  }
};

/**
 * Layout composition patterns
 */
export const layout = {
  /**
   * Stack components vertically
   */
  stack(spacing = '1rem', ...components) {
    return {
      div: {
        style: `display: flex; flex-direction: column; gap: ${spacing};`,
        children: components
      }
    };
  },

  /**
   * Stack components horizontally
   */
  hstack(spacing = '1rem', ...components) {
    return {
      div: {
        style: `display: flex; flex-direction: row; gap: ${spacing}; align-items: center;`,
        children: components
      }
    };
  },

  /**
   * Grid layout
   */
  grid(columns = 'auto', rows = 'auto', gap = '1rem', ...components) {
    return {
      div: {
        style: `display: grid; grid-template-columns: ${columns}; grid-template-rows: ${rows}; gap: ${gap};`,
        children: components
      }
    };
  },

  /**
   * Card layout wrapper
   */
  card(title, content, actions = []) {
    return {
      div: {
        className: 'card',
        style: 'border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 0.5rem;',
        children: [
          ...(title ? [{
            h3: {
              style: 'margin-top: 0; margin-bottom: 1rem;',
              text: title
            }
          }] : []),
          ...(Array.isArray(content) ? content : [content]),
          ...(actions.length > 0 ? [{
            div: {
              style: 'margin-top: 1rem; display: flex; gap: 0.5rem;',
              children: actions
            }
          }] : [])
        ]
      }
    };
  },

  /**
   * Sidebar layout
   */
  sidebar(sidebar, main, sidebarWidth = '250px') {
    return {
      div: {
        style: 'display: flex; min-height: 100vh;',
        children: [
          {
            aside: {
              style: `width: ${sidebarWidth}; border-right: 1px solid #ddd; padding: 1rem;`,
              children: sidebar
            }
          },
          {
            main: {
              style: 'flex: 1; padding: 1rem;',
              children: main
            }
          }
        ]
      }
    };
  }
};

/**
 * Data flow patterns
 */
export const data = {
  /**
   * Map over array data
   */
  map(dataArray, itemComponent, keyExtractor = (item, index) => index) {
    return {
      fragment: {
        children: dataArray.map((item, index) => ({
          ...itemComponent(item, index),
          key: keyExtractor(item, index)
        }))
      }
    };
  },

  /**
   * Conditional rendering based on data
   */
  when(data, component, emptyComponent = null) {
    if (Array.isArray(data)) {
      return data.length > 0 ? component(data) : emptyComponent;
    }
    return data ? component(data) : emptyComponent;
  },

  /**
   * Switch/case pattern for data
   */
  switch(value, cases, defaultCase = null) {
    const component = cases[value] || defaultCase;
    return component ? component(value) : null;
  },

  /**
   * Async data loader
   */
  async(_loader, _loadingComponent, _errorComponent, _successComponent) {
    return {
      fragment: {
        children: [
          // This would be handled by the rendering system
          // For now, return a placeholder
          { div: { text: 'Loading async data...' }}
        ]
      }
    };
  }
};

/**
 * Form composition utilities
 */
export const form = {
  /**
   * Form field wrapper
   */
  field(label, inputComponent, error = null) {
    return {
      div: {
        className: 'form-field',
        style: 'margin-bottom: 1rem;',
        children: [
          ...(label ? [{
            label: {
              style: 'display: block; margin-bottom: 0.25rem; font-weight: bold;',
              text: label
            }
          }] : []),
          inputComponent,
          ...(error ? [{
            div: {
              style: 'color: red; font-size: 0.875rem; margin-top: 0.25rem;',
              text: error
            }
          }] : [])
        ]
      }
    };
  },

  /**
   * Input field generator
   */
  input(type, options = {}) {
    return (props) => ({
      input: {
        type,
        ...options,
        ...props
      }
    });
  },

  /**
   * Select field generator
   */
  select(optionsArray, placeholder = 'Select an option') {
    return (props) => ({
      select: {
        ...props,
        children: [
          ...(placeholder ? [{
            option: {
              value: '',
              text: placeholder,
              disabled: true,
              selected: !props.value
            }
          }] : []),
          ...optionsArray.map(option => ({
            option: {
              value: option.value,
              text: option.label,
              selected: props.value === option.value
            }
          }))
        ]
      }
    });
  },

  /**
   * Form wrapper with validation
   */
  wrapper(onSubmit, children) {
    return {
      form: {
        onsubmit: (e) => {
          e.preventDefault();
          onSubmit(new FormData(e.target));
        },
        children
      }
    };
  }
};

/**
 * Animation and transition utilities
 */
export const animation = {
  /**
   * Fade in component
   */
  fadeIn(duration = '300ms', component) {
    return {
      div: {
        style: `animation: fadeIn ${duration} ease-in;`,
        children: component
      }
    };
  },

  /**
   * Slide in component
   */
  slideIn(direction = 'left', duration = '300ms', component) {
    const animations = {
      left: 'slideInLeft',
      right: 'slideInRight',
      up: 'slideInUp',
      down: 'slideInDown'
    };

    return {
      div: {
        style: `animation: ${animations[direction]} ${duration} ease-out;`,
        children: component
      }
    };
  },

  /**
   * Transition wrapper
   */
  transition(property = 'all', duration = '300ms', component) {
    return {
      div: {
        style: `transition: ${property} ${duration} ease;`,
        children: component
      }
    };
  }
};

/**
 * Responsive design utilities
 */
export const responsive = {
  /**
   * Responsive container
   */
  container(maxWidth = '1200px', component) {
    return {
      div: {
        style: `max-width: ${maxWidth}; margin: 0 auto; padding: 0 1rem;`,
        children: component
      }
    };
  },

  /**
   * Hide on mobile
   */
  hideMobile(component) {
    return {
      div: {
        className: 'hide-mobile',
        style: '@media (max-width: 768px) { display: none; }',
        children: component
      }
    };
  },

  /**
   * Show only on mobile
   */
  mobileOnly(component) {
    return {
      div: {
        className: 'mobile-only',
        style: '@media (min-width: 769px) { display: none; }',
        children: component
      }
    };
  }
};

/**
 * Component factories for common patterns
 */
export const factories = {
  /**
   * Button factory
   */
  button(variant = 'primary', size = 'medium') {
    const variants = {
      primary: 'background: #007bff; color: white; border: none;',
      secondary: 'background: #6c757d; color: white; border: none;',
      danger: 'background: #dc3545; color: white; border: none;',
      outline: 'background: transparent; border: 1px solid #007bff; color: #007bff;'
    };

    const sizes = {
      small: 'padding: 0.25rem 0.5rem; font-size: 0.875rem;',
      medium: 'padding: 0.5rem 1rem; font-size: 1rem;',
      large: 'padding: 0.75rem 1.5rem; font-size: 1.125rem;'
    };

    return (props) => ({
      button: {
        style: `${variants[variant]} ${sizes[size]} border-radius: 4px; cursor: pointer;`,
        ...props
      }
    });
  },

  /**
   * Card factory
   */
  card(variant = 'default') {
    const variants = {
      default: 'border: 1px solid #ddd; border-radius: 8px; padding: 1rem;',
      elevated: 'border: none; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
      outlined: 'border: 2px solid #007bff; border-radius: 8px; padding: 1rem;'
    };

    return (props) => ({
      div: {
        className: `card card-${variant}`,
        style: variants[variant],
        ...props
      }
    });
  },

  /**
   * Alert factory
   */
  alert(type = 'info') {
    const types = {
      info: 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;',
      success: 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;',
      warning: 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;',
      error: 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
    };

    return (props) => ({
      div: {
        className: `alert alert-${type}`,
        style: `${types[type]} padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 1rem;`,
        ...props
      }
    });
  }
};

/**
 * Demo of enhanced composition
 */
export function demoEnhancedComposition() {
  // Create enhanced components using composition utilities
  const PrimaryButton = factories.button('primary', 'medium');
  const SecondaryButton = factories.button('secondary', 'small');
  const ElevatedCard = factories.card('elevated');
  const SuccessAlert = factories.alert('success');

  // Form with enhanced composition
  const UserForm = ({ onSubmit, errors = {} }) => {
    const NameInput = form.input('text', { placeholder: 'Enter name' });
    const EmailInput = form.input('email', { placeholder: 'Enter email' });

    return form.wrapper(onSubmit, [
      layout.card('User Information', [
        form.field('Name', NameInput({ name: 'name' }), errors.name),
        form.field('Email', EmailInput({ name: 'email' }), errors.email),
        layout.hstack('0.5rem',
          PrimaryButton({ type: 'submit', text: 'Save' }),
          SecondaryButton({ type: 'button', text: 'Cancel', onclick: () => console.log('Cancel') })
        )
      ])
    ]);
  };

  // List with enhanced composition
  const UserList = ({ users, onEdit, onDelete }) => {
    const UserItem = (user, _index) => ElevatedCard({
      key: user.id,
      children: [
        layout.hstack('1rem',
          { div: { children: [
            { h4: { text: user.name }},
            { p: { text: user.email }}
          ]}},
          layout.hstack('0.25rem',
            PrimaryButton({ text: 'Edit', onclick: () => onEdit(user) }),
            factories.button('danger', 'small')({ text: 'Delete', onclick: () => onDelete(user) })
          )
        )
      ]
    });

    return data.when(users,
      (users) => data.map(users, UserItem, user => user.id),
      SuccessAlert({ text: 'No users found' })
    );
  };

  return {
    UserForm,
    UserList,
    PrimaryButton,
    SecondaryButton,
    ElevatedCard,
    SuccessAlert
  };
}

export default {
  hoc,
  compose,
  layout,
  data,
  form,
  animation,
  responsive,
  factories,
  demoEnhancedComposition
};
