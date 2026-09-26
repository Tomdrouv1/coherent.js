import { describe, it, expect, vi } from 'vitest';
import { memo, render } from '../src/index.js';

describe('memo', () => {
  it('gives every memoized component its own cache', () => {
    const AdminPanel = memo(({ id }) => ({ div: { text: `ADMIN secrets for ${id}` } }));
    const UserCard = memo(({ id }) => ({ div: { text: `user card ${id}` } }));

    expect(render(AdminPanel({ id: 1 }))).toBe('<div>ADMIN secrets for 1</div>');
    expect(render(UserCard({ id: 1 }))).toBe('<div>user card 1</div>');
  });

  it('tells callback props apart', () => {
    const Item = memo(({ onSelect }) => ({ span: { text: onSelect() } }));

    expect(render(Item({ onSelect: () => 'A' }))).toBe('<span>A</span>');
    expect(render(Item({ onSelect: () => 'B' }))).toBe('<span>B</span>');
  });

  it('returns the cached result for equal props', () => {
    const impl = vi.fn(({ n }) => ({ b: { text: String(n) } }));
    const Bold = memo(impl);

    expect(Bold({ n: 1 })).toBe(Bold({ n: 1 }));
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('supports the original memo(fn, keyFn) signature', () => {
    const impl = vi.fn((props) => ({ p: { text: props.label } }));
    const Label = memo(impl, (props) => props.id);

    Label({ id: 1, label: 'first' });
    expect(render(Label({ id: 1, label: 'ignored' }))).toBe('<p>first</p>');
    expect(impl).toHaveBeenCalledTimes(1);
    // keyFn gets {} when called without props, as before
    expect(() => Label()).not.toThrow();
  });

  it('caches falsy results', () => {
    const impl = vi.fn(() => 0);
    const zero = memo(impl);

    expect(zero()).toBe(0);
    expect(zero()).toBe(0);
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('evicts beyond maxSize and reports statistics', () => {
    const square = memo((n) => n * n, { maxSize: 2, stats: true });
    square(1);
    square(2);
    square(3); // evicts 1
    square(1); // miss again

    expect(square.stats()).toEqual({ hits: 0, misses: 4, evictions: 2 });
    expect(square.size()).toBe(2);
  });

  it('expires entries with the ttl strategy without timers', () => {
    vi.useFakeTimers();
    try {
      const impl = vi.fn((n) => ({ n }));
      const timed = memo(impl, { strategy: 'ttl', ttl: 1000 });
      const first = timed(1);

      expect(timed(1)).toBe(first);
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(1001);
      expect(timed(1)).not.toBe(first);
      expect(impl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keys the weak strategy on the first argument\'s identity', () => {
    const impl = vi.fn((user) => ({ span: { text: user.name } }));
    const byUser = memo(impl, { strategy: 'weak' });
    const ada = { name: 'Ada' };

    expect(byUser(ada)).toBe(byUser(ada));
    expect(byUser({ name: 'Ada' })).not.toBe(byUser(ada));
    expect(impl).toHaveBeenCalledTimes(2);

    // Primitive first arguments can't key a WeakMap: called, never cached.
    byUser('guest');
    byUser('guest');
    expect(impl).toHaveBeenCalledTimes(4);
  });

  it('calls through when arguments cannot be serialized', () => {
    const impl = vi.fn(() => 'ok');
    const f = memo(impl);
    const circular = {};
    circular.self = circular;

    expect(f(circular)).toBe('ok');
    expect(f(circular)).toBe('ok');
    expect(impl).toHaveBeenCalledTimes(2);
  });

});
