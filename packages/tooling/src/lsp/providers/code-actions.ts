/**
 * Code Action Provider
 *
 * Provides quick fix code actions for validation errors.
 */

import {
  Connection,
  TextDocuments,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  TextEdit,
  Diagnostic,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Register the code action provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export function registerCodeActionProvider(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const actions: CodeAction[] = [];

    for (const diagnostic of params.context.diagnostics) {
      // Only process diagnostics from our language server
      if (diagnostic.source !== 'coherent') {
        continue;
      }

      const codeActions = getCodeActionsForDiagnostic(diagnostic, document, params);
      actions.push(...codeActions);
    }

    return actions;
  });
}

/**
 * Get code actions for a specific diagnostic.
 */
function getCodeActionsForDiagnostic(
  diagnostic: Diagnostic,
  document: TextDocument,
  params: CodeActionParams
): CodeAction[] {
  const actions: CodeAction[] = [];
  const uri = params.textDocument.uri;

  switch (diagnostic.code) {
    case 'typo-attribute': {
      // Get suggestion from diagnostic data
      const suggestion = (diagnostic.data as { suggestion?: string })?.suggestion;
      if (suggestion) {
        actions.push({
          title: `Change to '${suggestion}'`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          isPreferred: true,
          edit: {
            changes: {
              [uri]: [
                TextEdit.replace(diagnostic.range, suggestion),
              ],
            },
          },
        });
      }

      // Also offer to remove the attribute
      actions.push(createRemoveAttributeAction(diagnostic, uri, document));
      break;
    }

    case 'invalid-attribute': {
      // Offer to remove the invalid attribute
      actions.push(createRemoveAttributeAction(diagnostic, uri, document));
      break;
    }

    case 'void-children': {
      // Offer to remove the children property
      const removeAction = createRemovePropertyAction(
        diagnostic,
        uri,
        document,
        'Remove children property',
        'children'
      );
      if (removeAction) {
        actions.push(removeAction);
      }
      break;
    }

    case 'invalid-nesting':
    case 'invalid-parent':
    case 'block-in-inline':
    case 'invalid-child': {
      // For nesting errors, we can't easily auto-fix, but we can provide documentation
      actions.push({
        title: 'Learn about HTML nesting rules',
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        command: {
          title: 'Open HTML nesting documentation',
          command: 'coherent.openNestingDocs',
          arguments: [diagnostic.data],
        },
      });
      break;
    }
  }

  return actions;
}

/**
 * Create a code action to remove an invalid attribute.
 */
function createRemoveAttributeAction(
  diagnostic: Diagnostic,
  uri: string,
  document: TextDocument
): CodeAction {
  // Find the full property (including value and trailing comma)
  const range = expandRangeToFullProperty(diagnostic.range, document);

  return {
    title: 'Remove invalid attribute',
    kind: CodeActionKind.QuickFix,
    diagnostics: [diagnostic],
    edit: {
      changes: {
        [uri]: [TextEdit.del(range)],
      },
    },
  };
}

/**
 * Create a code action to remove a specific property.
 */
function createRemovePropertyAction(
  diagnostic: Diagnostic,
  uri: string,
  document: TextDocument,
  title: string,
  _propertyName: string
): CodeAction | null {
  // Find the full property line
  const range = expandRangeToFullProperty(diagnostic.range, document);

  return {
    title,
    kind: CodeActionKind.QuickFix,
    diagnostics: [diagnostic],
    edit: {
      changes: {
        [uri]: [TextEdit.del(range)],
      },
    },
  };
}

/**
 * Expand a range to include the full property assignment and trailing comma.
 *
 * This ensures clean removal without leaving orphan commas or whitespace.
 */
function expandRangeToFullProperty(
  range: { start: { line: number; character: number }; end: { line: number; character: number } },
  document: TextDocument
): { start: { line: number; character: number }; end: { line: number; character: number } } {
  const text = document.getText();
  const startOffset = document.offsetAt(range.start);
  const endOffset = document.offsetAt(range.end);

  // Find start of the line (for property removal)
  let newStart = startOffset;
  while (newStart > 0 && text[newStart - 1] !== '\n') {
    newStart--;
  }

  // Find end of the property (including : and value)
  let newEnd = endOffset;

  // Skip to end of value
  let depth = 0;
  let inString = false;
  let stringChar = '';

  while (newEnd < text.length) {
    const char = text[newEnd];

    // Handle string literals
    if ((char === '"' || char === "'") && text[newEnd - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      // Track nesting depth
      if (char === '{' || char === '[' || char === '(') {
        depth++;
      } else if (char === '}' || char === ']' || char === ')') {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && char === ',') {
        newEnd++; // Include the comma
        break;
      } else if (depth === 0 && (char === '\n' || char === '\r')) {
        break;
      }
    }

    newEnd++;
  }

  // Skip trailing whitespace and newline
  while (newEnd < text.length && (text[newEnd] === ' ' || text[newEnd] === '\t')) {
    newEnd++;
  }
  if (newEnd < text.length && text[newEnd] === '\n') {
    newEnd++;
  }

  return {
    start: document.positionAt(newStart),
    end: document.positionAt(newEnd),
  };
}
