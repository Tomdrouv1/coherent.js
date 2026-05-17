# Releasing Coherent.js

Maintainer runbook for cutting releases. End users want `MIGRATION-1.0.md`.

## Release flavors

| Tag | npm dist-tag | When |
|---|---|---|
| `vX.Y.Z-beta.N` | `beta` | Pre-1.0 betas. No longer cut after 1.0. |
| `vX.Y.Z-rc.N` | `rc` | Release candidates. 1-2 week soak before promoting to stable. |
| `vX.Y.Z` | `latest` | Stable. Default for `pnpm add @coherent.js/core`. |

## Pre-release checklist (any cut)

```bash
git status                              # clean tree
pnpm test                               # all unit tests pass
pnpm run e2e                            # all Playwright tests pass
node scripts/check-api-surface.mjs --check
node scripts/check-bundle-size.mjs --check
pnpm --filter coherent-language-support run package && node scripts/check-vsix.mjs
rm -f packages/vscode-extension/coherent-language-support-*.vsix
```

All five gates must be green. CI runs all of them on every PR; a green main is your prerequisite.

## Cutting an `rc.N`

### 1. Bump versions

All 14 versioned `package.json` files (`package.json` at the root + 13 under `packages/`) move together. The vscode-extension is in lockstep with the framework.

Easiest one-shot:

```bash
OLD=1.0.0-beta.8
NEW=1.0.0-rc.1   # bump accordingly
for f in package.json packages/*/package.json; do
  # macOS / BSD sed
  sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$f"
done
git diff --stat package.json packages/*/package.json   # should show 14 files, 14 +/14 -
```

For GNU sed, drop the `''` after `-i`.

Update the CHANGELOG.md Version Timeline ASCII art at the top to add the new row.

### 2. Cut the CHANGELOG

Rename the `## [Unreleased]` heading to `## [1.0.0-rc.1] - YYYY-MM-DD`. Open a fresh empty `## [Unreleased]` above it (with no subsections). Don't move content around — just rename.

### 3. Commit the bump

```bash
git add package.json packages/*/package.json CHANGELOG.md
git commit -m "release: 1.0.0-rc.1"
```

### 4. Tag locally

```bash
git tag -a v1.0.0-rc.1 -m "Coherent.js 1.0.0-rc.1"
```

### 5. Push (irreversible from here)

```bash
git push origin main
git push origin v1.0.0-rc.1
```

### 6. Publish to npm

```bash
pnpm publish -r --access public --tag rc --no-git-checks
# or, after Task 3 of Wave 5:
pnpm run publish:rc
```

`pnpm publish -r` walks the workspace; each package publishes independently. `workspace:*` deps are rewritten to the actual version (`1.0.0-rc.1`) at publish time.

Users install with `pnpm add @coherent.js/core@rc`.

### 7. Publish the VS Code extension

Cross-reference: `packages/vscode-extension/PUBLISHING.md`. Short version:

```bash
pnpm --filter coherent-language-support run clean
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
pnpm --filter coherent-language-support exec vsce publish --no-dependencies
```

`vsce publish` needs your marketplace PAT — see PUBLISHING.md for the one-time setup if you haven't done it.

### 8. Announce

GitHub Releases (auto-attached to the tag — fill in release notes referencing MIGRATION-1.0.md), Discord. Link MIGRATION-1.0.md prominently.

### 9. Soak

Watch for bug reports. The spec budget is 1-2 weeks. If something needs fixing:

- Patch + cut `1.0.0-rc.2` via this same flow (bump versions, CHANGELOG, tag, publish).
- If multiple rcs are needed that's fine — better than shipping a broken stable.

Don't bump to stable until the rc has been quiet for ≥ 5 days (spec criterion).

## Promoting rc to stable (1.0.0)

After the soak, repeat the rc flow with two changes:

1. **NEW version**: `1.0.0` (no `-rc.N`).
2. **npm dist-tag**: `latest` (the default), not `rc`.

```bash
OLD=1.0.0-rc.1  # or whichever rc you last cut
NEW=1.0.0
for f in package.json packages/*/package.json; do
  sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$f"
done

# Update CHANGELOG: rename [Unreleased] → [1.0.0] - YYYY-MM-DD
# Update Version Timeline ASCII art at top

git add package.json packages/*/package.json CHANGELOG.md
git commit -m "release: 1.0.0"
git tag -a v1.0.0 -m "Coherent.js 1.0.0"
git push origin main v1.0.0

# Publish — defaults to 'latest' dist-tag
pnpm run publish:latest

# VS Code extension
pnpm --filter coherent-language-support run clean
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
pnpm --filter coherent-language-support exec vsce publish --no-dependencies
```

GitHub Release: auto-attached to `v1.0.0`. Include a "thank you to rc testers" section if applicable.

## Post-release (any cut)

- Verify the marketplace listing reflects the new version: https://marketplace.visualstudio.com/items?itemName=coherentjs.coherent-language-support
- Verify each npm listing reflects the new version: `npm view @coherent.js/core versions --json | jq '.[-3:]'` (last 3 should include yours)
- Bump local working-tree to `<next>-beta.0` if continuing development immediately; or leave it on the stable version if no further work is planned this cycle.

## Patches (1.0.x)

Same flow as a stable cut, with version pattern `1.0.<N+1>`. No rc needed for patch releases (unless the change is invasive). Pre-release checklist still applies.

## Rollback

Once published, npm versions are immutable (npm allows `unpublish` only within 72 hours of publish and only if no other packages depend on it). The realistic rollback is to **cut a fixed patch version**:

1. Revert or fix the broken commit.
2. Bump to the next patch (`1.0.<N+1>`).
3. Publish via the patch flow above.
4. Add a note to the CHANGELOG explaining what broke.

For the VS Code extension specifically, `vsce unpublish` is possible — see `packages/vscode-extension/PUBLISHING.md` Rollback section.

## When NOT to release

- Working tree dirty.
- Any gate red (test, e2e, api-surface, bundle-size, vsix).
- Within 24h of a known external dep regression (e.g., the chokidar release that breaks our watcher) — wait for the upstream fix.
- During an active incident affecting consumers (don't ship a new version on top of a still-being-diagnosed problem).
