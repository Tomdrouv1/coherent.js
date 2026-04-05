/**
 * Coherent.js Web Components Integration
 * Provides custom element and web component utilities
 */

import { render } from '@coherent.js/core';

/**
 * Define a Coherent.js component as a custom element
 *
 * @param {string} name - Custom element tag name (must contain a hyphen)
 * @param {Function|Object} component - Coherent.js component (function or object)
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.shadow] - Use Shadow DOM for style encapsulation
 * @param {string[]} [options.observedAttributes] - Attributes to watch for changes
 * @param {Object} [options.defaults] - Default property values
 * @returns {Function|Object} The custom element class, or a server-side placeholder
 */
export function defineComponent(name, component, options = {}) {
  if (typeof window === 'undefined') {
    // Server-side: return a placeholder for SSR
    return { name, component, options };
  }

  if (!window.customElements) {
    throw new Error('Custom Elements API not supported');
  }

  const observedAttrs = options.observedAttributes || [];
  const defaults = options.defaults || {};

  class CoherentElement extends HTMLElement {
    static get observedAttributes() {
      return observedAttrs;
    }

    constructor() {
      super();
      this._props = { ...defaults };
      this._connected = false;
      this.component = component;
      this.options = options;
    }

    connectedCallback() {
      this._connected = true;
      // Copy initial attributes to props
      for (const attr of observedAttrs) {
        if (this.hasAttribute(attr)) {
          this._props[attr] = this.getAttribute(attr);
        }
      }
      this._render();
    }

    disconnectedCallback() {
      this._connected = false;
      // Cleanup: remove event listeners and clear content
      if (options.shadow && this.shadowRoot) {
        this.shadowRoot.innerHTML = '';
      } else {
        this.innerHTML = '';
      }
    }

    attributeChangedCallback(attrName, oldValue, newValue) {
      if (oldValue === newValue) return;
      this._props[attrName] = newValue;
      if (this._connected) {
        this._render();
      }
    }

    /**
     * Set a property and re-render
     */
    setProperty(key, value) {
      this._props[key] = value;
      if (this._connected) {
        this._render();
      }
    }

    /**
     * Get current props
     */
    getProperties() {
      return { ...this._props };
    }

    _render() {
      const componentDef = typeof this.component === 'function'
        ? this.component(this._props)
        : this.component;

      const html = render(componentDef);

      if (this.options.shadow) {
        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' });
        }
        this.shadowRoot.innerHTML = html;
        this._delegateEvents(this.shadowRoot);
      } else {
        this.innerHTML = html;
        this._delegateEvents(this);
      }
    }

    /**
     * Delegate data-action events to component handlers
     */
    _delegateEvents(root) {
      const actionElements = root.querySelectorAll('[data-action]');
      for (const el of actionElements) {
        const action = el.dataset.action;
        const [eventType, handlerName] = action.includes(':')
          ? action.split(':')
          : ['click', action];

        el.addEventListener(eventType, (event) => {
          this.dispatchEvent(new CustomEvent('coherent-action', {
            bubbles: true,
            detail: { action: handlerName, event, element: el }
          }));
        });
      }
    }
  }

  window.customElements.define(name, CoherentElement);
  return CoherentElement;
}

/**
 * Integration utilities for runtime environments
 */
export function integrateWithWebComponents(_runtime) {
  return {
    defineComponent: (name, component, options) => defineComponent(name, component, options)
  };
}

/**
 * Alias for defineComponent
 */
export function defineCoherentElement(name, component, options = {}) {
  return defineComponent(name, component, options);
}

export { defineComponent as default };
