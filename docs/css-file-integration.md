# 📁 CSS File Integration Guide

This comprehensive guide covers how to integrate external CSS files with Coherent.js, providing developers with flexible styling options while maintaining the framework's pure JavaScript object philosophy.

## 🎯 Overview

Coherent.js supports multiple CSS integration methods:
- **CSS Files**: Load and inject CSS from external files
- **CSS Links**: Reference external CSS URLs (CDNs, fonts, etc.)
- **Inline CSS**: Add CSS directly in the render options
- **Mixed Approaches**: Combine multiple CSS sources

## 🚀 Quick Start

### Basic CSS File Loading

```javascript
import { renderHTML } from 'coherent';

const App = () => ({
  div: {
    className: 'app-container',
    children: [
      { h1: { className: 'title', text: 'My Application' } },
      { p: { className: 'description', text: 'Styled with external CSS files!' } }
    ]
  }
});

// Load CSS files and render complete HTML
const html = await renderHTML(App(), {
  cssFiles: [
    './styles/main.css',
    './styles/components.css'
  ]
});

console.log(html);
// Output: <!DOCTYPE html><html><head>...<style>/* CSS content */</style>...</head><body>...</body></html>
```

### CSS File Organization

Organize your CSS files for maintainability:

```
/src/
  /styles/
    ├── main.css              // Global styles, reset, typography
    ├── layout.css            // Grid systems, containers, spacing
    ├── components/
    │   ├── buttons.css       // Button components
    │   ├── cards.css         // Card components
    │   ├── forms.css         // Form components
    │   └── navigation.css    // Navigation components
    ├── themes/
    │   ├── light.css         // Light theme variables
    │   ├── dark.css          // Dark theme variables
    │   └── high-contrast.css // Accessibility theme
    └── utilities/
        ├── spacing.css       // Margin, padding utilities
        ├── colors.css        // Color utilities
        └── typography.css    // Font size, weight utilities
```

## 📖 Core Concepts

### 1. CSS Loading Order

CSS sources are loaded and applied in this order:

1. **CSS Files** (in the order specified)
2. **CSS Links** (external URLs)
3. **Inline CSS** (highest precedence)

```javascript
const html = await renderHTML(App(), {
  // 1. Loaded first
  cssFiles: [
    './styles/reset.css',      // CSS reset
    './styles/base.css',       // Base styles
    './styles/components.css'  // Component styles
  ],
  
  // 2. Loaded second
  cssLinks: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap'
  ],
  
  // 3. Loaded last (highest precedence)
  cssInline: `
    .title {
      color: #e74c3c !important;  /* Override previous definitions */
    }
  `
});
```

### 2. Automatic HTML Structure

When CSS is provided, Coherent.js ensures proper HTML structure:

```javascript
// Simple component without HTML structure
const SimpleComponent = () => ({
  div: { className: 'content', text: 'Hello World' }
});

const html = await renderHTML(SimpleComponent(), {
  cssFiles: ['./styles/main.css']
});

// Automatically generates:
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1">
//   <style>/* CSS content */</style>
// </head>
// <body>
//   <div class="content">Hello World</div>
// </body>
// </html>
```

### 3. CSS Integration with Existing Head

For components that already include a `<head>` element:

```javascript
const FullPageComponent = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'My App' } },
            { meta: { name: 'description', content: 'My application' } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'Welcome!' } }
          ]
        }
      }
    ]
  }
});

const html = await renderHTML(FullPageComponent(), {
  cssFiles: ['./styles/app.css']
});

// CSS is injected into the existing <head> before </head>
```

## 🛠 API Reference

### renderHTML(component, options)

Renders a component to complete HTML with CSS support.

**Options:**
- `cssFiles` (Array<string>): CSS file paths to load
- `cssLinks` (Array<string>): External CSS URLs  
- `cssInline` (string): Inline CSS content
- `cssMinify` (boolean): Minify CSS content
- `minify` (boolean): Minify HTML output

```javascript
import { renderHTML } from 'coherent';

const html = await renderHTML(MyComponent(), {
  cssFiles: ['./styles/main.css'],
  cssLinks: ['https://fonts.googleapis.com/css2?family=Inter'],
  cssInline: '.custom { color: red; }',
  cssMinify: true,
  minify: true
});
```

### renderHTMLSync(component, options)

Synchronous version for CSS links and inline styles only:

```javascript
import { renderHTMLSync } from 'coherent';

// Works synchronously (no CSS files)
const html = renderHTMLSync(MyComponent(), {
  cssLinks: ['https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'],
  cssInline: '.app { font-family: Inter; }'
});

// Returns Promise if CSS files detected (with warning)
const htmlPromise = renderHTMLSync(MyComponent(), {
  cssFiles: ['./styles/main.css']  // Triggers warning
});
```

### render(component, options)

Semantic alias for `renderHTML()`:

```javascript
import { render } from 'coherent';

const html = await render(MyComponent(), {
  cssFiles: ['./styles/main.css']
});
```

## 💡 Advanced Usage

### 1. CSS Manager Customization

Create custom CSS managers for specific needs:

```javascript
import { createCSSManager } from 'coherent';

const customCSSManager = createCSSManager({
  baseDir: './src/assets/styles',
  enableCache: true,
  minify: process.env.NODE_ENV === 'production'
});

// Use custom manager
const css = await customCSSManager.loadCSSFile('components/buttons.css');
const minified = customCSSManager.minifyCSS(css);
```

### 2. CSS Preprocessing Integration

Integrate with CSS preprocessors:

```javascript
import { renderHTML } from 'coherent';
import { compileSass, compilePostCSS } from './css-processors';

// Preprocess CSS files before loading
const processedCSS = await Promise.all([
  compileSass('./styles/main.scss'),
  compilePostCSS('./styles/components.css')
]);

// Write processed CSS to temporary files or use inline
const html = await renderHTML(App(), {
  cssInline: processedCSS.join('\n')
});
```

### 3. Dynamic CSS Loading

Load CSS conditionally based on component properties:

```javascript
const ThemeableApp = ({ theme = 'light', features = [] }) => {
  const cssFiles = [
    './styles/base.css',
    `./styles/themes/${theme}.css`
  ];
  
  // Add feature-specific styles
  if (features.includes('animations')) {
    cssFiles.push('./styles/animations.css');
  }
  if (features.includes('responsive')) {
    cssFiles.push('./styles/responsive.css');
  }
  
  return renderHTML(AppComponent({ theme }), {
    cssFiles,
    cssMinify: true
  });
};

// Usage
const html = await ThemeableApp({ 
  theme: 'dark', 
  features: ['animations', 'responsive'] 
});
```

### 4. CSS Modules Integration

Work with CSS Modules for scoped styles:

```javascript
// styles/Button.module.css
/*
.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.primary {
  background: #007bff;
  color: white;
}

.secondary {
  background: #6c757d;
  color: white;
}
*/

// Component using CSS Modules
import styles from './styles/Button.module.css';

const Button = ({ variant = 'primary', children, ...props }) => ({
  button: {
    className: `${styles.button} ${styles[variant]}`,
    ...props,
    children: Array.isArray(children) ? children : [children]
  }
});

const App = () => ({
  div: {
    children: [
      Button({ children: [{ text: 'Primary Button' }] }),
      Button({ variant: 'secondary', children: [{ text: 'Secondary Button' }] })
    ]
  }
});

// Load the CSS Module file
const html = await renderHTML(App(), {
  cssFiles: ['./styles/Button.module.css']
});
```

## 🎨 Styling Patterns

### 1. Component-Based CSS Organization

```css
/* components/Card.css */
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.card__header {
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.card__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.card__body {
  line-height: 1.6;
}

.card__footer {
  border-top: 1px solid #eee;
  padding-top: 1rem;
  margin-top: 1rem;
}
```

```javascript
// components/Card.js
const Card = ({ title, children, footer }) => ({
  div: {
    className: 'card',
    children: [
      title ? {
        div: {
          className: 'card__header',
          children: [
            { h3: { className: 'card__title', text: title } }
          ]
        }
      } : null,
      {
        div: {
          className: 'card__body',
          children: Array.isArray(children) ? children : [children]
        }
      },
      footer ? {
        div: {
          className: 'card__footer',
          children: Array.isArray(footer) ? footer : [footer]
        }
      } : null
    ].filter(Boolean)
  }
});
```

### 2. Utility-First CSS

```css
/* utilities/spacing.css */
.m-0 { margin: 0; }
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 1rem; }
.m-4 { margin: 1.5rem; }

.p-0 { padding: 0; }
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 1rem; }
.p-4 { padding: 1.5rem; }

/* utilities/colors.css */
.text-primary { color: #007bff; }
.text-secondary { color: #6c757d; }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }

.bg-primary { background-color: #007bff; }
.bg-light { background-color: #f8f9fa; }
.bg-dark { background-color: #343a40; }
```

```javascript
const UtilityComponent = () => ({
  div: {
    className: 'bg-light p-4 m-2',
    children: [
      { h2: { className: 'text-primary m-0', text: 'Utility Classes' } },
      { p: { className: 'text-secondary', text: 'Using utility-first approach' } }
    ]
  }
});

const html = await renderHTML(UtilityComponent(), {
  cssFiles: [
    './utilities/spacing.css',
    './utilities/colors.css'
  ]
});
```

### 3. CSS Custom Properties (Variables)

```css
/* themes/variables.css */
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 3rem;
  
  /* Borders */
  --border-radius: 0.375rem;
  --border-color: #dee2e6;
  
  /* Shadows */
  --shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
}

/* Dark theme overrides */
[data-theme="dark"] {
  --color-primary: #0d6efd;
  --color-text: #fff;
  --color-background: #212529;
  --border-color: #495057;
}

/* Component using variables */
.themed-button {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family-base);
  box-shadow: var(--shadow-sm);
}
```

## 🏗 Production Considerations

### 1. CSS Optimization

```javascript
const html = await renderHTML(App(), {
  cssFiles: [
    './styles/main.css',
    './styles/components.css'
  ],
  cssMinify: process.env.NODE_ENV === 'production',
  minify: process.env.NODE_ENV === 'production'
});
```

### 2. CSS Purging (Unused CSS Removal)

```javascript
import { purgecss } from '@fullhuman/postcss-purgecss';

const purgeCSSConfig = {
  content: ['./src/**/*.js'],
  css: ['./styles/**/*.css']
};

// Integrate with build process
const purgedCSS = await purgecss(purgeCSSConfig);
```

### 3. CSS Bundle Splitting

```javascript
// Split CSS by routes/features
const getPageCSS = (page) => {
  const baseCSS = ['./styles/base.css', './styles/components.css'];
  const pageCSS = {
    home: ['./styles/pages/home.css'],
    about: ['./styles/pages/about.css'],
    contact: ['./styles/pages/contact.css', './styles/forms.css']
  };
  
  return [...baseCSS, ...(pageCSS[page] || [])];
};

// Usage
const html = await renderHTML(HomePage(), {
  cssFiles: getPageCSS('home')
});
```

## 🧪 Testing CSS Integration

### Test CSS Loading

```javascript
import { renderHTML } from 'coherent';

describe('CSS Integration', () => {
  it('should load CSS files correctly', async () => {
    const html = await renderHTML(TestComponent(), {
      cssFiles: ['./test-styles.css']
    });
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).toContain('.test-class');
  });
  
  it('should maintain CSS order', async () => {
    const html = await renderHTML(TestComponent(), {
      cssFiles: ['./base.css', './override.css'],
      cssInline: '.final-override { color: red; }'
    });
    
    const content = html.toString();
    const baseIndex = content.indexOf('base-style');
    const overrideIndex = content.indexOf('override-style');
    const inlineIndex = content.indexOf('final-override');
    
    expect(baseIndex).toBeLessThan(overrideIndex);
    expect(overrideIndex).toBeLessThan(inlineIndex);
  });
});
```

## 🔧 Troubleshooting

### Common Issues

1. **CSS File Not Found**
   ```javascript
   // Error: ENOENT: no such file or directory
   // Solution: Check file paths and ensure files exist
   const html = await renderHTML(App(), {
     cssFiles: ['./styles/main.css'] // Verify this path exists
   });
   ```

2. **CSS Not Applying**
   ```javascript
   // Issue: CSS loaded but styles not applying
   // Solution: Check CSS selectors match component classes
   const Component = () => ({
     div: { 
       className: 'my-component', // Must match CSS selector
       text: 'Content' 
     }
   });
   ```

3. **Async/Sync Mismatch**
   ```javascript
   // Issue: Using renderHTMLSync with CSS files
   // Solution: Use renderHTML for CSS files
   const html = await renderHTML(App(), {  // Use async version
     cssFiles: ['./styles/main.css']
   });
   ```

### Performance Tips

1. **Enable CSS Caching**
   ```javascript
   import { createCSSManager } from 'coherent';
   
   const cssManager = createCSSManager({
     enableCache: true,  // Cache CSS files in memory
     minify: true       // Minify CSS for production
   });
   ```

2. **Optimize CSS File Structure**
   - Keep CSS files small and focused
   - Use CSS imports sparingly
   - Consider CSS bundling for production

3. **Monitor Performance**
   ```javascript
   const startTime = performance.now();
   const html = await renderHTML(App(), {
     cssFiles: ['./large-file.css']
   });
   const endTime = performance.now();
   
   console.log(`CSS rendering took ${endTime - startTime}ms`);
   ```

## 📚 Related Documentation

- [Styling Components Guide](./components/styling-components.md)
- [API Reference](./api-reference.md)
- [Performance Optimizations](./performance-optimizations.md)
- [Component System](./components/basic-components.md)

---

The CSS file integration system in Coherent.js provides powerful and flexible styling options while maintaining the framework's commitment to pure JavaScript objects and developer experience. Use this guide to implement scalable and maintainable styling solutions for your applications.