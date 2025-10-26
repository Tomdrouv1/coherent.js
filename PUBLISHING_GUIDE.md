# 📦 Publishing Guide - Coherent.js v2.0

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

### Core Packages (Already Published)
1. ✅ `@coherentjs/core` - Main framework

### New Packages (v2.0)
2. `@coherentjs/plugins` - Plugin system
3. `@coherentjs/testing` - Testing utilities
4. `@coherentjs/devtools` - Developer tools
5. `@coherentjs/runtime` - Enhanced runtimes
6. `@coherentjs/i18n` - Internationalization
7. `@coherentjs/forms` - Form utilities
8. `@coherentjs/seo` - SEO optimization
9. `@coherentjs/performance` - Performance optimization

---

## 🔧 Step-by-Step Publishing Process

### Step 1: Prepare All Packages

```bash
# Navigate to project root
cd /Users/thomasdrouvin/Perso/coherent

# Ensure all dependencies are installed
npm install

# Run tests
npm test

# Build if needed
npm run build
```

### Step 2: Update Package Versions

Update version in each package.json:

```json
{
  "name": "@coherentjs/plugins",
  "version": "2.0.0",
  "description": "Plugin system for Coherent.js",
  "main": "./src/index.js",
  "type": "module"
}
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
# @coherentjs/plugins

Plugin system for Coherent.js applications.

## Installation

\`\`\`bash
npm install @coherentjs/plugins
\`\`\`

## Usage

\`\`\`javascript
import { createPluginManager, plugins } from '@coherentjs/plugins';

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

# Publish @coherentjs/plugins
cd packages/plugins
npm publish --access public

# Publish @coherentjs/testing
cd ../testing
npm publish --access public

# Publish @coherentjs/devtools
cd ../devtools
npm publish --access public

# Publish @coherentjs/runtime
cd ../runtime
npm publish --access public

# Publish @coherentjs/i18n
cd ../i18n
npm publish --access public

# Publish @coherentjs/forms
cd ../forms
npm publish --access public

# Publish @coherentjs/seo
cd ../seo
npm publish --access public

# Publish @coherentjs/performance
cd ../performance
npm publish --access public
```

---

## 🤖 Automated Publishing Script

Create `scripts/publish-all.sh`:

```bash
#!/bin/bash

# Coherent.js v2.0 Publishing Script

set -e

echo "🚀 Publishing Coherent.js v2.0 packages..."

# Array of packages to publish
packages=(
  "plugins"
  "testing"
  "devtools"
  "runtime"
  "i18n"
  "forms"
  "seo"
  "performance"
)

# Publish each package
for package in "${packages[@]}"
do
  echo ""
  echo "📦 Publishing @coherentjs/$package..."
  cd "packages/$package"
  
  # Check if package.json exists
  if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in packages/$package"
    exit 1
  fi
  
  # Publish
  npm publish --access public
  
  if [ $? -eq 0 ]; then
    echo "✅ @coherentjs/$package published successfully"
  else
    echo "❌ Failed to publish @coherentjs/$package"
    exit 1
  fi
  
  cd ../..
done

echo ""
echo "🎉 All packages published successfully!"
echo ""
echo "Published packages:"
for package in "${packages[@]}"
do
  echo "  ✅ @coherentjs/$package"
done
```

Make it executable:

```bash
chmod +x scripts/publish-all.sh
```

Run it:

```bash
./scripts/publish-all.sh
```

---

## 📝 Package.json Template

Each package should follow this structure:

```json
{
  "name": "@coherentjs/PACKAGE_NAME",
  "version": "2.0.0",
  "description": "PACKAGE_DESCRIPTION",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
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
    "@coherentjs/core": "^2.0.0"
  }
}
```

---

## 🏷️ Git Tagging

After publishing, create git tags:

```bash
# Create tag for v2.0.0
git tag -a v2.0.0 -m "Release v2.0.0 - Complete feature implementation"

# Push tags
git push origin v2.0.0

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
- [ ] Add v2.0 migration guide
- [ ] Update API reference
- [ ] Add new examples

---

## 🔍 Verification

After publishing, verify each package:

```bash
# Check package on npm
npm view @coherentjs/plugins

# Install and test
mkdir test-install
cd test-install
npm init -y
npm install @coherentjs/plugins
node -e "import('@coherentjs/plugins').then(m => console.log('✅ Import successful'))"
```

---

## 🚨 Troubleshooting

### Issue: "You do not have permission to publish"
**Solution**: Make sure you're logged in and have access to the @coherentjs scope
```bash
npm login
npm whoami
```

### Issue: "Package already exists"
**Solution**: Increment version number
```bash
npm version patch  # 2.0.0 -> 2.0.1
npm version minor  # 2.0.0 -> 2.1.0
npm version major  # 2.0.0 -> 3.0.0
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
- [ ] @coherentjs/plugins
- [ ] @coherentjs/testing
- [ ] @coherentjs/devtools
- [ ] @coherentjs/runtime
- [ ] @coherentjs/i18n
- [ ] @coherentjs/forms
- [ ] @coherentjs/seo
- [ ] @coherentjs/performance

### Post-Publish
- [ ] Git tags created
- [ ] GitHub release created
- [ ] Documentation updated
- [ ] Announcement posted
- [ ] Packages verified on npm

---

## 🎯 Quick Commands Reference

```bash
# Login to npm
npm login

# Check who you're logged in as
npm whoami

# Publish a package
npm publish --access public

# Unpublish (within 72 hours)
npm unpublish @coherentjs/PACKAGE@VERSION

# Deprecate a version
npm deprecate @coherentjs/PACKAGE@VERSION "Reason"

# View package info
npm view @coherentjs/PACKAGE

# Check package size
npm pack --dry-run
```

---

## 📈 Success Metrics

After publishing, monitor:

1. **Download Stats**
   - npm downloads per week
   - GitHub stars
   - GitHub forks

2. **Community Engagement**
   - GitHub issues
   - Pull requests
   - Discussions

3. **Documentation**
   - Page views
   - Search queries
   - Feedback

---

## 🎉 Publishing Complete!

Once all packages are published:

1. ✅ All packages on npm
2. ✅ Git tags created
3. ✅ GitHub release published
4. ✅ Documentation updated
5. ✅ Community notified

**Coherent.js v2.0 is now live!** 🚀

---

## 📞 Support

If you encounter issues during publishing:

1. Check npm status: https://status.npmjs.org/
2. Review npm documentation: https://docs.npmjs.com/
3. Open an issue: https://github.com/Tomdrouv1/coherent.js/issues
4. Email: thomas.drouvin@gmail.com
