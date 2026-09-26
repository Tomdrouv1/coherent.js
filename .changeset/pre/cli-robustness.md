---
"@coherent.js/cli": minor
---

CLI robustness fixes.

**Behavior change:**

- `bin/coherent.js` no longer catches every error and re-runs the whole CLI
  from `../src` (not shipped, so users saw a misleading "Failed to load"
  message — and a command that failed ran twice in a checkout). Load errors
  and command errors are printed as they are, with exit code 1.
- `coherent dev -h` shows help: the host short flag is now `-H` (`--host` is
  unchanged).
- `coherent dev --open` no longer fails on the undeclared `open` package: it
  prints how to install it and keeps the dev server running. If the command
  does fail after spawning the dev server, the server is stopped instead of
  being orphaned.
- `coherent create` runs the dev server it offers to start attached to the
  terminal (it was `detached` + `unref()`, so Ctrl+C left it running) and exits
  with its status.
- `coherent generate` refuses to overwrite existing files (and writes nothing)
  unless `--force` is passed.
- `coherent create` validates every option before creating anything: an unknown
  `--runtime`/`--database`/`--auth`/`--language` is rejected, and a failed
  scaffold removes the directory it created. `scaffoldProject()` also rejects
  unknown values up front.
- Project names must be a single lowercase npm-style name
  (`[a-z0-9][a-z0-9._-]*`): path separators (`foo/../../x` wrote outside the
  working directory), scoped names, capitals and `@` are rejected.
