---
"@coherent.js/api": patch
---

JWT signatures and password hashes are compared in constant time.

`verifyToken()` compared the received signature with `!==` and `verifyPassword()` compared hashes with `===`; both stop at the first differing character, which leaks through response timing how much of a forged value is correct. Both now use `crypto.timingSafeEqual` (a length mismatch is rejected up front). The stored `"<salt>:<hash>"` format and its parameters (PBKDF2-SHA512, 10,000 iterations) are unchanged, so existing hashes keep verifying; the docs now say that this iteration count is below current OWASP guidance and that both functions are synchronous.
