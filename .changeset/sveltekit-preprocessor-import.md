---
"@coherent.js/integrations": patch
---

Make the SvelteKit preprocessor's output compile and render. It rewrote
`<coherent>{...}</coherent>` blocks to `{@html coherentRender(...)}` but never
imported or defined `coherentRender`, so every component using it failed with
`ReferenceError: coherentRender is not defined`. The preprocessor now imports
`render` from `@coherent.js/core` into the component's instance script (adding
one if needed, without shifting line numbers) and calls it under a private
name. `$` sequences inside blocks are also no longer mangled.
