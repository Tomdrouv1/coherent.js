# 🚀 Coherent.js

Pure object-based rendering framework for server-side HTML generation. No JSX, no templates - just JavaScript objects that render to clean, performant HTML.

## ✨ Features

- **Pure JavaScript Objects**: No special syntax or compilation required
- **Server-Side Optimized**: Built specifically for SSR performance
- **Component System**: Function-based components with context passing
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Streaming Support**: Render large documents efficiently with streaming
- **Memory Efficient**: Smart caching and object pooling
- **Type-Safe**: Full TypeScript support (coming soon)
- **Zero Dependencies**: Lightweight core with no external dependencies

## 🚀 Quick Start

### Installation

```bash
npm install coherent-framework
```

### Basic Usage

```javascript
import { renderToString } from 'coherent-framework';

const MyComponent = () => ({
  div: {
    className: 'my-component',
    children: [
      { h1: { text: 'Hello Coherent.js!' } },
      { p: { text: 'This is a simple component.' } }
    ]
  }
});

console.log(renderToString(MyComponent()));
```

For more examples, see the [examples directory](examples/).

### Function Components

```javascript
const Greeting = (context) => ({
  div: {
    className: 'greeting',
    children: [
      { h1: { text: `Hello, ${context.name}!` } },
      { p: { text: `You have ${context.notifications} notifications` } }
    ]
  }
});

const html = renderToString(Greeting, { name: 'Alice', notifications: 3 });
```

### State Management

```javascript
import { withState } from 'coherent-framework';

const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { 
        button: { 
          text: 'Increment', 
          onclick: () => setState({ count: state.count + 1 })
        }
      }
    ]
  }
}));
```

### List Rendering

```javascript
import { forEach } from 'coherent-framework';

const TodoList = (context) => ({
  ul: {
    children: forEach(context.todos, (todo) => ({
      li: { 
        text: todo.text,
        className: todo.completed ? 'completed' : 'pending'
      }
    }))
  }
});
```

### Conditional Rendering

```javascript
import { when } from 'coherent-framework';

const UserProfile = (context) => ({
  div: {
    children: [
      when(context.user,
        { p: { text: `Welcome, ${context.user.name}!` } },
        { p: { text: 'Please log in' } }
      )
    ]
  }
});
```

## 🎯 Performance

### Built-in Monitoring

```javascript
import { performanceMonitor } from 'coherent-framework';

performanceMonitor.start();

// Your rendering code here

const stats = performanceMonitor.generateReport();
console.log(stats);
```

### Memoization

```javascript
import { memo } from 'coherent-framework';

const ExpensiveComponent = memo(
  (context) => {
    // Expensive computation here
    return { div: { text: computeResult(context.data) } };
  },
  (context) => context.data.id // Custom key function
);
```

### Streaming for Large Documents

```javascript
import { renderToStream } from 'coherent-framework';

const stream = renderToStream(largeComponent, context);

stream.on('data', (chunk) => {
  response.write(chunk);
});

stream.on('end', () => {
  response.end();
});
```

## 📚 Documentation

- [API Reference](docs/api-reference.md) - Complete documentation of all Coherent.js APIs
- [Migration Guide](docs/migration-guide.md) - Instructions for migrating from React, template engines, and string-based frameworks
- [Examples](examples/) - Practical examples demonstrating various features

## 🏗️ Object Structure

Coherent.js is built around pure JavaScript objects that represent HTML structures:

```javascript
// Basic structure
{
  tagName: {
    attribute: 'value',
    className: 'css-class',
    text: 'Simple text content',
    html: '<raw>HTML content</raw>',
    children: [/* Array of child elements */]
  }
}
```

### Special Properties

- `text` - Escaped text content
- `html` - Unescaped HTML content
- `children` - Array of child elements
- `className` - Converted to `class` attribute
- `htmlFor` - Converted to `for` attribute

### Examples

```javascript
// Simple element with text
{ h1: { text: 'Page Title' } }
// → <h1>Page Title</h1>

// Element with attributes
{ input: { type: 'text', placeholder: 'Enter name', required: true } }
// → <input type="text" placeholder="Enter name" required>

// Nested elements
{
  div: {
    className: 'container',
    children: [
      { h2: { text: 'Section Title' } },
      { p: { text: 'Some content here' } }
    ]
  }
}
// → <div class="container"><h2>Section Title</h2><p>Some content here</p></div>

// Raw HTML (use with caution!)
{ div: { html: '<strong>Bold</strong> text' } }
// → <div><strong>Bold</strong> text</div>
```

## 🛠️ Development

### Running the Demo

```bash
git clone https://github.com/your-username/coherent-js.git
cd coherent-js
npm install
npm run demo
```

### Project Structure

```
coherent-framework/
├── src/
│   ├── coherent.js              # Main entry point
│   ├── core/                    # Core utilities and helpers
│   │   ├── object-utils.js
│   │   ├── html-utils.js
│   │   └── validation.js
│   ├── rendering/               # Rendering engines
│   │   ├── html-renderer.js
│   │   └── streaming-renderer.js
│   ├── performance/             # Performance monitoring
│   │   └── monitor.js
│   ├── components/              # Component system
│   │   └── component-system.js
│   ├── client/                  # Client-side hydration
│   │   └── client.js
│   ├── express/                 # Express.js integration
│   │   └── index.js
│   ├── fastify/                 # Fastify integration
│   │   └── index.js
│   └── nextjs/                  # Next.js integration
│       └── index.js
├── examples/                    # Example applications
│   ├── basic-usage.js
│   ├── advanced-features.js
│   ├── express-integration.js
│   ├── fastify-integration.js
│   ├── nextjs-integration.js
│   ├── performance-test.js
│   └── streaming-test.js
├── docs/                        # Documentation
│   ├── api-reference.md
│   └── migration-guide.md
├── tests/                       # Test suite
│   └── rendering.test.js
├── scripts/                     # Development scripts
│   └── dev-server.js
├── package.json
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## 🎯 Why Choose Coherent.js?

### vs JSX/React SSR
- ✅ **No build step required** - Pure JavaScript, no compilation
- ✅ **Smaller bundle size** - Minimal overhead, maximum performance
- ✅ **Server-optimized** - Built specifically for SSR from ground up
- ✅ **Better debugging** - Full object visibility and inspection

### vs Template Engines (Handlebars, Mustache, etc.)
- ✅ **Type-safe with IDE support** - Full autocomplete and error checking
- ✅ **Component composition** - Reusable, composable components
- ✅ **Performance monitoring** - Built-in optimization tools
- ✅ **Streaming support** - Handle large documents efficiently

### vs String Concatenation/Template Literals
- ✅ **Automatic HTML escaping** - Built-in XSS protection
- ✅ **Structured, maintainable code** - Clear object hierarchy
- ✅ **Component reusability** - DRY principle enforcement
- ✅ **Performance optimization** - Smart caching and memoization

## 🔒 Security

Coherent.js includes built-in security features:

- **Automatic HTML escaping** for all text content
- **XSS protection** by default for user-generated content
- **Safe attribute handling** with proper escaping
- **Void element validation** to prevent malformed HTML

```javascript
// This is automatically escaped
{ p: { text: '<script>alert("xss")</script>' } }
// → <p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>

// Only use 'html' property for trusted content
{ div: { html: trustedHtmlString } }
```

## 🚀 Performance Benchmarks

Coherent.js is designed for speed:

- **~2-5ms** average render time for typical components
- **Sub-millisecond** rendering for cached components
- **Memory efficient** with automatic garbage collection
- **Streaming support** for large documents without memory issues

```javascript
// Example performance monitoring output
{
  totalRenders: 1247,
  averageRenderTime: 2.3,
  cacheHitRate: 78.5,
  memoryEfficiency: 94.2,
  recommendations: [
    {
      type: 'caching_opportunity',
      component: 'UserProfile',
      potentialSavings: '15ms per render'
    }
  ]
}
```

## 🗺️ Roadmap

### Phase 1 (Completed)
- [x] Core object-to-HTML rendering
- [x] Performance monitoring system
- [x] Streaming support
- [x] Component utilities (memo, compose, etc.)

### Phase 2 (Current Focus)
- [x] TypeScript definitions - Full type safety
- [x] Client-side hydration - Progressive enhancement
- [x] Hot reload development server - Faster development
- [x] Framework integrations - Express, Fastify, Next.js adapters
- [x] Comprehensive API documentation
- [x] Migration guides and examples
- [ ] Prepare for npm publication
- [ ] Collect early user/developer feedback

### Phase 3 (Future)
- [ ] IDE plugins - Syntax highlighting and autocomplete
- [ ] Component library ecosystem - Reusable UI components
- [ ] Advanced optimizations - Tree shaking, code splitting
- [ ] Testing utilities - Component testing framework

### Phase 3 (Future)
- [ ] **IDE plugins** - Syntax highlighting and autocomplete
- [ ] **Component library ecosystem** - Reusable UI components
- [ ] **Advanced optimizations** - Tree shaking, code splitting
- [ ] **Testing utilities** - Component testing framework

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** and add tests
4. **Run the demo**: `npm run demo` to ensure everything works
5. **Submit a pull request**

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation for API changes
- Performance test significant changes

### Issues and Discussions

- 🐛 **Bug reports**: Use GitHub Issues
- 💡 **Feature requests**: Start a GitHub Discussion
- ❓ **Questions**: Check existing issues or start a discussion

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: This README and code examples
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Email**: your-email@example.com (for security issues)

---

<div align="center">

**Coherent.js** - Pure objects, pure performance, pure simplicity. 🚀

[Get Started](#-quick-start) • [API Reference](docs/api-reference.md) • [Examples](examples/) • [Contribute](#-contributing)

</div>
