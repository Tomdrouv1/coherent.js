/**
 * Coherent.js Web Components Integration
 * Provides custom element and web component utilities
 */

import { render } from '@coherent.js/core';

/**
 * Define a Coherent.js component as a custom element
 */
export function defineComponent(name, component, options = {}) {
  if (typeof window === 'undefined') {
    // Server-side: just return a placeholder
    return { name, component, options };
  }

  if (!window.customElements) {
    throw new Error('Custom Elements API not supported');
  }

  class CoherentElement extends HTMLElement {
    constructor() {
      super();
      this.component = component;
      this.options = options;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const html = render(this.component);
      if (this.options.shadow) {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = html;
      } else {
        this.innerHTML = html;
      }
    }
  }

  window.customElements.define(name, CoherentElement);
  return CoherentElement;
}

/**
 * Integration utilities
 */
export function integrateWithWebComponents(_runtime) {
  return {
    defineComponent: (name, component, options) => defineComponent(name, component, options)
  };
}

export function defineCoherentElement(name, component, options = {}) {
  return defineComponent(name, component, options);
}

export { defineComponent as default };
