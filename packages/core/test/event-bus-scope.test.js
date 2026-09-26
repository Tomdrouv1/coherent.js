import { describe, it, expect, vi } from 'vitest';
import { createEventBus, eventSystem, withEventBus, render } from '../src/index.js';

describe('EventBus.createScope', () => {
  it('prefixes event names and shares listeners with the bus', () => {
    const bus = createEventBus();
    const user = bus.createScope('user');
    const admin = bus.createScope('admin');
    const onUser = vi.fn();
    const onAdmin = vi.fn();
    const onRaw = vi.fn();

    user.on('action', onUser);
    admin.on('action', onAdmin);
    bus.on('user:action', onRaw);
    user.emitSync('action', { id: 1 });

    expect(onUser).toHaveBeenCalledTimes(1);
    expect(onUser.mock.calls[0][0]).toEqual({ id: 1 });
    expect(onRaw).toHaveBeenCalledTimes(1);
    expect(onAdmin).not.toHaveBeenCalled();
  });

  it('removes scoped listeners and nests scopes', () => {
    const bus = createEventBus();
    const nested = bus.createScope('app').createScope('cart');
    const listener = vi.fn();
    const id = nested.on('add', listener);

    bus.emitSync('app:cart:add');
    expect(nested.off('add', id)).toBe(true);
    bus.emitSync('app:cart:add');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('is available on the default event system', () => {
    expect(typeof eventSystem.createScope('user').on).toBe('function');
  });

  it('lets withEventBus({ scope }) components render', () => {
    const Todo = withEventBus({ scope: 'todos', events: { added: () => {} } })(() => ({ ul: { children: [{ li: 'x' }] } }));
    expect(render(Todo())).toBe('<ul><li>x</li></ul>');
  });
});

describe('withEventBus on the server', () => {
  it('does not accumulate listeners across renders', async () => {
    const { globalEventBus } = await import('../src/index.js');
    const before = globalEventBus.getEventListeners('ssr-added').length;
    const List = withEventBus({ events: { 'ssr-added': () => {} } })(() => ({ ul: { children: [{ li: 'x' }] } }));

    for (let i = 0; i < 200; i++) render(List());

    expect(globalEventBus.getEventListeners('ssr-added').length).toBe(before);
  });
});
