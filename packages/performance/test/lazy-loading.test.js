import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LazyLoader, ImageLazyLoader, ResourcePreloader, ProgressiveImageLoader, createLazyLoader, lazyImage, progressiveImage } from '../src/lazy-loading.js';

describe('LazyLoader', () => {
  it('creates without IntersectionObserver (server-side)', () => {
    const loader = new LazyLoader();
    expect(loader.observer).toBeNull();
  });

  it('observe is a no-op without observer', () => {
    const loader = new LazyLoader();
    const el = {};
    loader.observe(el);
    expect(loader.observed.size).toBe(0);
  });

  it('disconnect clears observed set', () => {
    const loader = new LazyLoader();
    loader.observed.add('test');
    loader.disconnect();
    expect(loader.observed.size).toBe(0);
  });
});

describe('ImageLazyLoader', () => {
  it('creates image component with placeholder', () => {
    const loader = new ImageLazyLoader();
    const img = loader.createImage('https://example.com/photo.jpg', { alt: 'Photo' });

    expect(img.img.src).toContain('data:image/svg+xml');
    expect(img.img['data-src']).toBe('https://example.com/photo.jpg');
    expect(img.img.alt).toBe('Photo');
    expect(img.img.loading).toBe('lazy');
  });

  it('uses custom placeholder', () => {
    const loader = new ImageLazyLoader({ placeholder: '/placeholder.png' });
    const img = loader.createImage('https://example.com/photo.jpg');
    expect(img.img.src).toBe('/placeholder.png');
  });

  it('applies custom CSS classes', () => {
    const loader = new ImageLazyLoader({
      loadingClass: 'my-loading',
      loadedClass: 'my-loaded',
      errorClass: 'my-error'
    });
    const img = loader.createImage('https://example.com/photo.jpg');
    expect(img.img.className).toBe('my-loading');
    expect(img.img.onload).toContain('my-loaded');
    expect(img.img.onerror).toContain('my-error');
  });
});

describe('ResourcePreloader', () => {
  it('tracks preloaded state', () => {
    const preloader = new ResourcePreloader();
    expect(preloader.isPreloaded('test.js')).toBe(false);
    preloader.preloaded.add('test.js');
    expect(preloader.isPreloaded('test.js')).toBe(true);
  });

  it('clear resets state', () => {
    const preloader = new ResourcePreloader();
    preloader.preloaded.add('a');
    preloader.preloading.set('b', Promise.resolve());
    preloader.clear();
    expect(preloader.preloaded.size).toBe(0);
    expect(preloader.preloading.size).toBe(0);
  });
});

describe('ProgressiveImageLoader', () => {
  it('creates progressive image with low and high res sources', () => {
    const loader = new ProgressiveImageLoader();
    const result = loader.createImage('/low.jpg', '/high.jpg', { alt: 'Test' });

    expect(result.div.className).toBe('progressive-image');
    expect(result.div.children).toHaveLength(2);
    expect(result.div.children[0].img.src).toBe('/low.jpg');
    expect(result.div.children[1].img['data-src']).toBe('/high.jpg');
  });
});

describe('createLazyLoader', () => {
  it('returns a LazyLoader instance', () => {
    expect(createLazyLoader()).toBeInstanceOf(LazyLoader);
  });
});

describe('lazyImage', () => {
  it('returns image component object', () => {
    const result = lazyImage('https://example.com/img.jpg');
    expect(result.img).toBeDefined();
    expect(result.img['data-src']).toBe('https://example.com/img.jpg');
  });
});

describe('progressiveImage', () => {
  it('returns progressive image component object', () => {
    const result = progressiveImage('/low.jpg', '/high.jpg');
    expect(result.div.className).toBe('progressive-image');
    expect(result.div.children).toHaveLength(2);
  });
});
