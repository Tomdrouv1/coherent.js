# Testing Guide

Coherent.js components are plain JavaScript objects rendered to strings, which
makes them unusually easy to test: call the component function, render it, and
assert on the HTML.

## Setup

Install [Vitest](https://vitest.dev) (projects scaffolded with
`coherent create` already include it):

```bash
pnpm add -D vitest
```

Add a test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

No special configuration is needed — the published packages resolve out of the
box under Vitest's default settings.

## Testing with `render`

The simplest tests use `render` from `@coherent.js/core` directly:

```javascript
import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { HomePage } from '../src/components/HomePage.js';

describe('HomePage', () => {
  it('renders the title', () => {
    const html = render(HomePage({ title: 'Hello' }));
    expect(html).toContain('Hello');
  });

  it('escapes user content', () => {
    const html = render({ div: { text: '<script>alert(1)</script>' } });
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
```

## Testing with `@coherent.js/tooling/testing`

The tooling package ships a richer test harness. `renderComponent` returns a
result object with the rendered HTML plus query helpers:

```javascript
import { describe, it, expect } from 'vitest';
import { renderComponent } from '@coherent.js/tooling/testing';
import { HomePage } from '../src/components/HomePage.js';

describe('HomePage', () => {
  it('renders without errors', () => {
    const { html } = renderComponent(HomePage({}));
    expect(html).toBeTypeOf('string');
    expect(html).toContain('Welcome');
  });
});
```

## Custom matchers

`extendExpect(expect)` adds matchers that read a `renderComponent()` result.
It does not replace Vitest's built-in matchers (`toMatchSnapshot`,
`toHaveBeenCalled*`...):

```javascript
import { describe, it, expect } from 'vitest';
import { renderComponent, extendExpect } from '@coherent.js/tooling/testing';

extendExpect(expect);

const Button = ({ label }) => ({
  button: { className: ['btn', 'btn-primary'], 'data-testid': 'save', text: label }
});

describe('Button', () => {
  it('renders its label and classes', () => {
    const result = renderComponent(Button({ label: 'Save' }));
    expect(result).toHaveText('Save');          // text content, entities decoded
    expect(result).toHaveClass('btn');          // whole class tokens only
    expect(result).not.toHaveClass('btn-prim');
    expect(result.getByTestId('save')).toBeTruthy();
    expect(result).toBeValidHTML();
  });

  it('matches the snapshot', () => {
    expect(renderComponent(Button({ label: 'Save' })).toSnapshot()).toMatchSnapshot();
  });
});
```

`toHaveAttribute` and `toHaveTagName` look at the component's root element.
Mocks from `createMock()` / `createSpy()` work with the built-in
`toHaveBeenCalled*` matchers.

## Reusable smoke tests

A pattern that scales well — one helper asserting any component renders:

```javascript
import { describe, it, expect } from 'vitest';
import { renderComponent } from '@coherent.js/tooling/testing';

export function testComponent(Component, props = {}) {
  describe(Component.name || 'Component', () => {
    it('renders without errors', () => {
      const { html } = renderComponent(Component(props));
      expect(html).toBeTypeOf('string');
      expect(html.length).toBeGreaterThan(0);
    });
  });
}
```

## What to test

- **Output, not structure**: assert on the rendered HTML string, not the
  component object shape — refactors then don't break tests.
- **Props drive branches**: render once per interesting prop combination.
- **Escaping**: if you interpolate user data, assert it arrives escaped.

## See also

- [Component Basics](../components/basics.md)
- [API Reference](../api/reference.md)
