---
"@coherent.js/cli": patch
---

Add `coherent dev --fs-allow <dirs>`.

The built-in dev server accepts an `fsAllow` list of extra directories it may
serve files from (`startDevServer({ fsAllow })` / `createStaticHandler({ fsAllow
})`), but `coherent dev` offered no way to set it: `--fs-allow` was an unknown
option, so a directory linked into the project from outside it and its
workspace was always answered with `403`. `--fs-allow` takes comma-separated
directories, absolute or relative to the project root, and can be repeated
(`--fs-allow ../shared,../assets --fs-allow /opt/fonts`). Dotfiles stay refused.
