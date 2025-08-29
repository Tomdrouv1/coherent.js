# @coherentjs/cli

Command-line interface for Coherent.js projects. Scaffold new applications, generate components, and streamline your development workflow.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @coherentjs/cli

# Create a new project
coherent create my-app

# Generate components
coherent generate component Button

# Start development server
coherent dev
```

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @coherentjs/cli
# or
yarn global add @coherentjs/cli
# or  
pnpm add -g @coherentjs/cli
```

### Local Installation

```bash
npm install --save-dev @coherentjs/cli
# or
yarn add --dev @coherentjs/cli
# or
pnpm add -D @coherentjs/cli

# Use with npx
npx coherent create my-app
```

## 🛠️ Commands

### `coherent create <name>`

Create a new Coherent.js project with scaffolding.

```bash
coherent create my-app
coherent create my-app --template express
coherent create my-app --skip-install --skip-git
```

**Options:**
- `-t, --template <template>` - Project template (basic, fullstack, express, fastify, components)
- `--skip-install` - Skip npm install
- `--skip-git` - Skip git initialization

**Available Templates:**
- `basic` - Simple Coherent.js app with routing
- `fullstack` - API + SSR with database integration  
- `express` - Coherent.js with Express.js
- `fastify` - Coherent.js with Fastify
- `components` - Reusable component library

### `coherent generate <type> <name>`

Generate components, pages, and API routes.

```bash
coherent generate component Button
coherent generate page Home
coherent generate api users
coherent g component UserProfile --template interactive
```

**Aliases:** `g`, `gen`

**Types:**
- `component` (aliases: `comp`, `c`) - UI component
- `page` (alias: `p`) - Full page with routing  
- `api` (aliases: `route`, `r`) - API endpoint
- `model` (alias: `m`) - Database model
- `middleware` (alias: `mw`) - Express/Fastify middleware

**Options:**
- `-p, --path <path>` - Custom output path
- `-t, --template <template>` - Template to use
- `--skip-test` - Skip generating test file
- `--skip-story` - Skip generating story file

**Component Templates:**
- `basic` - Simple component with props
- `functional` - Component with business logic
- `interactive` - Component with state management
- `layout` - Page layout component

**Page Templates:**
- `basic` - Standard page with header/footer
- `dashboard` - Dashboard with stats grid
- `form` - Form page with validation
- `list` - List page with pagination
- `detail` - Detail page for single items

**API Templates:**
- `rest` - RESTful API with CRUD operations
- `rpc` - JSON-RPC API
- `graphql` - GraphQL resolver (coming soon)
- `crud` - Full CRUD API with validation

### `coherent build`

Build the project for production.

```bash
coherent build
coherent build --analyze
coherent build --no-minify
```

**Options:**
- `-w, --watch` - Watch for changes
- `--analyze` - Analyze bundle size
- `--no-minify` - Disable minification
- `--no-optimize` - Disable optimizations

### `coherent dev`

Start development server with hot reload.

```bash
coherent dev
coherent dev --port 8080
coherent dev --host 0.0.0.0 --open
```

**Options:**
- `-p, --port <port>` - Port number (default: 3000)
- `-h, --host <host>` - Host address (default: localhost)
- `--open` - Open browser automatically
- `--no-hmr` - Disable hot module replacement

## 📁 Generated Project Structure

```
my-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Button.js
│   │   └── Button.test.js
│   ├── pages/              # Page components  
│   │   ├── Home.js
│   │   └── Home.test.js
│   ├── api/                # API routes
│   │   ├── users.js
│   │   └── users.test.js
│   ├── utils/              # Utility functions
│   └── index.js            # Main entry point
├── public/                 # Static assets
├── tests/                  # Test files
├── package.json
├── README.md
└── .gitignore
```

## 🎨 Generated Component Example

```javascript
// src/components/Button.js
import { createComponent } from '@coherentjs/core';

export const Button = createComponent(({ 
  text = 'Click me',
  onClick,
  className = '',
  disabled = false 
}) => ({
  button: {
    className: `btn ${className}`.trim(),
    onclick: onClick,
    disabled,
    text
  }
}));

// Usage
Button({
  text: 'Get Started',
  onClick: () => console.log('Clicked!'),
  className: 'btn-primary'
})
```

## 📄 Generated Page Example

```javascript
// src/pages/Home.js
import { createComponent } from '@coherentjs/core';

export const Home = createComponent(({ title = 'Home' }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } }
          ]
        }
      },
      {
        body: {
          children: [
            {
              main: {
                className: 'home-page',
                children: [
                  { h1: { text: 'Welcome Home!' } },
                  { p: { text: 'This is your generated home page.' } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}));
```

## 🔌 Generated API Example

```javascript
// src/api/users.js
import { createApiRouter, withValidation } from '@coherentjs/api';

const usersAPI = createApiRouter();

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// GET /api/users
usersAPI.get('/', (req, res) => {
  return { users: [] };
});

// POST /api/users
usersAPI.post('/', 
  withValidation(userSchema),
  (req, res) => {
    const { name, email } = req.body;
    return { user: { id: 1, name, email } };
  }
);

export default usersAPI;
```

## ⚙️ Configuration

The CLI automatically detects your project setup and adapts accordingly:

- **Package.json scripts** - Uses existing `dev`, `build`, `test` scripts
- **Build tools** - Supports Vite, Webpack, Rollup, esbuild
- **Frameworks** - Works with Express, Fastify, Next.js, Koa
- **Databases** - Generates appropriate models for your database

## 🧪 Testing

Generated components and pages include test files:

```javascript
// Button.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { renderToString } from '@coherentjs/core';
import { Button } from './Button.js';

test('Button renders correctly', () => {
  const component = Button({ text: 'Test' });
  const html = renderToString(component);
  
  assert(html.includes('Test'));
  assert(html.includes('<button'));
});
```

Run tests with:
```bash
npm test
# or if using the CLI
coherent test
```

## 📚 Examples

### Create a blog application

```bash
# Create project
coherent create my-blog --template fullstack

# Generate components
coherent g component ArticleCard
coherent g component CommentList  

# Generate pages
coherent g page Article --template detail
coherent g page Dashboard --template dashboard

# Generate API
coherent g api articles --template crud
coherent g api comments --template rest

# Start development
cd my-blog
coherent dev
```

### Create a component library

```bash
# Create project
coherent create ui-components --template components

# Generate components
coherent g component Button --template interactive
coherent g component Modal --template functional
coherent g component Form --template layout

# Build for distribution
coherent build --analyze
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
# Clone the repository
git clone https://github.com/Tomdrouv1/coherent.js.git
cd coherent.js/packages/cli

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the CLI
pnpm build

# Test locally
npm link
coherent --help
```

## 📝 License

MIT © [Coherent.js Team](https://github.com/Tomdrouv1/coherent.js)

## 🔗 Links

- [Coherent.js Documentation](https://github.com/Tomdrouv1/coherent.js)
- [API Reference](https://github.com/Tomdrouv1/coherent.js/blob/main/docs/api-reference.md)
- [Examples](https://github.com/Tomdrouv1/coherent.js/tree/main/examples)
- [Issues & Bug Reports](https://github.com/Tomdrouv1/coherent.js/issues)

---

**Happy coding with Coherent.js! 🚀**