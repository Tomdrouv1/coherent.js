/**
 * Custom matchers, exercised against this package's own renderComponent().
 *
 * Regression coverage for extendExpect() replacing Vitest built-ins
 * (toMatchSnapshot always passed and never wrote a snapshot, disabling
 * snapshot testing for the whole run; toHaveBeenCalledWith compared with
 * ===), and for matchers that did not work on renderComponent() output:
 * toHaveText got null, toHaveClass('btn') matched "btn-primary", and
 * toBeValidHTML rejected void elements.
 */

import { describe, it, expect, vi } from 'vitest';
import { customMatchers, extendExpect, assertions } from '../../src/testing/matchers.js';
import { renderComponent } from '../../src/testing/test-renderer.js';
import { createMock } from '../../src/testing/test-utils.js';

extendExpect(expect);

const card = () => renderComponent({
  div: {
    className: 'btn-primary card',
    id: 'main',
    'data-testid': 'card',
    children: [
      { h2: { className: 'btn', 'data-testid': 'title', text: 'Tom & "Jerry" <3' } },
      { input: { type: 'text', name: 'q', disabled: true, value: 'a&b' } },
      { br: {} },
      { img: { src: 'x.png', alt: '' } },
      { p: { text: 'Second' } }
    ]
  }
});

describe('Vitest built-ins stay intact after extendExpect()', () => {
  it('does not register matchers under built-in names', () => {
    const builtIns = [
      'toMatchSnapshot', 'toMatchInlineSnapshot', 'toHaveBeenCalled',
      'toHaveBeenCalledWith', 'toHaveBeenCalledTimes', 'toEqual', 'toContain'
    ];
    for (const name of builtIns) {
      expect(Object.keys(customMatchers)).not.toContain(name);
    }
  });

  it('toHaveBeenCalledWith still compares arguments deeply', () => {
    const fn = vi.fn();
    fn({ id: 1 }, ['a']);
    expect(fn).toHaveBeenCalledWith({ id: 1 }, ['a']);
    expect(() => expect(fn).toHaveBeenCalledWith({ id: 2 }, ['a'])).toThrow();
  });

  it('toMatchSnapshot is still the snapshot matcher', () => {
    // Only the built-in refuses `.not` (the override passed everything)
    expect(() => expect('x').not.toMatchSnapshot()).toThrow(/cannot be used with "not"/);
    expect(card().toSnapshot()).toMatchInlineSnapshot(`"<div class="btn-primary card" id="main" data-testid="card"><h2 class="btn" data-testid="title">Tom &amp; &quot;Jerry&quot; &lt;3</h2><input type="text" name="q" disabled value="a&amp;b"><br><img src="x.png" alt=""><p>Second</p></div>"`);
  });

  it('createMock() works with the built-in call matchers', () => {
    const mock = createMock();
    mock({ id: 1 });
    expect(mock).toHaveBeenCalled();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith({ id: 1 });
    expect(() => expect(mock).toHaveBeenCalledWith({ id: 2 })).toThrow();
  });
});

describe('matchers on renderComponent() output', () => {
  it('toHaveText / toContainText read the rendered text', () => {
    const result = card();
    expect(result).toHaveText('Tom & "Jerry" <3Second');
    expect(result).toContainText('Jerry');
    expect(result.getByTestId('title')).toHaveText('Tom & "Jerry" <3');
    expect(renderComponent({ span: { text: 'Hello' } })).toHaveText('Hello');
    expect(renderComponent({ span: { text: 'Hello' } })).not.toHaveText('Hell');
  });

  it('toHaveClass matches whole class tokens of the element', () => {
    const result = card();
    expect(result).toHaveClass('card');
    expect(result).toHaveClass('btn-primary card');
    expect(result).not.toHaveClass('btn');
    expect(result.getByTestId('title')).toHaveClass('btn');
    expect(result.getByTestId('title')).not.toHaveClass('bt');
    expect(() => assertions.assertHasClass(result, 'btn')).toThrow();
    assertions.assertHasClass(result, 'card');
  });

  it('getByClassName matches whole class tokens', () => {
    const result = card();
    expect(result.getByClassName('btn')).toHaveText('Tom & "Jerry" <3');
    expect(result.queryByClassName('btn-prim')).toBeNull();
  });

  it('toHaveAttribute and toHaveTagName look at the element itself', () => {
    const result = card();
    expect(result).toHaveTagName('div');
    expect(result).not.toHaveTagName('d');
    expect(result).toHaveAttribute('id', 'main');
    expect(result).not.toHaveAttribute('id', 'mai');
    expect(result).not.toHaveAttribute('testid');
    expect(result.getByTestId('title')).toHaveTagName('h2');

    const input = renderComponent({ input: { type: 'text', disabled: true, value: 'a&b' } });
    expect(input).toHaveAttribute('disabled');
    expect(input).toHaveAttribute('value', 'a&b');
  });

  it('toBeValidHTML accepts void elements and rejects broken markup', () => {
    expect(card()).toBeValidHTML();
    expect('<!DOCTYPE html><html><body><br><hr><img src="a"><p>x</p><!-- <b> --></body></html>').toBeValidHTML();
    expect('<script>if (a < b) document.write("<p>")</script>').toBeValidHTML();
    expect('<div><p>x</div></p>').not.toBeValidHTML();
    expect('<div><span>x</span>').not.toBeValidHTML();
    expect('<br></br>').not.toBeValidHTML();
  });

  it('toBeValidHTML stays fast on hostile input', () => {
    const started = performance.now();
    expect('<'.repeat(20000)).not.toBeValidHTML();
    expect('<!--'.repeat(20000)).not.toBeValidHTML();
    expect('<a '.repeat(20000)).not.toBeValidHTML();
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('toBeVisible / toBeEmpty / toRenderSuccessfully use rendered content', () => {
    expect(card()).toBeVisible();
    expect(renderComponent({ div: {} })).toBeEmpty();
    expect(card()).toRenderSuccessfully();
    expect(card().getByTestId('card')).toBeInTheDocument();
    expect(card().queryByTestId('nope')).not.toBeInTheDocument();
  });
});
