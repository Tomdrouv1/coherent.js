---
"@coherent.js/cli": patch
---

`coherent generate api users` works: API names no longer have to be
PascalCase.

Every `generate` type was validated with the component rule, so the README's
own `coherent generate api users` exited 1 with "Name should start with a
capital letter (PascalCase)". API names (`api`, `route`, `r`) may now use any
case (`users`, `user-profile`, `UserProfile`); components and pages keep the
PascalCase rule.
