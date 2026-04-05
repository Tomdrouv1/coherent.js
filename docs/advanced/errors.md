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
  - Circular references in component trees
  - Exceeding maximum render depth
  - Exceptions thrown inside function components

If available, rendering errors may include:

- `context.path`: The render tree path where the error occurred.
- `context.renderer`: The renderer that produced the error.

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
