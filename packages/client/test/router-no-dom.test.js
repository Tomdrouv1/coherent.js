import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router.js';

describe('router without a DOM', () => {
  it('reports a navigation to a #hash as successful', async () => {
    const router = createRouter();
    router.addRoute('/about', { component: () => () => ({ p: 'About' }) });

    // handleScroll used to call document.querySelector('#team') after the
    // route was committed, so this returned false with the route changed.
    expect(await router.push('/about#team')).toBe(true);
    expect(router.getCurrentRoute().hash).toBe('#team');
  });
});
