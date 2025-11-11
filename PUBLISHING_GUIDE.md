# 📦 Publishing Guide - Coherent.js

**Complete guide for publishing all packages to npm**

---

## 📋 Pre-Publishing Checklist

### 1. **Version Management**
- [ ] Update version in all package.json files
- [ ] Update CHANGELOG.md with new features
- [ ] Create git tag for release
- [ ] Update README.md with new features

### 2. **Code Quality**
- [ ] All tests passing
- [ ] Linting passes
- [ ] No console.log statements in production code
- [ ] Documentation is up to date

### 3. **Package Preparation**
- [ ] All package.json files have correct metadata
- [ ] LICENSE file in each package
- [ ] README.md in each package
- [ ] .npmignore configured correctly

---

## 📦 Packages to Publish

### Core Packages
1. `@coherent.js/core` - Main framework
2. `@coherent.js/client` - Client-side hydration
3. `@coherent.js/api` - API framework
4. `@coherent.js/database` - Database layer
5. `@coherent.js/testing` - Testing utilities
6. `@coherent.js/devtools` - Developer tools
7. `@coherent.js/runtime` - Enhanced runtimes
8. `@coherent.js/i18n` - Internationalization
9. `@coherent.js/forms` - Form utilities
10. `@coherent.js/seo` - SEO optimization
11. `@coherent.js/performance` - Performance optimization
12. `@coherent.js/cli` - CLI tools
13. `@coherent.js/build-tools` - Build utilities
14. `@coherent.js/express` - Express.js integration
15. `@coherent.js/fastify` - Fastify integration
16. `@coherent.js/koa` - Koa.js integration
17. `@coherent.js/nextjs` - Next.js integration
18. `@coherent.js/adapters` - Framework adapters
19. `@coherent.js/web-components` - Web components

---

## 🔧 Step-by-Step Publishing Process

### Step 1: Prepare All Packages

```bash
# Navigate to project root
cd /Users/thomasdrouvin/Perso/coherent

# Ensure all dependencies are installed
pnpm install

# Run tests
pnpm test

# Build if needed
pnpm build
```

### Step 2: Update Package Versions

Update version in each package.json using Changesets:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version
```

### Step 3: Create .npmignore Files

Create `.npmignore` in each package directory:

```
# .npmignore
node_modules/
*.test.js
*.spec.js
.DS_Store
coverage/
.nyc_output/
*.log
```

### Step 4: Add README to Each Package

Each package should have its own README.md:

```markdown
# @coherent.js/plugins

Plugin system for Coherent.js applications.

## Installation

\`\`\`bash
npm install @coherent.js/plugins
\`\`\`

## Usage

\`\`\`javascript
import { createPluginManager, plugins } from '@coherent.js/plugins';

const manager = createPluginManager();
manager.register(plugins.performance());
\`\`\`

## Documentation

See [main documentation](https://github.com/Tomdrouv1/coherent.js) for details.

## License

MIT
```

### Step 5: Publish Each Package

```bash
# Login to npm (first time only)
npm login

# Or use the release script (recommended)
pnpm run release
```

---

## 🤖 Automated Publishing Script

The project uses Changesets for automated versioning and publishing:

```bash
# Create a changeset for your changes
pnpm changeset

# Version packages (updates package.json files)
pnpm version

# Publish packages to npm
pnpm release
```

Or use the interactive release script:

```bash
# Interactive release process
pnpm run release
```

---

## 📝 Package.json Template

Each package should follow this structure:

```json
{
  "name": "@coherent.js/PACKAGE_NAME",
  "version": "1.0.0-beta.1",
  "description": "PACKAGE_DESCRIPTION",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": {
      "development": "./src/index.js",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "keywords": [
    "coherent",
    "coherentjs",
    "PACKAGE_KEYWORD"
  ],
  "author": "Coherent.js Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Tomdrouv1/coherent.js.git",
    "directory": "packages/PACKAGE_NAME"
  },
  "bugs": {
    "url": "https://github.com/Tomdrouv1/coherent.js/issues"
  },
  "homepage": "https://github.com/Tomdrouv1/coherent.js#readme",
  "peerDependencies": {
    "@coherent.js/core": "^1.0.0-beta.1"
  }
}
```

---

## 🏷️ Git Tagging

After publishing, create git tags:

```bash
# Create tag for v1.0.0-beta.1
git tag -a v1.0.0-beta.1 -m "Release v1.0.0-beta.1 - Beta release"

# Push tags
git push origin v1.0.0-beta.1

# Or push all tags
git push --tags
```

---

## 📢 Post-Publishing Tasks

### 1. **Update Main README**
- [ ] Add installation instructions for new packages
- [ ] Update feature list
- [ ] Add migration guide link

### 2. **Create GitHub Release**
- [ ] Go to GitHub Releases
- [ ] Create new release from tag
- [ ] Add release notes from CHANGELOG
- [ ] Attach any relevant files

### 3. **Announce Release**
- [ ] Twitter/X announcement
- [ ] Reddit (r/javascript, r/node)
- [ ] Dev.to article
- [ ] Hacker News
- [ ] Discord/Slack communities

### 4. **Update Documentation Site**
- [ ] Deploy updated docs
- [ ] Add migration guide
- [ ] Update API reference
- [ ] Add new examples

---

## 🔍 Verification

After publishing, verify each package:

```bash
# Check package on npm
npm view @coherent.js/core

# Install and test
mkdir test-install
cd test-install
npm init -y
npm install @coherent.js/core
node -e "import('@coherent.js/core').then(m => console.log('✅ Import successful'))"
```

---

## 🚨 Troubleshooting

### Issue: "You do not have permission to publish"
**Solution**: Make sure you're logged in and have access to the @coherent.js scope
```bash
npm login
npm whoami
```

### Issue: "Package already exists"
**Solution**: Increment version number or use beta tag
```bash
# Use beta tag for pre-releases
npm publish --tag beta
```

### Issue: "ENOENT: no such file or directory"
**Solution**: Make sure you're in the correct directory
```bash
pwd  # Should be in packages/PACKAGE_NAME
ls   # Should see package.json
```

### Issue: "Invalid package.json"
**Solution**: Validate JSON syntax
```bash
cat package.json | jq .  # Validates JSON
```

---

## 📊 Publishing Checklist

### Pre-Publish
- [ ] All tests passing
- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] LICENSE files present
- [ ] .npmignore configured
- [ ] Git committed and pushed

### Publish
- [ ] Run `pnpm release` or manual publish
- [ ] Verify all packages published

### Post-Publish
- [ ] Git tags created
- [ ] GitHub release created
- [ ] Documentation updated
- [ ] Announcement posted
- [ ] Packages verified on npm

---

## 🎯 Quick Commands Reference

```bash
# Create changeset
pnpm changeset

# Version packages
pnpm version

# Publish packages
pnpm release

# Check who you're logged in as
npm whoami

# Publish a package manually
npm publish --access public

# Unpublish (within 72 hours)
npm unpublish @coherent.js/PACKAGE@VERSION

# Deprecate a version
npm deprecate @coherent.js/PACKAGE@VERSION "Reason"

# View package info
npm view @coherent.js/PACKAGE

# Check package size
npm pack --dry-run
```

---

## 🎉 Publishing Complete!

Once all packages are published:

1. ✅ All packages on npm
2. ✅ Git tags created
3. ✅ GitHub release published
4. ✅ Documentation updated
5. ✅ Community notified

**Coherent.js is now live!** 🚀

---

## 📞 Support

If you encounter issues during publishing:

1. Check npm status: https://status.npmjs.org/
2. Review npm documentation: https://docs.npmjs.com/
3. Open an issue: https://github.com/Tomdrouv1/coherent.js/issues
4. Email: thomas.drouvin@gmail.com
