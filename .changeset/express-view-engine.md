---
"@coherent.js/integrations": minor
---

Fix the Express view engine, the typed default export and double responses.

**Behavior change:** `setupCoherent()` no longer registers the Coherent.js view
engine unless you pass `useEngine: true`, and even then it only becomes the
app's `view engine` when none is set. The engine was registered — and took
over `view engine` — by default, yet could never render: without a view file
Express failed with "Failed to lookup view", and with one the component was
rejected as "Invalid component structure" because Express merges `settings`,
`_locals` and `cache` into the options it passes.

The engine now works. Express's own keys are stripped, and a `.js`/`.mjs`/`.cjs`
view module's default export is the component (a function receives the render
locals). Any other view file is only a lookup marker and the locals are
rendered as the component, as before.

```js
// views/home.js
export default ({ name }) => ({ h1: { text: `Hello ${name}` } });

setupCoherent(app, { useEngine: true, engineName: 'js' });
app.get('/', (req, res) => res.render('home', { name: 'Ada' }));
```

**Migration:** apps that call `res.render()` with Coherent.js views must pass
`useEngine: true` to `setupCoherent()`; apps that relied on `setupCoherent()`
setting `view engine` should also `app.set('view engine', 'coherent')`.
`expressEngine()` now returns this same engine.

`@coherent.js/integrations/express` now has the default export its type
declarations always promised; `import coherentExpress from ...` was a
`SyntaxError` at runtime.

`createCoherentHandler()` no longer sends a second response when the factory
already answered (e.g. `res.redirect()`), which raised `ERR_HTTP_HEADERS_SENT`;
a factory that responds itself may now return nothing.
