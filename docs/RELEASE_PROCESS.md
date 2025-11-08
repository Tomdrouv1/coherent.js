# Release Process

This document describes how to create and publish releases for Coherent.js.

## Overview

Coherent.js uses **GitHub Releases** as the source of truth for all releases. When you create a GitHub Release, it automatically:

1. ✅ Runs all tests
2. 📦 Publishes packages to npm
3. 🌐 Deploys website to GitHub Pages
4. 📝 Generates release notes

## Quick Start

### Using the Release Script (Recommended)

```bash
pnpm run release
```

This interactive script will:
- Guide you through version selection
- Update all package.json files
- Create git tag
- Push to GitHub
- Create GitHub Release
- Trigger CI to publish to npm and deploy website

### Manual Release

If you prefer to do it manually:

```bash
# 1. Update version in all packages
pnpm -r exec npm version 1.0.0-beta.2

# 2. Commit and push
git add .
git commit -m "chore: release v1.0.0-beta.2"
git push origin main

# 3. Create and push tag
git tag -a v1.0.0-beta.2 -m "Release v1.0.0-beta.2"
git push origin v1.0.0-beta.2

# 4. Create GitHub Release
gh release create v1.0.0-beta.2 \
  --generate-notes \
  --prerelease \
  --title "v1.0.0-beta.2"
```

## Release Types

### Prerelease (Beta)

For beta/RC releases:

```bash
# Version: 1.0.0-beta.1, 1.0.0-beta.2, etc.
pnpm run release
# Select option 1 (patch) for beta releases
```

**What happens:**
- ✅ Creates prerelease on GitHub
- 📦 Publishes to npm with `@beta` tag
- 🌐 Deploys website
- ✉️ Tagged as "Pre-release" on GitHub

**Users install with:**
```bash
npm install @coherent.js/core@beta
# or
npm install @coherent.js/core@1.0.0-beta.2
```

### Stable Release

For production-ready releases:

```bash
# Version: 1.0.0, 1.1.0, 2.0.0, etc.
pnpm run release
# Select option 4 (remove beta) or 5 (custom)
```

**What happens:**
- ✅ Creates stable release on GitHub
- 📦 Publishes to npm with `@latest` tag
- 🌐 Deploys website
- ✉️ Tagged as "Latest release" on GitHub

**Users install with:**
```bash
npm install @coherent.js/core
# or
npm install @coherent.js/core@latest
```

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

### Format

```
MAJOR.MINOR.PATCH-PRERELEASE.NUMBER

Examples:
- 1.0.0-beta.1   (First beta)
- 1.0.0-beta.2   (Second beta)
- 1.0.0-rc.1     (Release candidate)
- 1.0.0          (Stable release)
- 1.1.0          (Minor update)
- 2.0.0          (Major update)
```

### When to Bump

- **Patch** (1.0.0 → 1.0.1): Bug fixes, no breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, no breaking changes
- **Major** (1.0.0 → 2.0.0): Breaking changes

For prereleases:
- **Beta patch** (1.0.0-beta.1 → 1.0.0-beta.2): Bug fixes
- **Beta minor** (1.0.0-beta.1 → 1.1.0-beta.1): New features
- **Beta to stable** (1.0.0-beta.5 → 1.0.0): Remove beta tag

## Step-by-Step Release Checklist

### Before Release

- [ ] All PRs merged to `main`
- [ ] All tests passing locally (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Update CHANGELOG.md (if exists)
- [ ] No uncommitted changes

### Creating Release

- [ ] Run `pnpm run release`
- [ ] Select appropriate version bump
- [ ] Review and confirm version number
- [ ] Script updates all package.json files
- [ ] Script creates commit and tag
- [ ] Script pushes to GitHub
- [ ] Script creates GitHub Release

### After Release

- [ ] Watch GitHub Actions run ([Actions tab](https://github.com/Tomdrouv1/coherent.js/actions))
- [ ] Verify npm publish succeeded
- [ ] Verify website deployed
- [ ] Test installation: `npm install @coherent.js/core@<version>`
- [ ] Announce release (if stable)

## CI/CD Workflow

### Triggers

The CI runs on:
- ✅ Every push to `main`
- ✅ Every pull request
- 📦 **Every GitHub Release** (triggers npm publish)

### Jobs

1. **Test Job** (always runs)
   - Runs on Node 20.x and 22.x
   - Lints, typechecks, tests with coverage
   - Builds packages and website

2. **Deploy Website Job** (runs on main push or release)
   - Deploys to GitHub Pages
   - Includes coverage reports

3. **Publish to npm Job** (runs on GitHub Release only)
   - Publishes all packages
   - Uses `@beta` tag for prereleases
   - Uses `@latest` tag for stable releases

### Workflow File

`.github/workflows/ci.yml`

```yaml
on:
  release:
    types: [ published, created ]  # Triggers on GitHub Release
```

## Troubleshooting

### Release script fails with "semver not found"

The script uses Node's built-in version bumping, but if you see this error:

```bash
npm install -g semver
```

### GitHub Release created but npm publish failed

Check GitHub Actions logs:
1. Go to [Actions](https://github.com/Tomdrouv1/coherent.js/actions)
2. Find the failed workflow
3. Check the "Publish to npm" job

Common issues:
- Missing `NPM_TOKEN` secret
- Package version already exists
- Network timeout

To retry:
1. Delete the GitHub Release
2. Delete the git tag: `git tag -d v1.0.0-beta.2 && git push origin :v1.0.0-beta.2`
3. Run release script again

### Tag already exists

```bash
# Delete local tag
git tag -d v1.0.0-beta.2

# Delete remote tag
git push origin :v1.0.0-beta.2

# Or delete both
git tag -d v1.0.0-beta.2 && git push origin :v1.0.0-beta.2
```

### Need to unpublish from npm

**Warning:** You can only unpublish within 72 hours, and it affects users!

```bash
# Unpublish specific version
npm unpublish @coherent.js/core@1.0.0-beta.2

# Unpublish all packages
pnpm -r exec npm unpublish @coherent.js/$(basename $PWD)@1.0.0-beta.2
```

### CI is not triggered on release

Check:
1. GitHub Release was created (not just a tag)
2. GitHub Actions is enabled in repository settings
3. Workflow file has correct trigger: `on.release.types: [published, created]`

## Best Practices

### DO ✅

1. **Use the release script** - It handles everything correctly
2. **Test before release** - Run full test suite locally
3. **Use prereleases** - Beta/RC before stable
4. **Write release notes** - Explain what changed
5. **Follow semver** - Breaking changes = major bump
6. **Tag appropriately** - Prerelease for betas, stable for production

### DON'T ❌

1. **Don't manually edit version** - Use the script
2. **Don't skip testing** - CI tests but local first
3. **Don't publish broken code** - Test thoroughly
4. **Don't reuse versions** - Each release needs unique version
5. **Don't rush stable** - Use betas to gather feedback

## GitHub Secrets

Required secrets in repository settings:

- `NPM_TOKEN` - npm publish token (required)
- `CODECOV_TOKEN` - Codecov upload token (optional)

To add/update:
1. Go to repository Settings
2. Secrets and variables → Actions
3. Add/update secret

## npm Tags

### Current Tags

- `beta` - Latest prerelease (1.0.0-beta.X)
- `latest` - Latest stable (1.0.0, 1.1.0, etc.)

### Users Install With

```bash
# Latest stable
npm install @coherent.js/core

# Latest beta
npm install @coherent.js/core@beta

# Specific version
npm install @coherent.js/core@1.0.0-beta.2
```

## Example Release Flow

### First Beta Release

```bash
# Start: 1.0.0-beta.1
pnpm run release
# Select: 1 (patch) → 1.0.0-beta.2
```

### Multiple Beta Releases

```bash
1.0.0-beta.1 → 1.0.0-beta.2 → 1.0.0-beta.3 → 1.0.0
```

### Stable to Next Version

```bash
# After 1.0.0 stable
pnpm run release
# Select: 2 (minor) → 1.1.0-beta.1
# Then: patch → 1.1.0-beta.2
# Finally: remove beta → 1.1.0
```

### Major Version

```bash
# Breaking changes
pnpm run release
# Select: 3 (major) → 2.0.0-beta.1
# Test extensively in beta
# Select: 4 (remove beta) → 2.0.0
```

## Rollback

If a release has critical bugs:

### Option 1: Quick Patch

```bash
# Fix the bug
pnpm run release
# Bump patch version
```

### Option 2: Deprecate

```bash
# Deprecate bad version
npm deprecate @coherent.js/core@1.0.0-beta.2 "Critical bug, use 1.0.0-beta.3"

# Release fixed version
pnpm run release
```

### Option 3: Unpublish (Last Resort)

Only if published < 72 hours ago:

```bash
npm unpublish @coherent.js/core@1.0.0-beta.2
```

## Related Files

- `.github/workflows/ci.yml` - CI/CD workflow
- `scripts/release.sh` - Release automation script
- `package.json` - Root package with `release` script
- `packages/*/package.json` - Individual package versions

## Further Reading

- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Semantic Versioning](https://semver.org/)
- [npm publish](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [GitHub Actions](https://docs.github.com/en/actions)
