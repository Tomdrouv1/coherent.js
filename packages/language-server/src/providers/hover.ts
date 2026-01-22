/**
 * Hover Provider
 *
 * Provides hover information (documentation) for Coherent.js elements and attributes.
 */

import {
  Connection,
  TextDocuments,
  Hover,
  HoverParams,
  MarkupKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  createSourceFile,
  getPositionContext,
} from '../analysis/coherent-analyzer.js';
import {
  getElementDescription,
  getAttributeType,
  getAttributeDescription,
  getAttributesForElement,
  isVoidElement,
} from '../data/element-attributes.js';

/**
 * Register the hover provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export function registerHoverProvider(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    try {
      const content = document.getText();
      const sourceFile = createSourceFile(content, params.textDocument.uri);
      const context = getPositionContext(sourceFile, params.position);

      switch (context.type) {
        case 'tag-name':
          if (context.element) {
            return createElementHover(context.element.tagName);
          }
          break;

        case 'attribute-name':
          if (context.element && context.attribute) {
            return createAttributeHover(context.element.tagName, context.attribute.name);
          }
          break;

        case 'attribute-value':
          // Could show value type information
          break;

        default:
          break;
      }

      return null;
    } catch (error) {
      console.error('[coherent-lsp] Hover error:', error);
      return null;
    }
  });
}

/**
 * Create hover content for an HTML element.
 */
function createElementHover(tagName: string): Hover {
  const description = getElementDescription(tagName);
  const isVoid = isVoidElement(tagName);
  const attrs = getAttributesForElement(tagName);

  let markdown = `## <${tagName}>\n\n`;
  markdown += `${description}\n\n`;

  if (isVoid) {
    markdown += `> **Void element** - cannot have children\n\n`;
  }

  // Example usage
  markdown += `### Example\n\n`;
  markdown += '```javascript\n';
  if (isVoid) {
    markdown += `{ ${tagName}: { /* attributes */ } }\n`;
  } else {
    markdown += `{ ${tagName}: {\n`;
    markdown += `  className: 'example',\n`;
    markdown += `  children: [/* child elements */]\n`;
    markdown += `} }\n`;
  }
  markdown += '```\n\n';

  // Common attributes
  const elementSpecificAttrs = attrs.filter(a =>
    !['id', 'className', 'class', 'style', 'title', 'hidden', 'tabIndex',
      'text', 'html', 'children', 'key'].includes(a.name) &&
    !a.name.startsWith('on') &&
    !a.name.startsWith('aria-') &&
    !a.name.startsWith('data-')
  ).slice(0, 8);

  if (elementSpecificAttrs.length > 0) {
    markdown += `### Element-Specific Attributes\n\n`;
    for (const attr of elementSpecificAttrs) {
      markdown += `- \`${attr.name}\`: \`${attr.type}\`\n`;
    }
    markdown += '\n';
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: markdown,
    },
  };
}

/**
 * Create hover content for an attribute.
 */
function createAttributeHover(tagName: string, attributeName: string): Hover {
  const type = getAttributeType(tagName, attributeName);
  const description = getAttributeDescription(tagName, attributeName);

  let markdown = `## ${attributeName}\n\n`;

  // Type information
  if (type) {
    markdown += `**Type:** \`${type}\`\n\n`;
  }

  // Description
  if (description) {
    markdown += `${description}\n\n`;
  }

  // Special handling for common attributes
  const examples = getAttributeExamples(attributeName, type);
  if (examples) {
    markdown += `### Examples\n\n`;
    markdown += '```javascript\n';
    markdown += examples;
    markdown += '\n```\n';
  }

  // Event handler information
  if (attributeName.startsWith('on') && attributeName[2] === attributeName[2].toUpperCase()) {
    const eventType = getEventType(attributeName);
    if (eventType) {
      markdown += `\n**Event type:** \`${eventType}\`\n`;
    }
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: markdown,
    },
  };
}

/**
 * Get example usage for common attributes.
 */
function getAttributeExamples(attributeName: string, type?: string): string | null {
  const examples: Record<string, string> = {
    className: "className: 'my-class another-class'",
    id: "id: 'unique-id'",
    style: "style: { color: 'red', fontSize: '16px' }",
    onClick: "onClick: (event) => {\n  console.log('Clicked!', event);\n}",
    onChange: "onChange: (event) => {\n  const value = event.target.value;\n}",
    onSubmit: "onSubmit: (event) => {\n  event.preventDefault();\n  // Handle form submission\n}",
    children: "children: [\n  { span: { text: 'Child 1' } },\n  { span: { text: 'Child 2' } }\n]",
    text: "text: 'Text content (escaped)'",
    html: "html: '<strong>Raw HTML</strong>'  // Use with caution!",
    key: "key: 'unique-item-key'",
    href: "href: 'https://example.com'",
    src: "src: '/images/photo.jpg'",
    alt: "alt: 'Description of the image'",
    type: "type: 'submit'  // or 'button', 'text', etc.",
    value: "value: 'input value'",
    placeholder: "placeholder: 'Enter text...'",
    disabled: "disabled: true",
    checked: "checked: true",
    required: "required: true",
    name: "name: 'field-name'",
  };

  return examples[attributeName] || null;
}

/**
 * Get the DOM event type for an event handler.
 */
function getEventType(handlerName: string): string | null {
  const eventTypes: Record<string, string> = {
    onClick: 'MouseEvent',
    onDblClick: 'MouseEvent',
    onMouseDown: 'MouseEvent',
    onMouseUp: 'MouseEvent',
    onMouseEnter: 'MouseEvent',
    onMouseLeave: 'MouseEvent',
    onMouseMove: 'MouseEvent',
    onMouseOver: 'MouseEvent',
    onMouseOut: 'MouseEvent',
    onContextMenu: 'MouseEvent',
    onKeyDown: 'KeyboardEvent',
    onKeyUp: 'KeyboardEvent',
    onKeyPress: 'KeyboardEvent',
    onFocus: 'FocusEvent',
    onBlur: 'FocusEvent',
    onFocusIn: 'FocusEvent',
    onFocusOut: 'FocusEvent',
    onChange: 'Event',
    onInput: 'Event',
    onSubmit: 'SubmitEvent',
    onReset: 'Event',
    onInvalid: 'Event',
    onDrag: 'DragEvent',
    onDragEnd: 'DragEvent',
    onDragEnter: 'DragEvent',
    onDragLeave: 'DragEvent',
    onDragOver: 'DragEvent',
    onDragStart: 'DragEvent',
    onDrop: 'DragEvent',
    onCopy: 'ClipboardEvent',
    onCut: 'ClipboardEvent',
    onPaste: 'ClipboardEvent',
    onTouchStart: 'TouchEvent',
    onTouchMove: 'TouchEvent',
    onTouchEnd: 'TouchEvent',
    onTouchCancel: 'TouchEvent',
    onWheel: 'WheelEvent',
    onScroll: 'Event',
    onAnimationStart: 'AnimationEvent',
    onAnimationEnd: 'AnimationEvent',
    onAnimationIteration: 'AnimationEvent',
    onTransitionStart: 'TransitionEvent',
    onTransitionEnd: 'TransitionEvent',
    onTransitionCancel: 'TransitionEvent',
    onTransitionRun: 'TransitionEvent',
    onLoad: 'Event',
    onError: 'Event',
  };

  return eventTypes[handlerName] || null;
}
