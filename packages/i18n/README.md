# @coherent.js/i18n

[![npm version](https://img.shields.io/npm/v/@coherent.js/i18n.svg)](https://www.npmjs.com/package/@coherent.js/i18n)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Internationalization utilities for Coherent.js applications.

- ESM-only, Node 20+
- Translator + locale management
- Date/number/currency/list formatters

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/i18n
```


## Exports

Internationalization utilities

### Modular Imports (Tree-Shakable)

- i18n utilities: `@coherent.js/i18n`

### Example Usage

```javascript
import { createTranslator, createFormatters, createLocaleManager } from '@coherent.js/i18n';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
## Quick start

JavaScript (ESM):
```js
import { createTranslator } from '@coherent.js/i18n';

const translator = createTranslator({ defaultLocale: 'en' });
translator.addTranslations('en', { hello: 'Hello, {{name}}!' });
translator.addTranslations('fr', { hello: 'Bonjour, {{name}} !' });

console.log(translator.t('hello', { name: 'Coherent' })); // Hello, Coherent!
translator.setLocale('fr');
console.log(translator.t('hello', { name: 'Coherent' })); // Bonjour, Coherent !
```

`setLocale('fr-FR')` resolves to the closest loaded locale (`fr` here); a key
missing from a regional locale is looked up in its language, then in the
fallback locale.

### Server-side rendering: one translator per request

`setLocale()` changes the shared instance's current locale, so on a server
where concurrent requests render with the same translator, one request's
locale leaks into another's output. Keep `setLocale()` for the browser and
bind a translator to each request instead:

```js
// Created once at startup
const i18n = createTranslator({ defaultLocale: 'en' });
i18n.addTranslations('en', { hello: 'Hello, {{name}}!' });
i18n.addTranslations('fr', { hello: 'Bonjour, {{name}} !' });

// Per request — never mutates `i18n`
app.get('/', (req, res) => {
  const { t } = i18n.forLocale(req.acceptsLanguages('en', 'fr') || 'en');
  res.send(render({ p: { text: t('hello', { name: req.query.name }) } }));
});
```

`forLocale(locale)` resolves the locale like `setLocale()` (falling back to
the fallback locale without a warning, since request locales are untrusted)
and returns `{ locale, t, has, getLocale }`. Pass `{ escape: true }` as a
second argument to escape params in every call.

TypeScript:
```ts
import { createTranslator } from '@coherent.js/i18n';

const translator = createTranslator({ defaultLocale: 'en' });
translator.addTranslations('en', { hello: 'Hello, {{name}}!' });

console.log(translator.t('hello', { name: 'TS' }));
```

### Rendering translations safely

Interpolated params are inserted verbatim by default. Render translations
through core's `text:` property, which HTML-escapes the whole string — that is
the safe sink:

```js
{ p: { text: translator.t('hello', { name: userInput }) } }
```

If a translation contains markup and has to go through `html:`, escape the
params (the translation template itself is trusted and never escaped), either
per call or for every call:

```js
translator.addTranslations('en', { joined: '<strong>{{name}}</strong> joined' });

{ p: { html: translator.t('joined', { name: userInput }, { escape: true }) } }

const safe = createTranslator({ escape: true }); // escape params on every call
```

The third argument of `t()` is either a locale string or
`{ locale, escape }`.

### Formatters and locale

```js
import { createFormatters, createLocaleManager } from '@coherent.js/i18n';

const locales = createLocaleManager({ defaultLocale: 'en-US' });
const fmt = createFormatters(locales.getLocale());

fmt.date.format(new Date());        // 1/15/2026
fmt.number.format(12345.678);       // 12,345.678
fmt.currency.format(1999.99);       // $1,999.99
```

## Exports

- `@coherent.js/i18n` (index)
- `@coherent.js/i18n/translator`
- `@coherent.js/i18n/formatters`
- `@coherent.js/i18n/locale`

## Development

```bash
pnpm --filter @coherent.js/i18n run test
pnpm --filter @coherent.js/i18n run test:watch
pnpm --filter @coherent.js/i18n run typecheck
```

## License

MIT © Coherent.js Team
