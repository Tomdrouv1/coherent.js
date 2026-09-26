---
"@coherent.js/cli": patch
---

Scaffolded auth no longer signs tokens with a public secret.

Generated JWT and session auth read `process.env.JWT_SECRET || 'your-secret-key-change-this'`
(and the session equivalent), the scaffold wrote a known placeholder into `.env`,
and nothing ever loaded `.env` — so every generated app signed tokens and session
cookies with a value published in this CLI's source.

**Behavior change:** `coherent create --auth jwt|session` now writes a freshly
generated random secret (`crypto.randomBytes(32)`, hex) into the git-ignored
`.env`, and an empty `JWT_SECRET=` / `SESSION_SECRET=` placeholder into
`.env.example` (appended, so the database settings are kept). The generated auth
module has no fallback: the app throws at startup when the secret is missing.
The generated `start` and `dev` scripts load `.env` with
`node --env-file-if-exists=.env` (`tsx watch --env-file-if-exists=.env` for
TypeScript), and the generated `package.json` declares `engines.node >=22.12.0`
accordingly. Deployments that relied on the old default must set the secret in
their environment.
