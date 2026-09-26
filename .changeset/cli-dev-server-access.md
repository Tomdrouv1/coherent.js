---
"@coherent.js/cli": minor
---

Lock down the built-in dev server (`coherent dev --coherent`).

It served `/.env` and `/.git/config`, followed a symlink inside the project to
any file on disk, answered any `Host` header (so a DNS-rebinding page could
read it), accepted HMR WebSocket connections from any `Origin`, and broadcast
absolute file paths to them.

**Behavior change:**

- Files are served only when their real path (after symlinks) is inside the
  project root, the workspace root that contains it (pnpm-workspace.yaml,
  lerna.json or `workspaces`), the real directory of the `node_modules/<pkg>`
  entry the URL goes through (so `npm link`/`link:` dependencies still load),
  or a directory passed in the new `fsAllow` option. Anything else is `403`.
- Dotfiles and dot-directories (`.env`, `.git`, `.npmrc`, …) are `403`, whether
  named in the URL or reached through a symlink. pnpm's `node_modules/.pnpm`
  layout is unaffected.
- Requests whose `Host` is not `localhost`/`*.localhost`, an IP address, the
  bound `host`, or an entry of the new `allowedHosts` option (also
  `--allowed-hosts a,b`) get `403`. WebSocket upgrades are additionally refused
  when a browser `Origin` belongs to another host.
- `hmr-update` messages carry root-relative paths: `filePath` is now the same
  root-relative value as `webPath`. Error messages no longer include absolute
  paths, and malformed URLs get `400` instead of `500`.
