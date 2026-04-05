import type { server } from 'typescript/lib/tsserverlibrary';

/**
 * Coherent.js Language Service Plugin
 *
 * TypeScript language service plugin that provides:
 * - Completions for Coherent.js element tag names and attributes
 * - Diagnostics for invalid element structures
 * - Hover information for Coherent.js component patterns
 */

/** Standard HTML element tag names for completions */
const HTML_TAGS = [
  'div', 'span', 'p', 'a', 'button', 'input', 'form', 'label',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',
  'img', 'video', 'audio', 'canvas', 'svg',
  'select', 'option', 'textarea', 'fieldset', 'legend',
  'details', 'summary', 'dialog', 'pre', 'code', 'blockquote',
  'strong', 'em', 'small', 'br', 'hr'
];

/** Common Coherent.js element attributes */
const COHERENT_ATTRIBUTES = [
  'className', 'text', 'html', 'children', 'style', 'id',
  'onClick', 'onChange', 'onSubmit', 'onInput', 'onKeyDown',
  'data-coherent-component', 'data-coherent-state', 'data-coherent-island',
  'data-action'
];

/** Check if a position is inside a Coherent.js object literal */
function isInCoherentObject(sourceFile: any, position: number): boolean {
  // Simple heuristic: check if we're inside an object literal
  const text = sourceFile.getFullText();
  const before = text.substring(Math.max(0, position - 200), position);
  return /\{\s*$/.test(before) || /:\s*\{[^}]*$/.test(before);
}

function init() {
  function create(info: server.PluginCreateInfo) {
    const proxy: any = Object.create(null);

    // Proxy all methods from the original language service
    for (const k of Object.keys(info.languageService) as Array<keyof import('typescript/lib/tsserverlibrary').LanguageService>) {
      const x = info.languageService[k]!;
      proxy[k] = (...args: any[]) => (x as Function).apply(info.languageService, args);
    }

    /**
     * Enhanced completions: suggest Coherent.js tag names and attributes
     */
    proxy.getCompletionsAtPosition = (fileName: string, position: number, options: any) => {
      const prior = info.languageService.getCompletionsAtPosition(fileName, position, options);

      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);
      if (!sourceFile) return prior;

      // Only enhance if we're likely inside a Coherent.js component object
      if (!isInCoherentObject(sourceFile, position)) return prior;

      const entries = prior?.entries || [];

      // Add HTML tag completions as object keys
      const tagEntries = HTML_TAGS
        .filter(tag => !entries.some((e: any) => e.name === tag))
        .map(tag => ({
          name: tag,
          kind: 'property' as any,
          kindModifiers: '',
          sortText: '1',
          insertText: `${tag}: {\n  \n}`,
          labelDetails: { description: 'Coherent.js element' }
        }));

      // Add Coherent.js attribute completions
      const attrEntries = COHERENT_ATTRIBUTES
        .filter(attr => !entries.some((e: any) => e.name === attr))
        .map(attr => ({
          name: attr,
          kind: 'property' as any,
          kindModifiers: '',
          sortText: '2',
          labelDetails: { description: 'Coherent.js attribute' }
        }));

      return {
        ...prior,
        entries: [...entries, ...tagEntries, ...attrEntries],
        isGlobalCompletion: prior?.isGlobalCompletion ?? false,
        isMemberCompletion: prior?.isMemberCompletion ?? false,
        isNewIdentifierLocation: prior?.isNewIdentifierLocation ?? false
      };
    };

    /**
     * Enhanced hover: provide info for Coherent.js patterns
     */
    proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
      const prior = info.languageService.getQuickInfoAtPosition(fileName, position);

      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);
      if (!sourceFile) return prior;

      const text = sourceFile.getFullText();
      // Check if hovering over a known Coherent.js property
      const wordMatch = text.substring(Math.max(0, position - 30), position + 30).match(/\b(\w+)\b/);
      const word = wordMatch?.[1];

      if (word && HTML_TAGS.includes(word) && isInCoherentObject(sourceFile, position)) {
        return {
          ...prior,
          documentation: [{
            text: `Coherent.js element: renders as <${word}> HTML element. Properties: className, text, html, children, style, id, event handlers.`,
            kind: 'text'
          }],
          kind: 'property' as any,
          kindModifiers: ''
        };
      }

      return prior;
    };

    return proxy;
  }

  return { create };
}

export default init;
