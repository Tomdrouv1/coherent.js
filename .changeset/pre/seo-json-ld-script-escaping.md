---
"@coherent.js/seo": patch
---

Make JSON-LD safe to embed in a `<script>` element.

Core only rewrites `</script` inside script text, so a structured-data value
containing `<!--<script>` put the HTML parser into the script-data-double-escaped
state and the rest of the page was swallowed into the JSON-LD block.
`StructuredDataBuilder#build()`, `generateStructuredData()` and `toJSON()` now
write `<`, `>`, `&`, U+2028 and U+2029 as `<`, `>`, `&`,
` ` and ` `.

**Behavior change:** the serialized JSON text differs wherever a value contains
one of those characters (for example `"a & b"` becomes `"a & b"`). It
still parses to exactly the same data, so JSON-LD consumers are unaffected;
only code that compares the raw string needs updating.
