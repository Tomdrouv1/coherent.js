/**
 * Coherent.js Lazy Loading
 * 
 * Utilities for lazy loading resources
 * 
 * @module performance/lazy-loading
 */

/**
 * Lazy Loader
 * Manages lazy loading of images, scripts, and other resources
 */
export class LazyLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    };
    
    this.observer = null;
    this.observed = new Set();
    this.loaded = new Set();
    
    this.initObserver();
  }

  /**
   * Initialize Intersection Observer
   */
  initObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
  }

  /**
   * Handle intersection
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadElement(entry.target);
      }
    });
  }

  /**
   * Observe an element
   */
  observe(element) {
    if (!this.observer || this.observed.has(element)) {
      return;
    }

    this.observer.observe(element);
    this.observed.add(element);
  }

  /**
   * Unobserve an element
   */
  unobserve(element) {
    if (!this.observer) {
      return;
    }

    this.observer.unobserve(element);
    this.observed.delete(element);
  }

  /**
   * Load an element
   */
  loadElement(element) {
    if (this.loaded.has(element)) {
      return;
    }

    // Load based on element type
    if (element.tagName === 'IMG') {
      this.loadImage(element);
    } else if (element.tagName === 'SCRIPT') {
      this.loadScript(element);
    } else if (element.tagName === 'IFRAME') {
      this.loadIframe(element);
    }

    this.loaded.add(element);
    this.unobserve(element);
  }

  /**
   * Load image
   */
  loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (src) {
      img.src = src;
    }

    if (srcset) {
      img.srcset = srcset;
    }

    img.classList.add('loaded');
  }

  /**
   * Load script
   */
  loadScript(script) {
    const src = script.dataset.src;
    
    if (src) {
      script.src = src;
    }
  }

  /**
   * Load iframe
   */
  loadIframe(iframe) {
    const src = iframe.dataset.src;
    
    if (src) {
      iframe.src = src;
    }
  }

  /**
   * Disconnect observer
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observed.clear();
  }
}

/**
 * Image lazy loader
 */
export class ImageLazyLoader {
  constructor(options = {}) {
    this.options = {
      placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
      loadingClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      errorClass: 'lazy-error',
      ...options
    };
    
    this.loader = new LazyLoader(options);
  }

  /**
   * Create lazy image component
   */
  createImage(src, options = {}) {
    return {
      img: {
        src: this.options.placeholder,
        'data-src': src,
        'data-srcset': options.srcset,
        alt: options.alt || '',
        className: this.options.loadingClass,
        loading: 'lazy',
        onload: `this.classList.add("${  this.options.loadedClass  }")`,
        onerror: `this.classList.add("${  this.options.errorClass  }")`
      }
    };
  }

  /**
   * Observe images
   */
  observe(selector = 'img[data-src]') {
    if (typeof document === 'undefined') {
      return;
    }

    const images = document.querySelectorAll(selector);
    images.forEach(img => this.loader.observe(img));
  }

  /**
   * Load all images immediately
   */
  loadAll() {
    this.observed.forEach(element => {
      this.loader.loadElement(element);
    });
  }
}

/**
 * Resource preloader
 */
export class ResourcePreloader {
  constructor() {
    this.preloaded = new Set();
    this.preloading = new Map();
  }

  /**
   * Preload an image
   */
  async preloadImage(src) {
    if (this.preloaded.has(src)) {
      return;
    }

    if (this.preloading.has(src)) {
      return this.preloading.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloaded.add(src);
        this.preloading.delete(src);
        resolve(img);
      };
      img.onerror = () => {
        this.preloading.delete(src);
        reject(new Error(`Failed to preload image: ${src}`));
      };
      img.src = src;
    });

    this.preloading.set(src, promise);
    return promise;
  }

  /**
   * Preload multiple images
   */
  async preloadImages(sources) {
    return Promise.all(sources.map(src => this.preloadImage(src)));
  }

  /**
   * Preload a script
   */
  async preloadScript(src) {
    if (this.preloaded.has(src)) {
      return;
    }

    if (this.preloading.has(src)) {
      return this.preloading.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      link.onload = () => {
        this.preloaded.add(src);
        this.preloading.delete(src);
        resolve();
      };
      link.onerror = () => {
        this.preloading.delete(src);
        reject(new Error(`Failed to preload script: ${src}`));
      };
      document.head.appendChild(link);
    });

    this.preloading.set(src, promise);
    return promise;
  }

  /**
   * Prefetch a resource
   */
  prefetch(href, options = {}) {
    if (typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    
    if (options.as) {
      link.as = options.as;
    }

    document.head.appendChild(link);
  }

  /**
   * Check if resource is preloaded
   */
  isPreloaded(src) {
    return this.preloaded.has(src);
  }

  /**
   * Clear preload cache
   */
  clear() {
    this.preloaded.clear();
    this.preloading.clear();
  }
}

/**
 * Progressive image loader
 */
export class ProgressiveImageLoader {
  /**
   * Create progressive image component
   */
  createImage(lowResSrc, highResSrc, options = {}) {
    return {
      div: {
        className: 'progressive-image',
        style: options.style || {},
        children: [
          {
            img: {
              src: lowResSrc,
              className: 'progressive-image-low',
              alt: options.alt || '',
              style: 'filter: blur(10px); transition: opacity 0.3s;'
            }
          },
          {
            img: {
              'data-src': highResSrc,
              className: 'progressive-image-high',
              alt: options.alt || '',
              style: 'opacity: 0; transition: opacity 0.3s;',
              onload: 'this.style.opacity = 1; this.previousElementSibling.style.opacity = 0;'
            }
          }
        ]
      }
    };
  }
}

/**
 * Create a lazy loader
 */
export function createLazyLoader(options = {}) {
  return new LazyLoader(options);
}

/**
 * Create an image lazy loader
 */
export function createImageLazyLoader(options = {}) {
  return new ImageLazyLoader(options);
}

/**
 * Create a resource preloader
 */
export function createPreloader() {
  return new ResourcePreloader();
}

/**
 * Quick lazy image helper
 */
export function lazyImage(src, options = {}) {
  const loader = new ImageLazyLoader();
  return loader.createImage(src, options);
}

/**
 * Quick progressive image helper
 */
export function progressiveImage(lowRes, highRes, options = {}) {
  const loader = new ProgressiveImageLoader();
  return loader.createImage(lowRes, highRes, options);
}

export default {
  LazyLoader,
  ImageLazyLoader,
  ResourcePreloader,
  ProgressiveImageLoader,
  createLazyLoader,
  createImageLazyLoader,
  createPreloader,
  lazyImage,
  progressiveImage
};
