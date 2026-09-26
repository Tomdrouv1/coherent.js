---
"@coherent.js/database": patch
---

PostgreSQL: convert `?` placeholders to `$n` without touching the rest of the SQL.

Every `?` was rewritten, including ones inside string literals (`WHERE question = 'Why?'` became `'Why$1'` and shifted every later parameter) and the JSONB operators `?|` / `?&`. `?` inside single-quoted strings (including `E'...'`), double-quoted identifiers, dollar-quoted strings and comments is now left alone, and `?|` / `?&` are kept as operators.

**Behavior change:** the JSONB key-exists operator `?` cannot be told apart from a placeholder. Write it as `??` (sent to PostgreSQL as a single `?`), or use `jsonb_exists(column, key)`.
