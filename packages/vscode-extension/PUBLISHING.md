# Publishing the Coherent.js VS Code Extension

This document is for **maintainers**. End users install from the marketplace; they don't need any of this.

## One-time setup

### 1. Marketplace publisher account

The extension publishes under the `coherentjs` publisher. If you don't already manage that publisher:

1. Sign in to https://marketplace.visualstudio.com/manage with a Microsoft account that has access to the publisher.
2. If the publisher doesn't exist yet, create it: https://aka.ms/vscodepublishers — choose `coherentjs` as the publisher ID (it must match `packages/vscode-extension/package.json`'s `publisher` field exactly).

### 2. Personal Access Token (PAT)

`vsce` authenticates against the marketplace with a PAT. To create one:

1. Sign in to https://dev.azure.com (any Azure DevOps org; create one if you don't have one).
2. Go to User Settings → Personal Access Tokens → New Token.
3. **Scopes:** select "Custom defined" → "Marketplace" → check **Manage**. Do NOT grant any other scopes.
4. **Expiration:** the marketplace currently allows up to 1 year. Set a calendar reminder to rotate.
5. Copy the token *immediately* — Azure DevOps only shows it once.

Store the PAT somewhere safe (e.g., a password manager). **Do not** commit it. **Do not** put it in shell history (use a credential helper or vsce's interactive prompt).

### 3. Log `vsce` into the publisher

```bash
pnpm --filter coherent-language-support exec vsce login coherentjs
# Paste the PAT when prompted.
```

This caches the credentials under `~/.vsce`. You only need to redo this if the PAT rotates or you switch machines.

## Per-release flow

### 1. Verify the working tree

```bash
git status   # should be clean
pnpm test    # full suite green
pnpm run e2e # Playwright suite green
```

### 2. Bump the version

The extension version must match the framework version. If the framework just tagged `1.0.0`, the extension also goes to `1.0.0`. Use the existing changeset/release process (or, for a one-off, edit `packages/vscode-extension/package.json`'s `version` field directly and commit).

### 3. Build and check

```bash
pnpm --filter coherent-language-support run clean
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
```

Expected: `✅ VSIX publish-readiness check passed.` The CI `vsix` job runs the same flow on every PR — a green CI means this step will pass locally.

### 4. Smoke-test the .vsix locally

Install it into your local VS Code:

```bash
code --install-extension packages/vscode-extension/coherent-language-support-*.vsix --force
```

Reload VS Code. Open a JS file and type `cel<Tab>` — you should get a Coherent.js element snippet. Verify the bottom-right corner doesn't show a "Coherent Language Server failed" error.

### 5. Publish

```bash
pnpm --filter coherent-language-support run publish:vsce
```

`vsce` will print the marketplace URL when done. The listing takes 1-2 minutes to reflect the new version.

### 6. Verify the marketplace listing

Open https://marketplace.visualstudio.com/items?itemName=coherentjs.coherent-language-support and confirm:

- Version number matches what you just published.
- README renders correctly (marketplace uses GitHub-flavored markdown but with some quirks — links to `./snippets/` won't resolve, for instance).
- The icon is present.

### 7. Tag the release in git

```bash
git tag vscode-extension-vX.Y.Z
git push origin vscode-extension-vX.Y.Z
```

Per-extension tags keep the marketplace history queryable from git.

## Rollback

If a published version is broken:

1. **Unpublish a specific version** (rarely needed):
   ```bash
   pnpm --filter coherent-language-support exec vsce unpublish coherentjs.coherent-language-support@X.Y.Z
   ```
   Note: this is **destructive and irreversible** for that version number. Users who installed it keep their copy until they update.

2. **Republish a fixed version** (preferred):
   - Bump the patch version (e.g., `1.0.0` → `1.0.1`).
   - Apply the fix.
   - Run the per-release flow above.
   - Users get the fix on their next auto-update.

3. **Unpublish the entire extension** (nuclear option):
   ```bash
   pnpm --filter coherent-language-support exec vsce unpublish coherentjs.coherent-language-support
   ```
   Removes the listing entirely. Existing installations keep working but won't get updates. Almost never the right move.

## Troubleshooting

- **`vsce: error: missing publisher`**: package.json's `publisher` field is empty or wrong. Should be `coherentjs`.
- **`vsce: error: access denied`**: PAT is wrong, expired, or doesn't have Marketplace:Manage scope. Run `vsce login coherentjs` again with a fresh PAT.
- **`engines.vscode (^X.Y.Z) < @types/vscode (^A.B.C)`**: vsce enforces `engines.vscode >= @types/vscode`. Either bump engines.vscode or pin @types/vscode to an older version. Wave 4c bumped engines.vscode to ^1.118.0 to match the installed @types/vscode.
- **CI `vsix` job fails with "Missing expected entries"**: `scripts/check-vsix.mjs` has a hard-coded list of expected files. If vsce changed its packaging layout in a major version bump, update the list. Run `unzip -l <vsix>` locally to see the actual entries.
- **`vscode:prepublish` script not firing**: confirm `packages/vscode-extension/package.json` has both `prepublishOnly` and `vscode:prepublish` scripts (added in Wave 4c). Older copies of this package didn't.

## Reference

- vsce CLI docs: https://github.com/microsoft/vscode-vsce
- Publisher management: https://marketplace.visualstudio.com/manage
- Coherent.js extension listing: https://marketplace.visualstudio.com/items?itemName=coherentjs.coherent-language-support
