---
"@coherent.js/cli": patch
---

`coherent debug performance`, `debug hydration` and `debug bundle` no longer
print canned data.

They reported the same made-up results for every project — a "UserList …
virtualization" bottleneck, a "UserProfile" hydration mismatch, a 245KB bundle —
and `debug hydration --url http://127.0.0.1:1` reported success.

**Behavior change:**

- `debug performance` times real requests to `--url` (default
  `http://localhost:3000`): min/median/mean/p95/max, status codes and response
  size. Profiling a single component (`debug performance <component>`) and
  `--memory` are not implemented and now say so.
- `debug hydration` fetches `--url` and counts the hydration markers in the
  server HTML (`data-coherent-component`, `data-hydrate`, `data-state`, …),
  optionally per `--components`. It does not claim to detect mismatches —
  those surface in the browser console. `--compare` is not implemented and
  says so.
- `debug bundle` sums the actual files in the build directory.
- Any analysis whose status is `error` (unreachable URL, non-2xx page,
  unimplemented option) exits with code 1.
