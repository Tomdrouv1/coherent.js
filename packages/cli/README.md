# @coherent.js/cli

Command-line interface for Coherent.js projects. Scaffold new applications, generate components, and streamline your development workflow.

## 🚀 Quick Start

```bash
# Install globally
pnpm add -g @coherent.js/cli

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
pnpm add -g @coherent.js/cli
```

### Local Installation

```bash
pnpm add -D @coherent.js/cli

# Use with pnpm
pnpm exec coherent create my-app
```

## 🛠️ Commands

### `coherent create <name>`

Create a new Coherent.js project with scaffolding. The CLI provides an interactive setup with runtime selection, database configuration, and optional package selection.

```bash
coherent create my-app
coherent create my-app --template fullstack --runtime express --database sqlite
coherent create my-app --skip-install --skip-git
```

**Options:**
- `-t, --template <template>` - Project template (`basic` or `fullstack`)
- `--runtime <runtime>` - `built-in`, `express`, `fastify` or `koa`
- `--database <database>` - `postgres`, `mysql`, `sqlite` or `mongodb`
- `--auth <auth>` - `jwt` or `session`
- `--language <language>` - `javascript` or `typescript`
- `--skip-prompts` - Use the defaults instead of asking (automatic without a terminal)
- `--skip-install` - Skip npm install
- `--skip-git` - Skip git initialization

Unknown option values are rejected before anything is created. Project names must be a single lowercase npm-style name (`[a-z0-9][a-z0-9._-]*`). With `--auth`, the generated `.env` holds a random `JWT_SECRET` / `SESSION_SECRET`, the generated app refuses to start without it, and the `dev` / `start` scripts load `.env` (`node --env-file-if-exists=.env`); set the secret in every deployed environment.

**Available Templates:**
- `basic` - Simple Coherent.js app with routing (choose any runtime interactively)
- `fullstack` - API + SSR with database integration (includes runtime, database, and package selection)

**Interactive Setup:**

When you create a project, the CLI will guide you through:

1. **Runtime Selection** (all templates):
   - Built-in HTTP Server (Node.js http module)
   - Express (popular web framework)
   - Fastify (fast and low overhead)
   - Koa (next generation framework)

2. **Database Selection** (fullstack):
   - PostgreSQL
   - MySQL
   - SQLite
   - MongoDB
   - None

3. **Optional Packages** (all templates):
   - `@coherent.js/api` - API framework with validation & OpenAPI
   - `@coherent.js/database` - Database adapters and query builder
   - `@coherent.js/client` - Client-side hydration
   - `@coherent.js/i18n` - Internationalization
   - `@coherent.js/forms` - Form handling
   - `@coherent.js/devtools` - Development tools
   - `@coherent.js/seo` - SEO utilities
   - `@coherent.js/tooling/testing` - Testing helpers (subpath of `@coherent.js/tooling`)

4. **Authentication Scaffolding** (when database or API selected):
   - JWT Authentication (token-based)
   - Session Authentication (cookie-based)
   - None

**Example: Full Stack App**

```bash
coherent create my-app
# Template: Full Stack
# Runtime: Express
# Database: PostgreSQL
# Packages: api, client, i18n
# Auth: JWT

# Generated structure includes:
# - Express server setup
# - PostgreSQL configuration & models
# - API routes with validation
# - Client-side hydration setup
# - i18n configuration with example locales
# - JWT authentication middleware & routes
```

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
- `-f, --force` - Overwrite files that already exist (otherwise the command refuses and writes nothing)

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
- `-H, --host <host>` - Host address (default: localhost)
- `--open` - Open browser automatically (needs the optional `open` package installed)
- `--no-hmr` - Disable hot module replacement
- `--coherent` - Use the built-in dev server (HTTP + WebSocket HMR) instead of your `dev` script, Vite or webpack (a `coherent.config.js` / `coherent.config.mjs` also selects it)
- `--allowed-hosts <hosts>` - Built-in server only: comma-separated extra `Host` names to answer. It answers `localhost`, IP addresses and `--host` by default, serves only files inside the project (or its workspace), and refuses dotfiles with `403`

## 📁 Generated Project Structure

The structure varies based on your selections:

```
my-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Button.js
│   │   ├── HomePage.js
│   │   └── InteractiveCounter.js  (if client selected)
│   ├── pages/              # Page components
│   │   ├── Home.js
│   │   └── Home.test.js
│   ├── api/                # API routes (if API or auth selected)
│   │   ├── routes.js
│   │   └── auth.js         (if auth selected)
│   ├── db/                 # Database (if database selected)
│   │   ├── config.js
│   │   ├── index.js
│   │   └── models/
│   │       └── User.js
│   ├── middleware/         # Middleware (Express/Koa with auth)
│   │   └── auth.js
│   ├── plugins/            # Plugins (Fastify with auth)
│   │   └── auth.js
│   ├── i18n/               # i18n (if i18n selected)
│   │   ├── config.js
│   │   └── locales/
│   │       ├── en.json
│   │       ├── fr.json
│   │       └── es.json
│   ├── utils/              # Utility functions
│   │   ├── devtools.js     (if devtools selected)
│   │   └── seo.js          (if seo selected)
│   └── index.js            # Main entry point (runtime-specific)
├── public/                 # Static assets
│   └── js/
│       └── hydration.js    (if client selected)
├── data/                   # Data directory (if SQLite selected)
├── tests/                  # Test files
│   ├── basic.test.js
│   ├── helpers/            (if testing selected)
│   │   └── testing.js
│   └── components/         (if testing selected)
│       └── HomePage.test.js
├── package.json
├── README.md
├── .env.example            (if database or auth selected)
└── .gitignore
```

**Note:** Only selected features generate their corresponding files and directories.

## 🎨 Generated Component Example

```javascript
// src/components/Button.js
/**
 * Button Component
 */
export function Button(props = {}) {
  const { text = 'Click me', onClick, className = '' } = props;

  return {
    button: {
      className: `btn ${className}`,
      onclick: onClick,
      text
    }
  };
}

// Usage
import { Button } from './components/Button.js';

Button({
  text: 'Get Started',
  onClick: () => console.log('Clicked!'),
  className: 'btn-primary'
})
```

## 📄 Generated Page Example

```javascript
// src/pages/Home.js
import { createComponent } from '@coherent.js/core';

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

## 🔌 API Routes

`coherent generate api users` writes a route module to `src/api/`. **Known issue:** the generated module imports `createApiRouter`, which `@coherent.js/api` does not export, and passes validation middleware positionally; until the generator is fixed, adjust it to the router's real API:

```javascript
// src/api/users.js
import { createRouter, withValidation } from '@coherent.js/api';

const usersAPI = createRouter();

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// GET /api/users
usersAPI.get('/api/users', () => ({ users: [] }));

// POST /api/users (invalid bodies get a 400 before the handler runs)
usersAPI.post('/api/users', (req) => {
  const { name, email } = req.body;
  return { user: { id: 1, name, email } };
}, { middleware: [withValidation(userSchema)] });

export default usersAPI;
```

Serve it with `usersAPI.createServer().listen(3000)`, or forward `/api/` requests to `usersAPI.handle(req, res)` from another server (see the [API usage guide](../../docs/api/usage.md)).

## ⚙️ Configuration

The CLI automatically detects your project setup and adapts accordingly:

- **Package.json scripts** - Uses existing `dev`, `build`, `test` scripts
- **Build tools** - Supports Vite, Webpack, Rollup, esbuild
- **Frameworks** - Works with Express, Fastify, Next.js, Koa
- **Databases** - Generates appropriate models for your database

**Stability:** the bundler integrations exported from `@coherent.js/cli/build-tools` (`createVitePlugin`, `createSSRPlugin`, `createWebpackPlugin`, `createRollupPlugin` and the webpack loader `coherentLoader`) are experimental pass-throughs: they don't transform Coherent.js components yet, and each prints a one-time notice saying so (pass `{ silent: true }` to hide it). `coherent dev` / `coherent build` run your own Vite, webpack or Rollup configuration when one exists.

## 🧪 Testing

Generated components and pages include test files (Vitest is added to the
scaffolded project's devDependencies):

```javascript
// Button.test.js
import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { Button } from './Button.js';

describe('Button', () => {
  it('renders correctly', () => {
    const html = render(Button({ text: 'Test' }));

    expect(html).toContain('Test');
    expect(html).toContain('<button');
  });
});
```

Run tests with:
```bash
pnpm test
```

## 📚 Examples

### Create a fullstack blog application with PostgreSQL

```bash
# Create project with interactive setup
coherent create my-blog

# In the CLI prompts:
# - Template: Fullstack
# - Runtime: Express
# - Database: PostgreSQL
# - Packages: api, client, seo
# - Auth: JWT

# Generate components
cd my-blog
coherent g component ArticleCard
coherent g component CommentList

# Generate pages
coherent g page Article --template detail
coherent g page Dashboard --template dashboard

# Generate API
coherent g api articles --template crud
coherent g api comments --template rest

# Configure database in .env
# DB_HOST=localhost
# DB_NAME=my_blog
# DB_USER=postgres
# DB_PASSWORD=yourpassword

# Start development
coherent dev
```

### Create a component library

```bash
# Create project
coherent create ui-components

# In the CLI prompts:
# - Template: Basic
# - Runtime: Built-in
# - Packages: client, testing

# Generate components
cd ui-components
coherent g component Button --template interactive
coherent g component Modal --template functional
coherent g component Form --template layout

# Build for distribution
coherent build --analyze
```

### Create a custom API with MongoDB

```bash
# Create project
coherent create my-api

# In the CLI prompts:
# - Template: Full Stack
# - Runtime: Fastify
# - Database: MongoDB
# - Packages: api
# - Auth: JWT

# Project includes:
# - Fastify server setup
# - MongoDB connection & models
# - API routes with validation
# - JWT authentication (login, register, /me routes)
# - Environment configuration (.env.example)

cd my-api
# Configure MongoDB in .env
coherent dev
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
- [API Reference](https://github.com/Tomdrouv1/coherent.js/blob/main/docs/api/reference.md)
- [Examples](https://github.com/Tomdrouv1/coherent.js/tree/main/examples)
- [Issues & Bug Reports](https://github.com/Tomdrouv1/coherent.js/issues)

---

**Happy coding with Coherent.js! 🚀**
