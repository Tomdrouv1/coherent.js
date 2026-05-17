# Coherent.js v1.0 — Wave 4c: VS Code Marketplace Publish Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 5 (final sub-bullet: "VS Code extension publish") and Section 7 (Wave 4 sequencing).

**Goal:** Make the `packages/vscode-extension` package publish-ready against the VS Code Marketplace without actually executing the `vsce publish` step (which requires the user's marketplace Personal Access Token and can't be safely automated by Claude). End state: a single `pnpm --filter coherent-language-support run package` call produces a valid `.vsix`, the publish procedure is documented step-by-step in a `PUBLISHING.md` next to the extension, and the stale committed `.vsix` artifact + repo-cruft are cleaned up.

**Architecture:** No production code changes. Three categories of work, all packaging/operational:
1. **Build hygiene** — add a `prepublishOnly` (and matching `vscode:prepublish`) script so `vsce package` and `vsce publish` always run from a fresh build, never from stale `dist/`. Remove the committed `coherent-language-support-1.0.0.vsix` artifact (it's months stale, points at a `1.0.0` version that doesn't match the current `1.0.0-beta.8` in package.json, and shouldn't have been a tracked binary in the first place). Add `*.vsix` to a focused `.gitignore` so future builds don't sneak in.
2. **Publish-readiness checks** — add a small `scripts/check-vsix.mjs` that, given a built `.vsix`, asserts the expected files are inside (extension.js, server/server.js, snippets, icon) and the manifest's `version` matches `packages/vscode-extension/package.json`. Wire it into the existing CI workflow as a non-blocking sanity step so a broken vsix can't ship unnoticed. (Soft gate, not a release blocker — release happens via marketplace, not CI.)
3. **Documentation** — write `packages/vscode-extension/PUBLISHING.md` with the marketplace setup (publisher account, PAT scoping), the verified-working publish command sequence, the version-bump procedure (in lock-step with the framework version), and the rollback options. Add a one-line pointer from the extension's README. Add a CHANGELOG entry.

**Tech Stack:** No new deps. The package already depends on `@vscode/vsce@^3.9.1` (devDep) which is the modern fork of the original `vsce`. Existing `esbuild` build chain stays untouched.

---

## Wave 4c explicitly NOT in scope

- **Actually running `vsce publish`.** Requires the user's marketplace Personal Access Token (PAT) scoped to the `coherentjs` publisher on `https://marketplace.visualstudio.com/manage/publishers/coherentjs`. Claude cannot and should not handle that credential. The plan documents the command but the user runs it.
- **Creating the marketplace publisher account.** Out of band; usually a one-time setup at https://aka.ms/vscodepublishers. The plan's PUBLISHING.md links to the official docs and lists the required steps but does not attempt them.
- **OpenVSX publish (the marketplace VS Code forks use).** Spec doesn't require it for 1.0; can be added in a follow-up if users on VSCodium/Cursor/etc. request it.
- **Version-bump to `1.0.0`.** The vscode-extension's `package.json` says `1.0.0-beta.8` like the rest of the monorepo. The Wave 5 release plan owns the `beta.8 → 1.0.0` version bump across all packages; Wave 4c just makes sure the extension is *ready* for that bump, not that it executes it. (Publishing a beta.8 vsix would be confusing for marketplace users — defer.)
- **Absorbing `vscode-extension` into `@coherent.js/tooling`.** Spec Section 1 lists this consolidation (12-package target). It's structural surgery — separate concern, deserves its own plan if pursued. Wave 4c keeps the extension as its own workspace package.
- **Marketplace artwork beyond the existing `icon.png`.** Could add a banner, screenshots, or animated GIFs for the marketplace listing, but the existing README + icon are sufficient. Refinement for post-1.0.
- **CI auto-publish on tag.** Tempting (push a `vscode-extension-v1.0.0` tag, CI builds and publishes via a stored PAT secret), but the marketplace publish step is rare enough that manual is fine, and storing the PAT in GitHub secrets is a security surface we don't need to open for 1.0. Defer.

---

## What we ARE building

| Area | Change |
|---|---|
| Build pipeline | `prepublishOnly` and `vscode:prepublish` scripts so `vsce package`/`publish` always build first. Removes the "stale dist/" footgun. |
| Repo hygiene | Delete `packages/vscode-extension/coherent-language-support-1.0.0.vsix` (stale, version mismatch). Add `*.vsix` to extension's `.gitignore`. |
| Publish-readiness check | `scripts/check-vsix.mjs` — unzip the latest built `.vsix`, assert expected files exist, assert manifest version matches `package.json`. Wired into CI as a non-blocking sanity step. |
| Publish workflow doc | New `packages/vscode-extension/PUBLISHING.md` with the verified command sequence, PAT setup, version-bump procedure, rollback options. README gains a one-line pointer. |
| CHANGELOG | Wave 4c entry. |

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `packages/vscode-extension/package.json` | Modify | Add `prepublishOnly` and `vscode:prepublish` scripts (both alias `pnpm run build`). |
| `packages/vscode-extension/coherent-language-support-1.0.0.vsix` | Delete | Stale binary artifact (4 months old, version mismatch). |
| `packages/vscode-extension/.gitignore` | Create | Ignore `*.vsix` so future builds don't sneak in. |
| `packages/vscode-extension/PUBLISHING.md` | Create | The publish workflow. PAT setup → version bump → build → check → publish → verify → rollback. |
| `packages/vscode-extension/README.md` | Modify | One-line "See PUBLISHING.md for maintainer instructions." pointer near the end. |
| `scripts/check-vsix.mjs` | Create | Verify a built `.vsix` is well-formed — files present, manifest version matches. CI runs this after `vsce package`. |
| `.github/workflows/ci.yml` | Modify | Add a `vsix` job (parallel to `test`/`e2e`) that builds the extension, packages it, and runs `check-vsix.mjs`. Non-blocking (`continue-on-error: false` — but failure here is rare and surfaces a real problem if it happens; treat as hard gate). |
| `CHANGELOG.md` | Modify | Wave 4c entry. |

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: pre-existing dirty noise only.

- [ ] **Step 2: Confirm prior wave gates are still green**

Run:
```bash
pnpm test && pnpm run e2e && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check
```
Expected: green.

- [ ] **Step 3: Confirm `vsce` is installed and the extension builds**

Run:
```bash
pnpm --filter coherent-language-support run build
pnpm --filter coherent-language-support exec vsce --version
```
Expected: build succeeds (esbuild bundles extension + copies LSP server); vsce prints a version like `3.9.x`.

- [ ] **Step 4: Confirm the stale committed `.vsix` exists**

Run: `ls -la packages/vscode-extension/*.vsix`
Expected: `coherent-language-support-1.0.0.vsix` (~151KB, dated Jan 2026). If it's already gone, skip the `git rm` step in Task 2.

---

## Task 1: Build hygiene — prepublish scripts

**Files:**
- Modify: `packages/vscode-extension/package.json`

### Step 1: Add the prepublish scripts

Open `packages/vscode-extension/package.json`. Find the `scripts` block:

```json
  "scripts": {
    "build": "node esbuild.config.mjs",
    "package": "vsce package --no-dependencies",
    "publish:vsce": "vsce publish --no-dependencies"
  }
```

Replace with (alphabetical-ish, leaving `package` and `publish:vsce` next to each other):

```json
  "scripts": {
    "build": "node esbuild.config.mjs",
    "clean": "rm -rf dist server",
    "package": "vsce package --no-dependencies",
    "prepublishOnly": "pnpm run build",
    "publish:vsce": "vsce publish --no-dependencies",
    "vscode:prepublish": "pnpm run build"
  }
```

**Why both `prepublishOnly` and `vscode:prepublish`?**
- `prepublishOnly` runs before npm/pnpm publish (won't fire in our flow — we never publish the extension to npm — but it's a defensive belt to prevent accidental publishes with stale dist).
- `vscode:prepublish` is the vsce-specific lifecycle hook that runs before `vsce package` AND `vsce publish`. This is the load-bearing one.

`clean` script lets the publish workflow start from a known-clean state.

### Step 2: Verify the lifecycle hook fires

Run: `pnpm --filter coherent-language-support run clean && pnpm --filter coherent-language-support run package`
Expected: `vsce package` automatically calls `vscode:prepublish` (which calls `pnpm run build`), then produces a `.vsix` in the extension dir. The build step output should appear in the log.

Verify the .vsix was created:
```bash
ls -la packages/vscode-extension/coherent-language-support-*.vsix
```
Expected: a `coherent-language-support-1.0.0-beta.8.vsix` (version matches package.json, NOT the old `1.0.0`).

### Step 3: Commit

```bash
git add packages/vscode-extension/package.json
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore(vscode-extension): add prepublish scripts so vsce never ships stale dist

Adds `vscode:prepublish` and `prepublishOnly` to the extension's
package.json. Both alias `pnpm run build`, so:

- `vsce package` and `vsce publish` (the vsce lifecycle hooks)
  always rebuild dist/ + server/ before bundling the .vsix.
- `pnpm publish` (npm/pnpm lifecycle) is also gated. We don't
  publish the extension to npm, but this is a defensive belt
  against accidental misuse.

Also adds a `clean` script so the publish workflow can start
from a known-clean state.

No behavior change for end-users. First commit of Wave 4c (VS
Code marketplace publish prep) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Repo hygiene — drop the stale .vsix, gitignore future ones

**Files:**
- Delete: `packages/vscode-extension/coherent-language-support-1.0.0.vsix` (and any other freshly-built .vsix from Task 1's verification)
- Create: `packages/vscode-extension/.gitignore`

### Step 1: Create the .gitignore

Create `packages/vscode-extension/.gitignore`:

```
# Built extension bundles — produced by `pnpm run package`,
# never committed. Distribute via marketplace, not git.
*.vsix
```

### Step 2: Remove the stale .vsix from git

Run:
```bash
git rm packages/vscode-extension/coherent-language-support-1.0.0.vsix
# Also delete any newly-built ones from Task 1's verification — they shouldn't have been tracked anyway:
rm -f packages/vscode-extension/coherent-language-support-1.0.0-beta.8.vsix
```

The `git rm` removes the tracked stale artifact; the `rm -f` cleans up Task 1's local build output (which would have been an untracked file, but if the .gitignore from Step 1 didn't catch it for any reason, this is belt-and-suspenders).

### Step 3: Verify

Run: `git status packages/vscode-extension/`
Expected: shows the deletion of `coherent-language-support-1.0.0.vsix` and the addition of `.gitignore`. No untracked .vsix files (the .gitignore catches them).

### Step 4: Commit

```bash
git add packages/vscode-extension/.gitignore packages/vscode-extension/coherent-language-support-1.0.0.vsix
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore(vscode-extension): drop stale .vsix, gitignore future builds

Removes packages/vscode-extension/coherent-language-support-1.0.0.vsix
— a months-stale build artifact whose filename version (1.0.0)
doesn't even match the current package.json (1.0.0-beta.8).
Built binaries don't belong in git; the marketplace is the
distribution channel.

Adds `*.vsix` to packages/vscode-extension/.gitignore so future
`pnpm run package` outputs are automatically excluded.

Second commit of Wave 4c (VS Code marketplace publish prep).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Publish-readiness check (`scripts/check-vsix.mjs`)

**Files:**
- Create: `scripts/check-vsix.mjs`

### Step 1: Create the checker

Create `scripts/check-vsix.mjs`:

```js
#!/usr/bin/env node
/**
 * VSIX Publish-Readiness Check
 *
 * Given a freshly-built VS Code extension .vsix, asserts it is
 * well-formed:
 *   - Required files are inside (extension entry, LSP server,
 *     snippets, icon)
 *   - The vsixmanifest's version matches packages/vscode-extension/
 *     package.json
 *
 * Usage:
 *   node scripts/check-vsix.mjs [path/to/file.vsix]
 *
 * If no path is given, picks the newest .vsix under
 * packages/vscode-extension/.
 *
 * Exits non-zero on any failure, prints a clear reason. Designed
 * to be run after `pnpm --filter coherent-language-support run
 * package` in CI.
 *
 * @module scripts/check-vsix
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const EXT_DIR = join(REPO_ROOT, 'packages', 'vscode-extension');

const REQUIRED_ENTRIES = [
  'extension/dist/extension.js',
  'extension/server/server.js',
  'extension/snippets/coherent.json',
  'extension/icon.png',
  'extension/package.json',
  'extension.vsixmanifest',
];

function newestVsixIn(dir) {
  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith('.vsix'))
    .map((f) => ({ name: f, full: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.full || null;
}

function listZipEntries(vsixPath) {
  // .vsix is a zip; macOS, Linux, and Windows runners all have `unzip -l`.
  const out = execFileSync('unzip', ['-l', vsixPath], { encoding: 'utf8' });
  const lines = out.split('\n').slice(3); // skip header
  const entries = [];
  for (const line of lines) {
    // unzip -l format: "  <size>  <date>  <time>   <name>"
    const m = line.match(/^\s*\d+\s+\S+\s+\S+\s+(.+)$/);
    if (m && !m[1].startsWith('--')) entries.push(m[1].trim());
  }
  return entries;
}

function extractFile(vsixPath, entryName) {
  return execFileSync('unzip', ['-p', vsixPath, entryName], { encoding: 'utf8' });
}

function getManifestVersion(vsixPath) {
  const manifest = extractFile(vsixPath, 'extension.vsixmanifest');
  // Match <Identity ... Version="x.y.z" ... />
  const m = manifest.match(/<Identity\s+[^>]*Version="([^"]+)"/);
  if (!m) throw new Error('Could not find <Identity Version="..."> in vsixmanifest');
  return m[1];
}

function getPackageJsonVersion() {
  const pj = JSON.parse(readFileSync(join(EXT_DIR, 'package.json'), 'utf8'));
  return pj.version;
}

function main() {
  const arg = process.argv[2];
  const vsixPath = arg ? resolve(arg) : newestVsixIn(EXT_DIR);
  if (!vsixPath) {
    console.error('❌ No .vsix found. Run `pnpm --filter coherent-language-support run package` first.');
    process.exitCode = 1;
    return;
  }

  console.log(`📦 Checking ${vsixPath.replace(REPO_ROOT + '/', '')}`);

  let entries;
  try {
    entries = listZipEntries(vsixPath);
  } catch (err) {
    console.error('❌ Could not list zip entries:', err.message);
    process.exitCode = 1;
    return;
  }

  const missing = REQUIRED_ENTRIES.filter((req) => !entries.includes(req));
  if (missing.length) {
    console.error('❌ Missing expected entries in vsix:');
    for (const m of missing) console.error('   -', m);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ All ${REQUIRED_ENTRIES.length} required entries present`);

  let manifestVersion;
  try {
    manifestVersion = getManifestVersion(vsixPath);
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
    return;
  }
  const pkgVersion = getPackageJsonVersion();
  if (manifestVersion !== pkgVersion) {
    console.error(`❌ Version mismatch: vsixmanifest=${manifestVersion}, package.json=${pkgVersion}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Version ${manifestVersion} consistent (vsixmanifest ⇔ package.json)`);

  console.log('✅ VSIX publish-readiness check passed.');
}

main();
```

Make it executable:
```bash
chmod +x scripts/check-vsix.mjs
```

### Step 2: Sanity-run the check locally

Run:
```bash
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
```
Expected:
```
📦 Checking packages/vscode-extension/coherent-language-support-1.0.0-beta.8.vsix
✓ All 6 required entries present
✓ Version 1.0.0-beta.8 consistent (vsixmanifest ⇔ package.json)
✅ VSIX publish-readiness check passed.
```

**If a "required entry" is reported missing:** the entry name format in the .vsix may differ slightly from what's hard-coded in `REQUIRED_ENTRIES`. Run `unzip -l packages/vscode-extension/coherent-language-support-*.vsix` directly and look at the actual entry names. Update `REQUIRED_ENTRIES` to match — vsce's directory structure inside the .vsix is its own choice and may evolve across vsce versions.

Clean up the just-built vsix (it's gitignored but cleaning up keeps the working tree tidy):
```bash
rm -f packages/vscode-extension/coherent-language-support-*.vsix
```

### Step 3: Commit

```bash
git add scripts/check-vsix.mjs
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(scripts): add VSIX publish-readiness check

Adds scripts/check-vsix.mjs — given a built .vsix (defaults to
the newest under packages/vscode-extension/), asserts:

1. Required entries are present: extension/dist/extension.js,
   extension/server/server.js, extension/snippets/coherent.json,
   extension/icon.png, extension/package.json,
   extension.vsixmanifest.
2. The vsixmanifest's Identity Version matches
   packages/vscode-extension/package.json's version.

Exits non-zero on any failure with a specific reason. Designed
to run after `pnpm --filter coherent-language-support run
package` in CI (wired up in the next commit).

Catches the common "shipped a broken vsix" failures: an
out-of-date dist not being rebuilt before package, a missing
server bundle from a partially-failed build, or an incorrect
version bump (manifest and package.json drift).

Third commit of Wave 4c (VS Code marketplace publish prep).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire CI vsix job

**Files:**
- Modify: `.github/workflows/ci.yml`

### Step 1: Add the vsix job

Open `.github/workflows/ci.yml`. After the `e2e` job (added in Wave 4b/Task 3), add a new sibling job at the same indentation:

```yaml
  vsix:
    name: VSIX Build & Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.33.0

      - name: Use Node.js 22.x
        uses: actions/setup-node@v6
        with:
          node-version: 22.x
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Package VS Code extension
        run: pnpm --filter coherent-language-support run package

      - name: Check VSIX publish-readiness
        run: node scripts/check-vsix.mjs

      - name: Upload VSIX artifact
        uses: actions/upload-artifact@v7
        with:
          name: coherent-vscode-extension
          path: packages/vscode-extension/*.vsix
          retention-days: 30
```

The artifact upload means every CI run produces a downloadable .vsix — useful for testing changes before they hit the marketplace, and for inspecting a build that failed the check.

### Step 2: Verify YAML

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"`
Expected: `YAML OK`.

### Step 3: Commit

```bash
git add .github/workflows/ci.yml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
ci: add vsix job — build VS Code extension + run publish-readiness check

Adds a new `vsix` job to .github/workflows/ci.yml running parallel
to `test` and `e2e`. Each CI run:

1. Builds the VS Code extension via `pnpm --filter
   coherent-language-support run package` (vscode:prepublish
   lifecycle handles the build step).
2. Runs scripts/check-vsix.mjs to assert the .vsix is well-
   formed (required entries present, manifest/package.json
   version match).
3. Uploads the built .vsix as a 30-day artifact, so PR
   reviewers can pull a copy and sideload it for local
   testing without rebuilding.

Hard gate — if check-vsix fails, the PR fails. The check is
narrow enough that false positives are unlikely; failure here
means the extension would have shipped broken.

Fourth commit of Wave 4c (VS Code marketplace publish prep).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Publish workflow documentation

**Files:**
- Create: `packages/vscode-extension/PUBLISHING.md`
- Modify: `packages/vscode-extension/README.md`

### Step 1: Write PUBLISHING.md

Create `packages/vscode-extension/PUBLISHING.md`:

```markdown
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
- **CI `vsix` job fails with "Missing expected entries"**: `scripts/check-vsix.mjs` has a hard-coded list of expected files. If vsce changed its packaging layout in a major version bump, update the list. Run `unzip -l <vsix>` locally to see the actual entries.
- **`vscode:prepublish` script not firing**: confirm `packages/vscode-extension/package.json` has both `prepublishOnly` and `vscode:prepublish` scripts (added in Wave 4c). Older copies of this package didn't.

## Reference

- vsce CLI docs: https://github.com/microsoft/vscode-vsce
- Publisher management: https://marketplace.visualstudio.com/manage
- Coherent.js extension listing: https://marketplace.visualstudio.com/items?itemName=coherentjs.coherent-language-support
```

### Step 2: Add a pointer from the extension README

Open `packages/vscode-extension/README.md`. Find the existing `## Contributing` section near the end:

```markdown
## Contributing

This extension is part of the [Coherent.js](https://github.com/Tomdrouv1/coherent.js) project. Contributions are welcome!
```

Replace with:

```markdown
## Contributing

This extension is part of the [Coherent.js](https://github.com/Tomdrouv1/coherent.js) project. Contributions are welcome!

Maintainers: see [`PUBLISHING.md`](./PUBLISHING.md) for the marketplace publish workflow.
```

### Step 3: Commit

```bash
git add packages/vscode-extension/PUBLISHING.md packages/vscode-extension/README.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(vscode-extension): add PUBLISHING.md + maintainer pointer

Adds packages/vscode-extension/PUBLISHING.md — the marketplace
publish workflow for maintainers:

- One-time setup: publisher account creation (links to official
  aka.ms/vscodepublishers), PAT scoping (Marketplace:Manage
  only, 1-year max), `vsce login` flow.
- Per-release flow: version bump in lockstep with framework,
  build + check-vsix.mjs gate, local sideload smoke test, vsce
  publish, marketplace verification, git tag.
- Rollback options: unpublish-by-version (destructive),
  republish-with-fix (preferred), nuclear unpublish.
- Troubleshooting for the common failure modes.

Updates the README's Contributing section with a one-line
pointer to PUBLISHING.md for maintainer eyes.

Claude can't actually execute `vsce publish` — that needs the
maintainer's PAT. This doc bridges the gap so the operational
step is explicit and reproducible.

Fifth commit of Wave 4c (VS Code marketplace publish prep).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: CHANGELOG entry

**File:** `CHANGELOG.md`

### Step 1: Add Wave 4c subsections

Open `CHANGELOG.md`. Find the existing `### Notes (Wave 4b)` block. Add after it (before `## [1.0.0-beta.8]`):

```markdown
### Added (Wave 4c)

- **NEW: VS Code extension publish-readiness gate.** `scripts/check-vsix.mjs` unzips a freshly-built `.vsix` and asserts: required entries are present (extension entry, LSP server bundle, snippets, icon, manifest) and the `vsixmanifest`'s Identity Version matches `packages/vscode-extension/package.json`. Catches the common "shipped a broken vsix" failures before they reach the marketplace.
- **NEW: `vsix` CI job.** Builds the extension and runs `check-vsix.mjs` on every PR. Uploads the built `.vsix` as a 30-day artifact so reviewers can sideload and smoke-test without rebuilding locally.
- **NEW: `packages/vscode-extension/PUBLISHING.md`.** End-to-end maintainer documentation: marketplace publisher setup, PAT creation with the correct narrow scope (Marketplace:Manage only, 1-year max), `vsce login` flow, per-release sequence, local smoke-test, rollback options (unpublish-by-version, republish-with-fix, nuclear unpublish), and troubleshooting for the common failure modes.

### Changed (Wave 4c)

- **`packages/vscode-extension/package.json`**: added `vscode:prepublish` and `prepublishOnly` scripts (both alias `pnpm run build`). `vsce package` and `vsce publish` now always rebuild dist/ + server/ — no more "shipped a stale dist" footgun. Also added a `clean` script.

### Removed (Wave 4c)

- **`packages/vscode-extension/coherent-language-support-1.0.0.vsix`** — 4-month-stale committed binary whose filename version (1.0.0) didn't even match the current package.json (1.0.0-beta.8). Built binaries belong on the marketplace, not in git. `packages/vscode-extension/.gitignore` now excludes `*.vsix` so future builds don't sneak back in.

### Notes (Wave 4c)

- **Actual `vsce publish` is NOT automated.** It requires the maintainer's Personal Access Token, which Claude can't and shouldn't handle. PUBLISHING.md documents the exact command. The Wave 4c gates ensure the .vsix is *publishable*; pressing the button is a human step.
- **Version bump to `1.0.0` deferred to Wave 5.** The extension's `package.json` stays at `1.0.0-beta.8` matching the rest of the monorepo. Wave 5's release plan owns the coordinated bump.
- **OpenVSX publish (for VS Code forks: VSCodium, Cursor, etc.) intentionally not added.** Not a 1.0 requirement. Easy follow-up if users on those forks ask for it.
- **Absorbing `vscode-extension` into `@coherent.js/tooling`** (per spec Section 1's 12-package target) is still pending. Structural surgery; deserves its own plan. Wave 4c keeps the extension as a standalone workspace package.
- **CI auto-publish on tag intentionally not added.** Storing a PAT in GitHub Actions secrets is a security surface we don't need to open for 1.0; manual publish is fine for the cadence we expect.
```

### Step 2: Commit

```bash
git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 4c VS Code marketplace publish prep

Documents the new scripts/check-vsix.mjs publish-readiness gate,
the new vsix CI job (with 30-day artifact upload), the new
packages/vscode-extension/PUBLISHING.md maintainer doc, the
prepublish lifecycle scripts (so vsce never ships stale dist/),
and the cleanup of the stale committed .vsix artifact.

Explicitly notes the deferrals: actual `vsce publish` stays
manual (needs maintainer PAT); version bump to 1.0.0 belongs to
Wave 5; OpenVSX publish and tooling-absorption are post-1.0 or
separate-plan concerns; CI auto-publish on tag is a security
surface we don't need to open.

Closes Wave 4c of v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-4c handoff

Wave 4c is done. The VS Code extension is ready for the maintainer to publish whenever they're ready: `pnpm --filter coherent-language-support run package && pnpm --filter coherent-language-support run publish:vsce`.

Next:

- **Wave 4d (optional)** — fill in the remaining two audit-item Playwright flows (mismatch detection, event survival across DOM patches). Defer unless 1.0 specifically blocks on them.
- **Wave 5 — Release** — `MIGRATION-1.0.md` finalization, coordinated `1.0.0` version bump across all packages including `vscode-extension`, `1.0.0-rc.1` tag, 1-2 week soak, `1.0.0` tag. After tagging, run the PUBLISHING.md flow to push the extension to the marketplace.

Follow-up items surfaced by Wave 4c:

- The CI `vsix` job runs the build twice on PRs that also trigger the `test` job (both build all packages). Could refactor to share build artifacts via cache, but the savings are small (~30s on a job that takes 5-10 min total) and the duplication keeps each job independent.
- `check-vsix.mjs` could grow into a broader extension-quality check (README size limits, marketplace metadata completeness, etc.) once we hit a quality issue worth gating. Keep narrow for now.
- The publisher account `coherentjs` either exists or needs creation. PUBLISHING.md links to the aka.ms page but the maintainer needs to confirm publisher ownership before the first publish. Not blocking for Wave 4c — only matters when actually publishing.
