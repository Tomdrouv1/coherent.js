# Shared Rendering Utilities

**Package:** `@coherentjs/core`  
**Module:** `/src/utils/render-utils.js`  
**Since:** v1.1.0

## Overview

The shared rendering utilities provide a centralized, DRY-compliant approach to rendering Coherent.js components across all framework integrations (Express, Fastify, Koa, Next.js). These utilities eliminate code duplication and ensure consistent rendering behavior.

## Why Shared Utilities?

Prior to v1.1.0, each framework integration had its own rendering logic, leading to:
- ~200 lines of duplicate code
- Inconsistent behavior across frameworks
- Difficult maintenance and bug fixes

The shared utilities solve these problems by providing a single source of truth for rendering operations.

---

## API Reference

### `renderWithMonitoring(component, options)`

Renders a component with optional performance monitoring.

**Parameters:**
- `component` (Object) - Coherent.js component to render
- `options` (Object) - Rendering options
  - `enablePerformanceMonitoring` (Boolean) - Enable performance tracking (default: `false`)

**Returns:** `string` - Rendered HTML

**Example:**
```javascript
import { renderWithMonitoring } from '@coherentjs/core/utils/render-utils';

const component = {
  div: {
    children: [
      { h1: { text: 'Hello World' } }
    ]
  }
};

// Without monitoring
const html = renderWithMonitoring(component);

// With monitoring
const htmlWithStats = renderWithMonitoring(component, {
  enablePerformanceMonitoring: true
});
```

**Performance Monitoring:**
When enabled, this function:
1. Starts a performance timer
2. Renders the component
3. Records render time and metrics
4. Returns the HTML

Access metrics via `performanceMonitor.getStats()`.

---

### `renderWithTemplate(component, options)`

Renders a component and applies an HTML template.

**Parameters:**
- `component` (Object) - Coherent.js component to render
- `options` (Object) - Rendering options
  - `enablePerformanceMonitoring` (Boolean) - Enable performance tracking
  - `template` (String) - HTML template with `{{content}}` placeholder (default: `'<!DOCTYPE html>\n{{content}}'`)

**Returns:** `string` - Final HTML with template applied

**Example:**
```javascript
import { renderWithTemplate } from '@coherentjs/core/utils/render-utils';

const component = {
  div: { text: 'Page content' }
};

// Default template
const html = renderWithTemplate(component);
// Output: <!DOCTYPE html>\n<div>Page content</div>

// Custom template
const customHtml = renderWithTemplate(component, {
  template: `
    <!DOCTYPE html>
    <html>
      <head><title>My App</title></head>
      <body>{{content}}</body>
    </html>
  `
});
```

**Template Placeholders:**
- `{{content}}` - Required placeholder for component HTML

---

### `renderComponentFactory(componentFactory, factoryArgs, options)`

Handles component creation, rendering, and error handling for framework integrations.

**Parameters:**
- `componentFactory` (Function) - Function that creates a component
- `factoryArgs` (Array) - Arguments to pass to the component factory
- `options` (Object) - Rendering options
  - `enablePerformanceMonitoring` (Boolean) - Enable performance tracking
  - `template` (String) - HTML template

**Returns:** `Promise<string>` - Rendered HTML

**Throws:** `Error` if component factory returns null/undefined or rendering fails

**Example:**
```javascript
import { renderComponentFactory } from '@coherentjs/core/utils/render-utils';

// Component factory
const createUserProfile = (req, res) => ({
  div: {
    children: [
      { h1: { text: `User: ${req.params.id}` } },
      { p: { text: 'Profile information' } }
    ]
  }
});

// In Express route
app.get('/user/:id', async (req, res) => {
  try {
    const html = await renderComponentFactory(
      createUserProfile,
      [req, res],
      {
        enablePerformanceMonitoring: true,
        template: '<!DOCTYPE html>\n<html><body>{{content}}</body></html>'
      }
    );
    
    res.send(html);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
```

**Error Handling:**
- Validates component factory return value
- Catches rendering errors
- Provides meaningful error messages

---

### `isCoherentComponent(obj)`

Checks if an object is a valid Coherent.js component.

**Parameters:**
- `obj` (any) - Object to check

**Returns:** `boolean` - True if object is a Coherent.js component

**Example:**
```javascript
import { isCoherentComponent } from '@coherentjs/core/utils/render-utils';

// Valid component
const component = { div: { text: 'Hello' } };
console.log(isCoherentComponent(component)); // true

// Invalid - array
console.log(isCoherentComponent([1, 2, 3])); // false

// Invalid - null
console.log(isCoherentComponent(null)); // false

// Invalid - primitive
console.log(isCoherentComponent('string')); // false
```

**Validation Rules:**
A valid Coherent.js component is:
- A plain object (not null, not an array)
- Has at least one property
- Typically has a single key representing an HTML tag

---

### `createErrorResponse(error, context)`

Creates a standardized error response for framework integrations.

**Parameters:**
- `error` (Error) - The error that occurred
- `context` (String) - Context where the error occurred (default: `'rendering'`)

**Returns:** `Object` - Error response object

**Example:**
```javascript
import { createErrorResponse } from '@coherentjs/core/utils/render-utils';

try {
  // Some rendering operation
  throw new Error('Component not found');
} catch (error) {
  const errorResponse = createErrorResponse(error, 'component-factory');
  
  console.log(errorResponse);
  // {
  //   error: 'Internal Server Error',
  //   message: 'Component not found',
  //   context: 'component-factory',
  //   timestamp: '2025-10-18T10:00:00.000Z'
  // }
  
  res.status(500).json(errorResponse);
}
```

**Response Format:**
```typescript
{
  error: string;        // Error type
  message: string;      // Error message
  context: string;      // Where error occurred
  timestamp: string;    // ISO timestamp
}
```

---

## Usage in Framework Integrations

### Express Integration

```javascript
import express from 'express';
import { 
  renderWithTemplate, 
  renderComponentFactory 
} from '@coherentjs/core/utils/render-utils';

const app = express();

// Simple route
app.get('/', (req, res) => {
  const component = { div: { text: 'Home' } };
  const html = renderWithTemplate(component);
  res.send(html);
});

// Component factory route
app.get('/user/:id', async (req, res, next) => {
  try {
    const html = await renderComponentFactory(
      (req) => ({ div: { text: `User ${req.params.id}` } }),
      [req],
      { enablePerformanceMonitoring: true }
    );
    res.send(html);
  } catch (error) {
    next(error);
  }
});
```

### Fastify Integration

```javascript
import Fastify from 'fastify';
import { renderWithTemplate } from '@coherentjs/core/utils/render-utils';

const fastify = Fastify();

fastify.get('/', async (request, reply) => {
  const component = { div: { text: 'Home' } };
  const html = renderWithTemplate(component, {
    template: '<!DOCTYPE html>\n<html><body>{{content}}</body></html>'
  });
  
  reply.type('text/html').send(html);
});
```

### Koa Integration

```javascript
import Koa from 'koa';
import { renderWithTemplate } from '@coherentjs/core/utils/render-utils';

const app = new Koa();

app.use(async (ctx) => {
  const component = { div: { text: 'Home' } };
  ctx.type = 'text/html';
  ctx.body = renderWithTemplate(component);
});
```

### Next.js Integration

```javascript
import { renderComponentFactory } from '@coherentjs/core/utils/render-utils';

export default async function handler(req, res) {
  const html = await renderComponentFactory(
    () => ({ div: { text: 'Next.js Page' } }),
    [],
    { enablePerformanceMonitoring: true }
  );
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
```

---

## Performance Considerations

### Monitoring Overhead

Performance monitoring adds minimal overhead (~1-2ms per render):

```javascript
// Without monitoring
const html1 = renderWithMonitoring(component);
// ~10ms

// With monitoring
const html2 = renderWithMonitoring(component, {
  enablePerformanceMonitoring: true
});
// ~11-12ms
```

### Template Caching

Templates are not cached by default. For high-traffic applications, consider:

```javascript
// Cache template outside request handler
const template = `
  <!DOCTYPE html>
  <html>
    <head><title>My App</title></head>
    <body>{{content}}</body>
  </html>
`;

app.get('/', (req, res) => {
  const html = renderWithTemplate(component, { template });
  res.send(html);
});
```

---

## Best Practices

### 1. Use Appropriate Utility

```javascript
// ✅ Good: Simple rendering
const html = renderWithMonitoring(component);

// ✅ Good: With template
const html = renderWithTemplate(component, { template });

// ✅ Good: Component factory
const html = await renderComponentFactory(factory, args, options);

// ❌ Bad: Mixing concerns
const html = render(component);
// Then manually adding template...
```

### 2. Enable Monitoring in Development

```javascript
const options = {
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
};

const html = renderWithTemplate(component, options);
```

### 3. Validate Components

```javascript
import { isCoherentComponent } from '@coherentjs/core/utils/render-utils';

if (!isCoherentComponent(data)) {
  throw new Error('Invalid component structure');
}

const html = renderWithTemplate(data);
```

### 4. Handle Errors Gracefully

```javascript
import { createErrorResponse } from '@coherentjs/core/utils/render-utils';

try {
  const html = await renderComponentFactory(factory, args);
  res.send(html);
} catch (error) {
  const errorResponse = createErrorResponse(error, 'user-profile');
  res.status(500).json(errorResponse);
}
```

---

## Migration Guide

### From Direct render

**Before (v1.0.x):**
```javascript
import { render } from '@coherentjs/core';
import { performanceMonitor } from '@coherentjs/core';

let html;
if (enableMonitoring) {
  const renderId = performanceMonitor.startRender();
  html = render(component);
  performanceMonitor.endRender(renderId);
} else {
  html = render(component);
}

const finalHtml = template.replace('{{content}}', html);
res.send(finalHtml);
```

**After (v1.1.0+):**
```javascript
import { renderWithTemplate } from '@coherentjs/core/utils/render-utils';

const html = renderWithTemplate(component, {
  enablePerformanceMonitoring: enableMonitoring,
  template
});

res.send(html);
```

**Benefits:**
- 15 lines → 7 lines
- No duplicate code
- Consistent behavior
- Easier to maintain

---

## Troubleshooting

### Component Not Rendering

**Problem:** Component returns empty string

**Solution:** Check if component is valid
```javascript
import { isCoherentComponent } from '@coherentjs/core/utils/render-utils';

if (!isCoherentComponent(component)) {
  console.error('Invalid component:', component);
}
```

### Template Not Applied

**Problem:** `{{content}}` placeholder not replaced

**Solution:** Ensure template contains `{{content}}`
```javascript
// ❌ Bad
const template = '<html><body></body></html>';

// ✅ Good
const template = '<html><body>{{content}}</body></html>';
```

### Performance Monitoring Not Working

**Problem:** No metrics collected

**Solution:** Ensure monitoring is enabled and check stats
```javascript
import { performanceMonitor } from '@coherentjs/core';

renderWithMonitoring(component, {
  enablePerformanceMonitoring: true
});

const stats = performanceMonitor.getStats();
console.log('Render time:', stats.averageRenderTime);
```

---

## See Also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Framework architecture
- [API Reference](../api-reference.md) - Complete API documentation
- [Framework Integrations](../framework-integrations.md) - Integration guides
- [Performance Optimizations](../performance-optimizations.md) - Performance tips

---

**Version:** 1.1.0+  
**Last Updated:** October 18, 2025
