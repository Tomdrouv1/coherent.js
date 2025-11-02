# @coherentjs/i18n

[![npm version](https://img.shields.io/npm/v/@coherentjs/i18n.svg)](https://www.npmjs.com/package/@coherentjs/i18n)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Internationalization utilities for Coherent.js applications.

- ESM-only, Node 20+
- Translator + locale management
- Date/number/currency/list formatters

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherentjs/i18n
```

## Quick start

JavaScript (ESM):
```js
import { createTranslator } from '@coherentjs/i18n/translator';

const t = createTranslator({
  en: { hello: 'Hello, {name}!' },
  fr: { hello: 'Bonjour, {name} !' }
}, { locale: 'en' });

console.log(t('hello', { name: 'Coherent' }));
```

TypeScript:
```ts
import { createTranslator } from '@coherentjs/i18n/translator';

type Messages = {
  hello: string;
};

const t = createTranslator<{ en: Messages; fr: Messages }>({
  en: { hello: 'Hello, {name}!' },
  fr: { hello: 'Bonjour, {name} !' }
}, { locale: 'en' });

console.log(t('hello', { name: 'TS' }));
```

### Formatters and locale

```js
import { createFormatters } from '@coherentjs/i18n/formatters';
import { createLocaleManager } from '@coherentjs/i18n/locale';

const locale = createLocaleManager('en-US');
const fmt = createFormatters(locale.current());

fmt.date(new Date());
fmt.number(12345.678);
fmt.currency(1999.99, 'USD');
```

## Exports

- `@coherentjs/i18n` (index)
- `@coherentjs/i18n/translator`
- `@coherentjs/i18n/formatters`
- `@coherentjs/i18n/locale`

## Development

```bash
pnpm --filter @coherentjs/i18n run test
pnpm --filter @coherentjs/i18n run test:watch
pnpm --filter @coherentjs/i18n run typecheck
```

## License

MIT © Coherent.js Team
