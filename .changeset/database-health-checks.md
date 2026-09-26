---
"@coherent.js/database": minor
---

Start the connection health checks, and stop the backup helpers from pretending to work.

- `DatabaseManager.connect()` never started its periodic health checks: it looked for `adapter.startHealthChecks` (which no adapter has) and would have called `this.startHealthChecks()` (the method is `startHealthCheck`). Health checks now start after connecting when the adapter can test its connection (`testConnection` or `ping`), run every `healthCheckInterval` ms (default 30000), emit `healthCheck` events with `status: 'healthy' | 'unhealthy'`, stop on `close()`, and do not keep the process alive. Pass `healthCheck: false` to turn them off; an invalid `healthCheckInterval` throws when the manager is created.
- The internal `createBackup()` / `restoreBackup()` helpers only logged "Backup would be created at ..." and returned. **Behavior change:** they now throw "not implemented"; use the database's own backup and restore tools.
