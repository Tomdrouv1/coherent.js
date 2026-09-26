# Error Codes

Coherent.js errors include a stable `code` field (e.g. `COHERENT_RENDERING`) intended for:

- Identifying errors reliably across versions.
- Searching / linking to docs.
- Filtering or grouping in logs.

Each `CoherentError` also includes a `docsUrl` field pointing to this page.

## Summary

| Code | Meaning |
| --- | --- |
| `COHERENT_GENERIC` | Fallback error type when no specific category is detected. |
| `COHERENT_VALIDATION` | Invalid component structure or invalid inputs. |
| `COHERENT_RENDERING` | Failure during rendering (SSR). |
| `COHERENT_PERFORMANCE` | Performance-related warnings/errors. |
| `COHERENT_STATE` | State management errors. |

> If you pass a custom `type`, the default code becomes `COHERENT_${type.toUpperCase()}`.

<h2 id="COHERENT_GENERIC">COHERENT_GENERIC</h2>

Generic error category.

- **Common causes**
  - Unexpected runtime exceptions
  - Missing context for classification

<h2 id="COHERENT_VALIDATION">COHERENT_VALIDATION</h2>

Component validation error category.

- **Common causes**
  - Invalid component object structure
  - Missing required properties
  - Wrong types in props

<h2 id="COHERENT_RENDERING">COHERENT_RENDERING</h2>

Rendering error category.

- **Common causes**
  - Exceptions thrown inside function components
  - A Promise (or `async` component) in the tree: `render()` is synchronous
  - An attribute name containing whitespace, quotes, `<`, `>`, `/`, `=` or control characters
  - Circular references in component trees (the same object may appear several times, but not inside itself)
  - Exceeding maximum render depth

`render()` and `renderToStream()` throw a `RenderingError` (`name: 'RenderingError'`) that includes:

- `renderPath` / `context.path`: the render tree path where the error occurred, e.g. `root.div.children[0]`.
- `context.renderer`: the renderer that produced the error.
- `cause`: the original error thrown by your component.

To render a replacement instead of failing, pass `onError: (error, { path }) => replacement` to `render()` (`null` omits the component), or wrap the component with `createErrorBoundary()`.

Errors are also logged by core's error handler in development. `COHERENT_SILENT=1` turns that logging off and `COHERENT_DEBUG=1` turns it on in any environment.

<h2 id="COHERENT_PERFORMANCE">COHERENT_PERFORMANCE</h2>

Performance error category.

- **Common causes**
  - Slow renders
  - Excessive memory usage

<h2 id="COHERENT_STATE">COHERENT_STATE</h2>

State error category.

- **Common causes**
  - Invalid state updates
  - Mutating state unexpectedly
  - Incorrect state initialization
