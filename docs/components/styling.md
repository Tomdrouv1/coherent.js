# Styling Components in Coherent.js

This comprehensive guide covers all aspects of styling components in Coherent.js, from basic CSS classes to external CSS files, advanced theming systems and CSS-in-JS patterns.

## 🎨 Basic Styling Approaches

### 1. CSS Classes

The most straightforward way to style components:

```javascript
const Button = ({ variant = 'primary', size = 'medium', children }) => ({
  button: {
    className: `btn btn--${variant} btn--${size}`,
    children: Array.isArray(children) ? children : [children]
  }
});

// Corresponding CSS
const styles = `
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn--primary {
  background-color: #007bff;
  color: white;
}

.btn--primary:hover {
  background-color: #0056b3;
}

.btn--secondary {
  background-color: #6c757d;
  color: white;
}

.btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.btn--large {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}
`;
```

### 2. Inline Styles

For dynamic or component-specific styling. `style` takes a string, or an object whose camelCase keys are written as CSS properties (`{ backgroundColor: 'red' }` renders `style="background-color: red"`):

```javascript
const ProgressBar = ({ progress = 0, color = '#007bff', height = '20px' }) => ({
  div: {
    style: `
      width: 100%;
      height: ${height};
      background-color: #e9ecef;
      border-radius: 0.25rem;
      overflow: hidden;
    `,
    children: [
      {
        div: {
          style: `
            width: ${Math.min(Math.max(progress, 0), 100)}%;
            height: 100%;
            background-color: ${color};
            transition: width 0.3s ease;
          `
        }
      }
    ]
  }
});

// Usage
const progressBar = ProgressBar({ 
  progress: 75, 
  color: '#28a745',
  height: '10px'
});
```

### 3. Conditional Styling

`className` accepts a string, an array (falsy entries are skipped) or an object (keys whose value is truthy are kept):

```javascript
const Alert = ({ type = 'info', message, dismissible = false }) => ({
  div: {
    className: ['alert', `alert-${type}`, { 'alert-dismissible': dismissible }],
    role: 'alert',
    children: [
      { span: { text: message } },
      dismissible && {
        button: {
          className: 'alert-close',
          'aria-label': 'Close',
          onClick: (event) => event.target.closest('.alert').remove(), // attached by hydrate()
          children: [{ span: { text: '×' } }]
        }
      }
    ]
  }
});

render(Alert({ type: 'success', message: 'Saved', dismissible: true }));
// <div class="alert alert-success alert-dismissible" role="alert">...
```

## 📁 Stylesheets

Coherent.js renders HTML; stylesheets are ordinary elements in your document's `head`.

### Linking CSS Files

```javascript
import { render } from '@coherent.js/core';

const Document = ({ title, children }) => ({
  html: {
    children: [
      { head: {
        children: [
          { title: { text: title } },
          { link: { rel: 'stylesheet', href: '/styles/main.css' } },
          { link: { rel: 'stylesheet', href: '/styles/components.css' } },
          { link: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter&display=swap' } }
        ]
      }},
      { body: { children } }
    ]
  }
});

const html = `<!DOCTYPE html>${render(Document({ title: 'My App', children: [App()] }))}`;
```

Serve the CSS files as static assets (for example with `express.static`), organised however you like:

```
/styles/
  ├── main.css              // Global styles
  ├── components/
  │   ├── button.css
  │   └── form.css
  └── themes/
      ├── light.css
      └── dark.css
```

### Inline `<style>` Elements

```javascript
{ style: { text: `.custom-override { color: #333; font-family: 'Inter', sans-serif; }` } }
```

The text of a `<style>` element is not HTML-escaped (selectors such as `a > b` keep working), but a `</style` sequence inside it is neutralised so the CSS cannot close the element.

### Scoped CSS

Pass `scoped: true` (alias `encapsulate`) to `render()` to scope a component's own `<style>` rules to its elements, similar to Angular's view encapsulation:

```javascript
const Card = () => ({
  div: {
    className: 'card',
    children: [
      { style: { text: '.card { padding: 1rem; } @media (max-width: 600px) { .card { padding: 0; } }' } },
      { h2: { className: 'title', text: 'Hello' } }
    ]
  }
});

render(Card(), { scoped: true });
// <div class="card" coh-1ltr1dj=""><style coh-1ltr1dj="">.card[coh-1ltr1dj] { padding: 1rem; }
//   @media (max-width: 600px) { .card[coh-1ltr1dj] { padding: 0; } }</style>
//   <h2 class="title" coh-1ltr1dj="">Hello</h2></div>
```

- Scoping is off by default.
- The `coh-…` id is derived from the component's CSS, so the same component renders the same HTML every time (safe for HTML caching and hydration).
- Rules inside `@media`, `@supports`, `@container` and `@layer` are scoped; `@keyframes`, `@font-face` and other at-rules are left intact.

## 🎭 CSS-in-JS Patterns

### Style Object Creation

```javascript
const createStyles = (theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadows.medium
  },
  
  header: {
    fontSize: theme.fonts.sizes.large,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.small
  },
  
  body: {
    fontSize: theme.fonts.sizes.medium,
    lineHeight: theme.fonts.lineHeights.normal,
    color: theme.colors.text
  },
  
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.small,
    marginTop: theme.spacing.medium,
    paddingTop: theme.spacing.small,
    borderTop: `1px solid ${theme.colors.border}`
  }
});

// `style` accepts these objects directly; this helper is only needed when you
// want to combine them with a CSS string
const stylesToString = (styles) => {
  return Object.entries(styles)
    .map(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssProperty}: ${value}`;
    })
    .join('; ');
};

const Card = ({ title, content, actions, theme }) => {
  const styles = createStyles(theme);
  
  return {
    div: {
      style: styles.container,
      children: [
        title && {
          h2: {
            style: styles.header,
            text: title
          }
        },

        content && {
          div: {
            style: styles.body,
            children: Array.isArray(content) ? content : [content]
          }
        },

        actions && {
          div: {
            style: styles.footer,
            children: Array.isArray(actions) ? actions : [actions]
          }
        }
      ]
    }
  };
};
```

### Dynamic Style Generation

```javascript
const generateButtonStyles = ({ variant, size, disabled, rounded }) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    textDecoration: 'none'
  };

  // Size variations
  const sizeStyles = {
    small: {
      padding: '0.25rem 0.75rem',
      fontSize: '0.875rem'
    },
    medium: {
      padding: '0.5rem 1rem',
      fontSize: '1rem'
    },
    large: {
      padding: '0.75rem 1.5rem',
      fontSize: '1.125rem'
    }
  };

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: disabled ? '#6c757d' : '#007bff',
      color: 'white'
    },
    secondary: {
      backgroundColor: disabled ? '#e9ecef' : 'transparent',
      color: disabled ? '#6c757d' : '#007bff',
      border: `1px solid ${disabled ? '#e9ecef' : '#007bff'}`
    },
    success: {
      backgroundColor: disabled ? '#6c757d' : '#28a745',
      color: 'white'
    }
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    borderRadius: rounded ? '2rem' : '0.25rem',
    opacity: disabled ? 0.6 : 1
  };
};

const DynamicButton = (props) => {
  const { 
    children, 
    variant = 'primary', 
    size = 'medium', 
    disabled = false,
    rounded = false,
    ...restProps 
  } = props;
  
  const styles = generateButtonStyles({ variant, size, disabled, rounded });
  
  return {
    button: {
      style: styles,
      disabled,
      ...restProps,
      children: Array.isArray(children) ? children : [children]
    }
  };
};
```

## 🌈 Theming System

### Theme Definition

```javascript
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const deepMerge = (base, overrides) => Object.fromEntries(
  [...new Set([...Object.keys(base), ...Object.keys(overrides)])].map((key) => [
    key,
    isObject(base[key]) && isObject(overrides[key]) ? deepMerge(base[key], overrides[key]) : overrides[key] ?? base[key]
  ])
);

const createTheme = (overrides = {}) => {
  const baseTheme = {
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8',
      light: '#f8f9fa',
      dark: '#343a40',
      white: '#ffffff',
      black: '#000000',
      
      // Semantic colors
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      shadow: 'rgba(0, 0, 0, 0.1)'
    },
    
    spacing: {
      xs: '0.25rem',
      small: '0.5rem',
      medium: '1rem',
      large: '1.5rem',
      xl: '2rem',
      xxl: '3rem'
    },
    
    fonts: {
      family: {
        body: 'system-ui, -apple-system, sans-serif',
        heading: 'system-ui, -apple-system, sans-serif',
        mono: 'SFMono-Regular, Consolas, monospace'
      },
      sizes: {
        xs: '0.75rem',
        small: '0.875rem',
        medium: '1rem',
        large: '1.25rem',
        xl: '1.5rem',
        xxl: '2rem'
      },
      weights: {
        light: '300',
        normal: '400',
        medium: '500',
        bold: '700'
      },
      lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    
    shadows: {
      small: '0 1px 3px rgba(0, 0, 0, 0.1)',
      medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
      large: '0 10px 25px rgba(0, 0, 0, 0.1)'
    },
    
    borderRadius: '0.25rem',
    
    breakpoints: {
      mobile: '480px',
      tablet: '768px',
      desktop: '1024px',
      wide: '1200px'
    },
    
    transitions: {
      fast: '0.1s ease',
      normal: '0.2s ease',
      slow: '0.3s ease'
    }
  };
  
  // Deep merge with overrides
  return deepMerge(baseTheme, overrides);
};

// Dark theme variant
const darkTheme = createTheme({
  colors: {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#404040'
  }
});

// High contrast theme
const highContrastTheme = createTheme({
  colors: {
    primary: '#0000ff',
    text: '#000000',
    background: '#ffffff',
    border: '#000000'
  }
});
```

### Theme Provider

On the server, share the theme through the SSR context API of `@coherent.js/state` instead of threading it through every component:

```javascript
import { render } from '@coherent.js/core';
import { createContextProvider, useContext, runWithContext } from '@coherent.js/state';

const themes = { light: createTheme(), dark: darkTheme, highContrast: highContrastTheme };

const ThemedButton = () => {
  const theme = useContext('theme');
  return {
    button: {
      style: { background: theme.colors.primary, color: theme.colors.white, borderRadius: theme.borderRadius },
      text: 'Save'
    }
  };
};

app.get('/', (req, res) => runWithContext(() => {
  const theme = themes[req.query.theme] ?? themes.light;
  res.send(render({
    div: {
      'data-theme': req.query.theme ?? 'light',
      children: [createContextProvider('theme', theme, ThemedButton)]
    }
  }));
}));
```

`runWithContext()` keeps each request's context separate. Switching themes in the browser is usually easiest with CSS custom properties (see [CSS Variable Generation](#css-variable-generation)) and a `data-theme` attribute on `<html>`.

### Theme-Aware Components

```javascript
const ThemedCard = ({ theme, title, content, variant = 'default' }) => {
  const cardStyles = {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border
    },
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      color: theme.colors.white
    },
    success: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
      color: theme.colors.white
    }
  };
  
  const selectedStyles = cardStyles[variant];
  
  return {
    div: {
      style: `
        background-color: ${selectedStyles.backgroundColor};
        border: 1px solid ${selectedStyles.borderColor};
        border-radius: ${theme.borderRadius};
        padding: ${theme.spacing.medium};
        box-shadow: ${theme.shadows.medium};
        color: ${selectedStyles.color || theme.colors.text};
        font-family: ${theme.fonts.family.body};
      `,
      children: [
        title && {
          h3: {
            style: `
              margin: 0 0 ${theme.spacing.small} 0;
              font-size: ${theme.fonts.sizes.large};
              font-weight: ${theme.fonts.weights.bold};
            `,
            text: title
          }
        },

        content && {
          div: {
            style: `
              font-size: ${theme.fonts.sizes.medium};
              line-height: ${theme.fonts.lineHeights.normal};
            `,
            children: Array.isArray(content) ? content : [content]
          }
        }
      ]
    }
  };
};
```

## 📱 Responsive Styling

### Media Query Utilities

Media queries cannot go in a `style` attribute; put them in a `<style>` element, and render with `scoped: true` to keep the rules local to the component:

```javascript
const mediaQueries = (theme) => ({
  mobile: `@media (max-width: ${theme.breakpoints.mobile})`,
  tablet: `@media (max-width: ${theme.breakpoints.tablet})`
});

const ResponsiveGrid = ({ theme, items, columns = { mobile: 1, tablet: 2, desktop: 3 } }) => {
  const mq = mediaQueries(theme);

  return {
    div: {
      className: 'grid',
      children: [
        { style: { text: `
          .grid { display: grid; gap: ${theme.spacing.medium}; grid-template-columns: repeat(${columns.desktop}, 1fr); }
          ${mq.tablet} { .grid { grid-template-columns: repeat(${columns.tablet}, 1fr); } }
          ${mq.mobile} { .grid { grid-template-columns: repeat(${columns.mobile}, 1fr); } }
          .grid-item { background: ${theme.colors.surface}; padding: ${theme.spacing.medium}; border-radius: ${theme.borderRadius}; }
        ` } },
        ...items.map((item) => ({ div: { className: 'grid-item', children: [item] } }))
      ]
    }
  };
};

render(ResponsiveGrid({ theme: createTheme(), items }), { scoped: true });
```

### Responsive Typography

```javascript
const ResponsiveText = ({ 
  theme, 
  children, 
  variant = 'body',
  responsive = true 
}) => {
  const typographyStyles = {
    h1: {
      fontSize: responsive ? 
        `clamp(${theme.fonts.sizes.xl}, 5vw, ${theme.fonts.sizes.xxl})` :
        theme.fonts.sizes.xxl,
      fontWeight: theme.fonts.weights.bold,
      lineHeight: theme.fonts.lineHeights.tight
    },
    h2: {
      fontSize: responsive ? 
        `clamp(${theme.fonts.sizes.large}, 4vw, ${theme.fonts.sizes.xl})` :
        theme.fonts.sizes.xl,
      fontWeight: theme.fonts.weights.bold,
      lineHeight: theme.fonts.lineHeights.tight
    },
    body: {
      fontSize: theme.fonts.sizes.medium,
      fontWeight: theme.fonts.weights.normal,
      lineHeight: theme.fonts.lineHeights.normal
    },
    small: {
      fontSize: theme.fonts.sizes.small,
      fontWeight: theme.fonts.weights.normal,
      lineHeight: theme.fonts.lineHeights.normal
    }
  };
  
  const styles = typographyStyles[variant];
  
  return {
    span: {
      style: {
        ...styles,
        fontFamily: theme.fonts.family.body,
        color: theme.colors.text
      },
      children: Array.isArray(children) ? children : [children]
    }
  };
};
```

## 🎯 Animation and Transitions

### CSS Transitions

```javascript
const AnimatedButton = ({ theme, children, loading = false, ...props }) => {
  const buttonStyles = {
    padding: theme.spacing.medium,
    backgroundColor: loading ? theme.colors.secondary : theme.colors.primary,
    color: theme.colors.white,
    border: 'none',
    borderRadius: theme.borderRadius,
    cursor: loading ? 'wait' : 'pointer',
    transition: `all ${theme.transitions.normal}`,
    transform: loading ? 'scale(0.98)' : 'scale(1)',
    opacity: loading ? 0.8 : 1,
    position: 'relative',
    overflow: 'hidden'
  };
  
  return {
    button: {
      style: buttonStyles,
      disabled: loading,
      ...props,
      children: [
        loading && {
          span: {
            style: `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 20px;
              height: 20px;
              border: 2px solid transparent;
              border-top: 2px solid currentColor;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            `
          }
        },
        
        {
          span: {
            style: `opacity: ${loading ? 0 : 1}; transition: opacity ${theme.transitions.fast};`,
            children: Array.isArray(children) ? children : [children]
          }
        }
      ]
    }
  };
};
```

### CSS Animations

```javascript
const generateKeyframes = () => `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Include the keyframes once per page: { style: { text: generateKeyframes() } }
const AnimatedCard = ({ theme, animation = 'fadeIn', delay = 0, children }) => {
  const animationStyles = {
    fadeIn: `fadeIn 0.5s ease ${delay}s both`,
    slideIn: `slideIn 0.3s ease ${delay}s both`,
    pulse: `pulse 2s ease-in-out ${delay}s infinite`
  };
  
  return {
    div: {
      style: `
        animation: ${animationStyles[animation]};
        background: ${theme.colors.surface};
        padding: ${theme.spacing.medium};
        border-radius: ${theme.borderRadius};
        border: 1px solid ${theme.colors.border};
      `,
      children: Array.isArray(children) ? children : [children]
    }
  };
};
```

## 🛠️ Utility Functions

### Style Merging

```javascript
const mergeStyles = (...styleSets) => {
  return styleSets.reduce((merged, styles) => {
    if (!styles) return merged;
    
    if (typeof styles === 'string') {
      return `${merged}; ${styles}`;
    }
    
    if (typeof styles === 'object') {
      return { ...merged, ...styles };
    }
    
    return merged;
  }, {});
};

// Usage
const CombinedButton = ({ theme, variant, size, customStyles, ...props }) => {
  const baseStyles = generateButtonStyles({ variant, size });
  const finalStyles = mergeStyles(baseStyles, customStyles);
  
  return {
    button: {
      style: typeof finalStyles === 'object' ? 
        stylesToString(finalStyles) : 
        finalStyles,
      ...props
    }
  };
};
```

### CSS Variable Generation

```javascript
const generateCSSVariables = (theme, prefix = '--') => {
  const flatten = (obj, parentKey = '') => {
    let result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = parentKey ? `${parentKey}-${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        result = { ...result, ...flatten(value, newKey) };
      } else {
        result[`${prefix}${newKey}`] = value;
      }
    }
    
    return result;
  };
  
  return flatten(theme);
};

const ThemeVariables = ({ theme }) => {
  const variables = generateCSSVariables(theme);
  const cssVariables = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  
  return {
    style: {
      text: `:root { ${cssVariables} }`
    }
  };
};
```

## 📚 Best Practices

### 1. Consistent Design System

```javascript
// ✅ Good - Use design tokens
const Button = ({ theme, variant }) => ({
  button: {
    style: {
      padding: theme.spacing.medium,
      fontSize: theme.fonts.sizes.medium,
      borderRadius: theme.borderRadius,
      backgroundColor: theme.colors[variant]
    }
  }
});

// ❌ Avoid - Magic numbers
const MagicButton = ({ variant }) => ({
  button: {
    style: {
      padding: '12px 24px',
      fontSize: '14px',
      borderRadius: '4px',
      backgroundColor: variant === 'primary' ? '#007bff' : '#6c757d'
    }
  }
});
```

### 2. Performance Optimization

```javascript
// ✅ Good - Reuse style objects
const buttonStyles = {
  base: { padding: '0.5rem 1rem', border: 'none' },
  primary: { backgroundColor: '#007bff', color: 'white' }
};

// ❌ Avoid - Recreating styles
const Button = () => ({
  button: {
    style: {
      padding: '0.5rem 1rem', // Recreated every render
      border: 'none'
    }
  }
});
```

### 3. Accessibility

Focus styles need a pseudo-class, so they belong in a stylesheet rather than a `style` attribute:

```javascript
const AccessibleButton = ({ children, ...props }) => ({
  button: {
    className: 'btn',
    ...props,
    children
  }
});

// In your stylesheet (or a { style: { text } } element)
const focusStyles = `
  .btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;
```

### 4. Maintainable CSS

```javascript
// ✅ Good - Semantic naming
const semanticStyles = {
  cardContainer: { /* styles */ },
  cardHeader: { /* styles */ },
  cardBody: { /* styles */ }
};

// ❌ Avoid - Presentational naming
const presentationalStyles = {
  blueBox: { /* styles */ },
  bigText: { /* styles */ },
  redBorder: { /* styles */ }
};
```

---

This comprehensive styling guide provides all the tools and patterns needed to create beautiful, maintainable, and accessible designs in Coherent.js applications.
