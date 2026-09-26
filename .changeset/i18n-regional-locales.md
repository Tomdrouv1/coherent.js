---
"@coherent.js/i18n": patch
---

Resolve regional locales to their language and pluralize fallback text with
the right rules.

- `setLocale('fr-FR')` fell back to `en` even when `fr` was loaded. Locales
  now resolve to the closest loaded one, dropping trailing subtags
  (`zh-Hant-TW` → `zh-Hant` → `zh`), case-insensitively and with `_` accepted
  for `-`. `t()` with a locale override and `has()` resolve the same way, and a
  key missing from `fr-CA` is looked up in `fr` before the fallback locale.
- When a message came from the fallback locale, its plural form was picked with
  the target locale's rules: in Russian, English fallback text for 21 items
  read `"21 item"`. The plural category now comes from the language the message
  is written in (keeping the regional rules, e.g. `pt-PT`, when the message is
  from the same language).
- A locale tag that `Intl.PluralRules` rejects (such as `en_US`) no longer
  throws; the simple one/other rule is used.

**Behavior change:** after `setLocale('fr-FR')` with only `fr` loaded,
`getLocale()` returns `'fr'` (it returned the fallback, `'en'`, before) and
translations come from `fr`.
