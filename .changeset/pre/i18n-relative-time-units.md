---
"@coherent.js/i18n": patch
---

Format future dates in `DateFormatter#relative()` with a sensible unit.

Every unit check assumed a past date, so any future date fell through to
seconds: tomorrow read `"in 86,400 seconds"`. `relative()` now picks the largest
unit that fits in either direction — seconds, minutes, hours, days, weeks (from
7 days), months (from 30 days) or years (from 365 days) — and rounds the
difference to the second first, so the milliseconds since the caller built the
date do not turn "tomorrow" into "in 23 hours".

**Behavior change:** past dates of a week or more are now expressed in weeks,
months or years (`"last week"`, `"3 weeks ago"`, `"last month"`) instead of
days (`"7 days ago"`, `"21 days ago"`).
