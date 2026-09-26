// src/sveltekit/index.js
//
// Public entry point for @coherent.js/integrations/sveltekit. Provides
// server-side rendering and preprocessor integration for SvelteKit projects.
//
// SvelteKit must be installed as a peer dependency to use this integration.
//
// Usage:
//   import { createSvelteKitAdapter } from '@coherent.js/integrations/sveltekit';

import { render } from '@coherent.js/core';

/**
 * Create a SvelteKit adapter for Coherent.js
 *
 * @param {Object} [options] - Adapter options
 * @returns {Object} SvelteKit adapter utilities
 *
 * @example
 * const adapter = createSvelteKitAdapter();
 * const html = adapter.renderComponent(MyComponent, { title: 'Hello' });
 */
export function createSvelteKitAdapter(_options = {}) {
  return {
    name: '@coherent.js/sveltekit',

    /**
     * Render a Coherent.js component to HTML
     */
    renderComponent(component, props = {}) {
      const def = typeof component === 'function' ? component(props) : component;
      return render(def);
    },

    /**
     * Create a SvelteKit server load function
     */
    createLoad(component, getProps) {
      return async ({ params, url, fetch }) => {
        const props = getProps
          ? await getProps({ params, url, fetch })
          : { params };

        const def = typeof component === 'function' ? component(props) : component;
        const html = render(def);

        return { html, props };
      };
    },

    /**
     * Create a SvelteKit form action handler
     */
    createAction(handler) {
      return async ({ request, params }) => {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        return handler({ data, params });
      };
    }
  };
}

/** Local name the preprocessor imports Coherent.js's `render` under. */
const RENDER_IDENTIFIER = '__coherentRender';
const RENDER_IMPORT = `import { render as ${RENDER_IDENTIFIER} } from '@coherent.js/core';`;

/** `<script context="module">` (Svelte 4) or `<script module>` (Svelte 5). */
function isModuleScript(attributes) {
  return /\bcontext\s*=\s*["']?module\b/.test(attributes) || /(?:^|\s)module(?:\s|=|$)/.test(attributes);
}

/**
 * Make `RENDER_IDENTIFIER` available to the markup: add the import to the
 * instance `<script>`, or add an instance script if there is none. Inserted
 * without newlines so the component's line numbers do not move.
 */
function injectRenderImport(code) {
  // Case-insensitive like HTML: an instance script written <SCRIPT> was
  // missed, and a second instance script was added next to it.
  for (const match of code.matchAll(/<script\b([^>]*)>/gi)) {
    if (!isModuleScript(match[1])) {
      const at = match.index + match[0].length;
      return `${code.slice(0, at)}${RENDER_IMPORT}${code.slice(at)}`;
    }
  }
  return `<script>${RENDER_IMPORT}</script>${code}`;
}

/**
 * Create a Svelte preprocessor for Coherent.js templates
 *
 * Replaces each `<coherent>{ ...object literal... }</coherent>` block with
 * `{@html ...}` of the rendered component, and imports `render` from
 * `@coherent.js/core` into the component's instance script so the generated
 * expression resolves. The renderer escapes text content, so `{@html}` only
 * emits markup the component itself describes.
 *
 * @param {Object} [options] - Preprocessor options
 * @param {string} [options.tag] - Custom tag to process (default: 'coherent')
 * @returns {Object} Svelte preprocessor
 */
export function createPreprocessor(options = {}) {
  const tag = options.tag || 'coherent';

  return {
    name: 'coherent-preprocessor',
    markup({ content, filename: _filename }) {
      // Find <coherent> blocks; their content is a JS expression (usually an object literal)
      const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
      let found = false;

      // Replacer function, so `$&`-style sequences in the block stay literal
      const transformed = content.replace(regex, (_block, expression) => {
        found = true;
        return `{@html ${RENDER_IDENTIFIER}(${expression.trim()})}`;
      });

      return {
        code: found ? injectRenderImport(transformed) : content,
        map: null
      };
    }
  };
}

/**
 * SvelteKit hooks integration
 *
 * @param {Object} [options] - Hook options
 * @returns {Object} SvelteKit handle function
 */
export function createHandle(_options = {}) {
  return async ({ event, resolve }) => {
    // Add Coherent.js render function to locals
    event.locals.coherent = {
      render(component, props = {}) {
        const def = typeof component === 'function' ? component(props) : component;
        return render(def);
      }
    };

    return resolve(event);
  };
}
