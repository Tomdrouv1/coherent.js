---
"@coherent.js/database": patch
"@coherent.js/api": patch
"@coherent.js/client": patch
"@coherent.js/tooling": patch
"@coherent.js/integrations": patch
---

Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).

- **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
- **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
- **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
- **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
- **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
