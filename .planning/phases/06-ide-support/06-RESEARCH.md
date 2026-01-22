# Phase 6: IDE Support - Research

**Researched:** 2026-01-22
**Domain:** Language Server Protocol, VS Code Extension Development, TypeScript Language Service
**Confidence:** HIGH

## Summary

Phase 6 requires building IDE support for Coherent.js with autocomplete, go-to-definition, error highlighting, and a VS Code extension. The research confirms a two-pronged approach is optimal: a standalone Language Server Protocol (LSP) server for multi-editor support, plus a VS Code extension as the primary distribution vehicle.

The existing `@coherent.js/language-service` package contains a minimal TypeScript language service plugin skeleton. The decision to distribute the LSP as `@coherent.js/language-server` (separate npm package) aligns with industry patterns seen in Angular Language Service and styled-components. The VS Code extension will wrap this LSP server while also providing snippets and extension-specific features.

Phase 5's TypeScript work provides an excellent foundation: `StrictCoherentElement` with `HTMLElementAttributeMap` (1,080 lines of element types) gives us per-element attribute validation that the language server can leverage for completions and diagnostics.

**Primary recommendation:** Build an LSP server using `vscode-languageserver` that analyzes Coherent.js object literal syntax, leveraging the existing TypeScript type definitions for element-specific autocomplete and validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vscode-languageserver` | 9.0.1 | Implement LSP server in Node.js | Official Microsoft library, LSP 3.17 compliant |
| `vscode-languageserver-textdocument` | 1.0.12 | Text document management for LSP | Standard incremental sync support |
| `vscode-languageclient` | 9.0.1 | VS Code extension client | Matches server version, official library |
| `@vscode/vsce` | latest | Package and publish VS Code extensions | Official CLI tool for marketplace |
| `yo generator-code` | latest | Scaffold VS Code extension projects | Official Microsoft scaffolding |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vscode-languageserver-protocol` | 3.17.5 | TypeScript LSP type definitions | For type safety in server implementation |
| `vscode-languageserver-types` | 3.17.5 | Shared data types (Range, Position, etc.) | For type definitions shared between client/server |
| `typescript` | 5.9.x | Compile TypeScript, access TS AST | For parsing JS/TS files containing Coherent objects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Standalone LSP | TypeScript plugin only | TS plugin limits to TS projects, LSP works in any editor |
| Custom parser | TypeScript AST | Custom parser is fragile, TS AST handles all JS/TS syntax |
| esbuild for extension | webpack/rollup | esbuild faster, but webpack has better VS Code extension examples |

**Installation:**
```bash
# Language Server package
npm install vscode-languageserver vscode-languageserver-textdocument typescript

# VS Code Extension package
npm install vscode-languageclient

# Development tools
npm install -g @vscode/vsce yo generator-code
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── language-server/              # LSP server (npm: @coherent.js/language-server)
│   ├── src/
│   │   ├── server.ts            # Main LSP server entry point
│   │   ├── capabilities.ts      # LSP capability declarations
│   │   ├── analysis/
│   │   │   ├── coherent-analyzer.ts    # Coherent object detection
│   │   │   ├── element-validator.ts    # Element/attribute validation
│   │   │   └── nesting-validator.ts    # HTML nesting rules
│   │   ├── providers/
│   │   │   ├── completion.ts    # onCompletion handler
│   │   │   ├── hover.ts         # onHover handler
│   │   │   ├── definition.ts    # onDefinition handler
│   │   │   ├── diagnostics.ts   # Validation/error reporting
│   │   │   └── code-actions.ts  # Quick fixes
│   │   └── data/
│   │       ├── element-attributes.ts   # From core/types/elements.d.ts
│   │       └── nesting-rules.ts        # HTML5 nesting rules
│   ├── package.json
│   └── tsconfig.json
│
└── vscode-extension/             # VS Code extension
    ├── src/
    │   └── extension.ts         # Extension entry, spawns language server
    ├── snippets/
    │   └── coherent.json        # Code snippets
    ├── package.json             # Extension manifest with contributes
    └── README.md
```

### Pattern 1: LSP Server Initialization
**What:** Create connection, register capabilities, handle lifecycle
**When to use:** Server entry point (server.ts)
**Example:**
```typescript
// Source: https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  CompletionItemKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true, triggerCharacters: ['{', ':'] },
      hoverProvider: true,
      definitionProvider: true,
      codeActionProvider: { codeActionKinds: ['quickfix'] },
    },
  };
});

documents.listen(connection);
connection.listen();
```

### Pattern 2: Coherent Object Detection via TypeScript AST
**What:** Parse document, identify Coherent.js object literals by structure
**When to use:** Core analysis before providing any feature
**Example:**
```typescript
// Source: TypeScript Compiler API documentation
import * as ts from 'typescript';

function isCoherentElement(node: ts.Node): node is ts.ObjectLiteralExpression {
  if (!ts.isObjectLiteralExpression(node)) return false;

  // Coherent elements have single property with HTML tag name
  if (node.properties.length !== 1) return false;

  const prop = node.properties[0];
  if (!ts.isPropertyAssignment(prop)) return false;

  const tagName = prop.name.getText();
  return HTML_ELEMENTS.has(tagName); // 'div', 'span', 'input', etc.
}

function findCoherentElementsInDocument(sourceFile: ts.SourceFile): CoherentElementInfo[] {
  const elements: CoherentElementInfo[] = [];

  function visit(node: ts.Node) {
    if (isCoherentElement(node)) {
      elements.push(extractElementInfo(node));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return elements;
}
```

### Pattern 3: Completion Provider with Element-Specific Attributes
**What:** Provide completions based on element context
**When to use:** onCompletion handler
**Example:**
```typescript
// Source: vscode-languageserver documentation + Coherent types
import { HTMLElementAttributeMap } from '@coherent.js/core/types/elements';

connection.onCompletion((params): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  const position = params.position;

  // Analyze position context
  const context = analyzeCompletionContext(document, position);

  if (context.type === 'tag-name') {
    // Suggest HTML tag names
    return Object.keys(HTMLElementAttributeMap).map(tag => ({
      label: tag,
      kind: CompletionItemKind.Class,
      detail: `HTML <${tag}> element`,
    }));
  }

  if (context.type === 'attribute') {
    // Suggest attributes for specific element
    const attributes = getAttributesForElement(context.tagName);
    return attributes.map(attr => ({
      label: attr.name,
      kind: CompletionItemKind.Property,
      detail: attr.type,
      documentation: attr.description,
    }));
  }

  return [];
});
```

### Pattern 4: Diagnostic Publishing for Validation Errors
**What:** Send diagnostics to client for error highlighting
**When to use:** After document change, validation phase
**Example:**
```typescript
// Source: LSP specification + Coherent validation
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

async function validateDocument(document: TextDocument): Promise<void> {
  const diagnostics: Diagnostic[] = [];
  const elements = findCoherentElements(document);

  for (const element of elements) {
    // Check invalid attributes
    const invalidAttrs = validateAttributes(element.tagName, element.attributes);
    for (const invalid of invalidAttrs) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: invalid.range,
        message: `Attribute '${invalid.name}' is not valid for <${element.tagName}>`,
        source: 'coherent',
        code: 'invalid-attribute',
      });
    }

    // Check nesting violations
    const nestingErrors = validateNesting(element);
    for (const error of nestingErrors) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: error.range,
        message: error.message,
        source: 'coherent',
        code: 'invalid-nesting',
      });
    }
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}
```

### Pattern 5: VS Code Extension Client
**What:** Launch LSP server from VS Code extension
**When to use:** Extension entry point
**Example:**
```typescript
// Source: https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', '@coherent.js', 'language-server', 'dist', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescriptreact' },
    ],
  };

  client = new LanguageClient(
    'coherentLanguageServer',
    'Coherent.js Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
```

### Anti-Patterns to Avoid
- **Parsing documents manually with regex:** Use TypeScript AST instead; handles all edge cases (comments, string escapes, etc.)
- **Blocking the language server thread:** Use async patterns; heavy computation should be cancellable
- **Hardcoding HTML elements:** Import from core package types; maintain single source of truth
- **Bundling TS compiler in extension:** Extension should spawn server process; keeps extension size small
- **Synchronous document validation:** Use incremental updates; validate only changed regions when possible

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text document management | Custom document cache | `vscode-languageserver-textdocument` | Handles incremental sync, versioning, UTF-16 offsets |
| JSON-RPC communication | Raw stdio/socket parsing | `vscode-jsonrpc` | Bundled with vscode-languageserver, handles protocol |
| Position/Range conversion | Line/character math | `TextDocument.positionAt/offsetAt` | Handles UTF-16 correctly, edge cases covered |
| HTML element attribute lists | Manually maintained lists | Import from `@coherent.js/core/types/elements.d.ts` | Phase 5 created comprehensive typed attributes |
| HTML nesting rules | Implement from scratch | Port from w3c-html-validator or superhtml | Complex spec, many edge cases |
| Extension packaging | Manual zip creation | `@vscode/vsce package` | Handles manifest validation, icon sizing, VSIX format |
| Snippet system | Custom template expansion | VS Code native snippets (snippets/*.json) | Declarative, supports placeholders, tab stops |

**Key insight:** The LSP ecosystem provides battle-tested primitives. The only custom logic needed is Coherent.js-specific object detection and validation rules that leverage the existing type definitions.

## Common Pitfalls

### Pitfall 1: UTF-16 Position Encoding
**What goes wrong:** VS Code uses UTF-16 offsets, Node.js strings are UTF-8
**Why it happens:** Multi-byte characters (emoji, CJK) have different lengths in UTF-8 vs UTF-16
**How to avoid:** Always use `TextDocument.positionAt()` and `TextDocument.offsetAt()` for conversions
**Warning signs:** Off-by-one errors on lines with non-ASCII characters

### Pitfall 2: Server Crash on Invalid Document State
**What goes wrong:** Server crashes when document is malformed or mid-edit
**Why it happens:** Parser expects valid syntax, users type incomplete code
**How to avoid:** Wrap all analysis in try-catch, return empty results on parse failure, use error recovery in TypeScript parser (`ts.createLanguageService` with error tolerance)
**Warning signs:** Extension frequently shows "server crashed" notifications

### Pitfall 3: Completion Trigger Timing
**What goes wrong:** Completions don't appear, or appear at wrong times
**Why it happens:** `triggerCharacters` not configured, or completions fire during string literals
**How to avoid:** Configure `triggerCharacters: ['{', ':', '"']`, check context before providing completions (not inside strings, comments)
**Warning signs:** User must press Ctrl+Space manually, completions appear inside string values

### Pitfall 4: Extension Size Bloat
**What goes wrong:** Extension package exceeds marketplace size limits (50MB)
**Why it happens:** Including node_modules, not tree-shaking, bundling TypeScript
**How to avoid:** Use `extensionDependencies` for LSP server, bundle only extension code with esbuild, add to `.vscodeignore`
**Warning signs:** `vsce package` warnings about large file size

### Pitfall 5: Go-to-Definition Returns Wrong File
**What goes wrong:** Ctrl+Click navigates to wrong location or compiled output
**Why it happens:** Following module resolution to `dist/` instead of `src/`, or resolving to type declarations
**How to avoid:** Use source maps, check for `.d.ts` files and navigate to corresponding `.ts`, respect tsconfig paths
**Warning signs:** User lands in `node_modules` or compiled JavaScript

### Pitfall 6: Diagnostics Flicker During Typing
**What goes wrong:** Error squiggles appear/disappear rapidly while user types
**Why it happens:** Validating on every keystroke without debouncing
**How to avoid:** Debounce validation (200-500ms), use `onDidChangeContent` not `onDidOpen`, clear diagnostics when document closes
**Warning signs:** High CPU usage, UI feels unresponsive

## Code Examples

Verified patterns from official sources:

### HTML Nesting Validation Rules
```typescript
// Source: HTML5 spec + SuperHTML implementation patterns
const NESTING_RULES: Record<string, { forbiddenParents?: string[]; allowedParents?: string[] }> = {
  // Block elements cannot be inside inline elements
  div: { forbiddenParents: ['p', 'span', 'a', 'em', 'strong', 'b', 'i'] },
  p: { forbiddenParents: ['p'] }, // <p> cannot nest in <p>

  // List items must be in lists
  li: { allowedParents: ['ul', 'ol', 'menu'] },
  dt: { allowedParents: ['dl'] },
  dd: { allowedParents: ['dl'] },

  // Table structure
  tr: { allowedParents: ['table', 'thead', 'tbody', 'tfoot'] },
  td: { allowedParents: ['tr'] },
  th: { allowedParents: ['tr'] },

  // Form elements
  option: { allowedParents: ['select', 'optgroup', 'datalist'] },
  optgroup: { allowedParents: ['select'] },
};

function validateNesting(element: CoherentElementInfo, parent: CoherentElementInfo | null): ValidationError[] {
  const errors: ValidationError[] = [];
  const rules = NESTING_RULES[element.tagName];

  if (!rules || !parent) return errors;

  if (rules.forbiddenParents?.includes(parent.tagName)) {
    errors.push({
      range: element.range,
      message: `<${element.tagName}> cannot be nested inside <${parent.tagName}>`,
      code: 'invalid-nesting',
    });
  }

  if (rules.allowedParents && !rules.allowedParents.includes(parent.tagName)) {
    errors.push({
      range: element.range,
      message: `<${element.tagName}> must be a direct child of ${rules.allowedParents.join(', ')}`,
      code: 'invalid-parent',
    });
  }

  return errors;
}
```

### Quick Fix Code Action
```typescript
// Source: https://github.com/microsoft/vscode-extension-samples/blob/main/code-actions-sample
import { CodeAction, CodeActionKind, TextEdit } from 'vscode-languageserver';

connection.onCodeAction((params): CodeAction[] => {
  const document = documents.get(params.textDocument.uri);
  const actions: CodeAction[] = [];

  for (const diagnostic of params.context.diagnostics) {
    if (diagnostic.code === 'invalid-attribute') {
      // Offer to remove invalid attribute
      const removeAction: CodeAction = {
        title: `Remove invalid attribute`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              TextEdit.del(diagnostic.range),
            ],
          },
        },
      };
      actions.push(removeAction);
    }

    if (diagnostic.code === 'typo-attribute' && diagnostic.data?.suggestion) {
      // Offer to fix typo
      const fixAction: CodeAction = {
        title: `Change to '${diagnostic.data.suggestion}'`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        isPreferred: true,
        edit: {
          changes: {
            [params.textDocument.uri]: [
              TextEdit.replace(diagnostic.range, diagnostic.data.suggestion),
            ],
          },
        },
      };
      actions.push(fixAction);
    }
  }

  return actions;
});
```

### VS Code Extension package.json Manifest
```json
{
  "name": "coherent-language-support",
  "displayName": "Coherent.js Language Support",
  "description": "IntelliSense, validation, and snippets for Coherent.js",
  "version": "1.0.0",
  "publisher": "coherentjs",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Programming Languages", "Linters", "Snippets"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "snippets": [
      {
        "language": "javascript",
        "path": "./snippets/coherent.json"
      },
      {
        "language": "typescript",
        "path": "./snippets/coherent.json"
      }
    ],
    "configuration": {
      "title": "Coherent.js",
      "properties": {
        "coherent.trace.server": {
          "type": "string",
          "enum": ["off", "messages", "verbose"],
          "default": "off",
          "description": "Traces communication between VS Code and the Coherent language server"
        }
      }
    }
  },
  "extensionDependencies": [],
  "dependencies": {
    "vscode-languageclient": "^9.0.1"
  }
}
```

### Snippet Definitions
```json
{
  "Coherent Element": {
    "prefix": "cel",
    "body": [
      "{",
      "  ${1:div}: {",
      "    ${2:className}: '${3:class-name}',",
      "    ${4:children}: [${5}]",
      "  }",
      "}"
    ],
    "description": "Create a Coherent.js element"
  },
  "Coherent Component": {
    "prefix": "ccomp",
    "body": [
      "function ${1:ComponentName}(${2:props}) {",
      "  return {",
      "    ${3:div}: {",
      "      className: '${4:component}',",
      "      children: [${5}]",
      "    }",
      "  };",
      "}"
    ],
    "description": "Create a Coherent.js component function"
  },
  "Coherent Input": {
    "prefix": "cinput",
    "body": [
      "{",
      "  input: {",
      "    type: '${1|text,email,password,number,checkbox,radio|}',",
      "    name: '${2:name}',",
      "    placeholder: '${3:placeholder}'",
      "  }",
      "}"
    ],
    "description": "Create a Coherent.js input element"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `vscode-languageserver` v6/v7 | v9.0.1 | 2024 | Uses exports field, requires Node 18+, ES2022 |
| Custom document sync | `TextDocuments` with `TextDocument` | LSP 3.16+ | Incremental sync handled automatically |
| tsserver plugins only | LSP + optional TS plugin | Angular moved 2023 | LSP works in all editors, not just VS Code |
| Bundling server in extension | Extension depends on npm package | Best practice | Smaller extension, shared server across projects |

**Deprecated/outdated:**
- `vscode-languageserver` < 8.x: Incompatible with current VS Code, use 9.x
- `onDidChangeTextDocument` for full document: Use incremental sync instead
- Manual JSON-RPC: Use `vscode-jsonrpc` bundled with language server

## Open Questions

Things that couldn't be fully resolved:

1. **TypeScript AST Performance**
   - What we know: TypeScript compiler can parse JS/TS files, provides full AST
   - What's unclear: Performance impact of parsing on every document change for large files
   - Recommendation: Implement with TS AST, add caching/incremental parsing if performance issues arise

2. **Coherent Object Detection Heuristics**
   - What we know: Objects with single HTML tag key + object value are Coherent elements
   - What's unclear: How to distinguish Coherent elements from regular objects in ambiguous contexts
   - Recommendation: Use structural analysis (tagName + children/text/className presence), consider optional project markers

3. **Extension Auto-Install of LSP Package**
   - What we know: Decision is to auto-install @coherent.js/language-server if missing
   - What's unclear: Best mechanism (npm install on activation? bundled fallback?)
   - Recommendation: Start with bundled server in extension, explore npm dependency later

## Sources

### Primary (HIGH confidence)
- [VS Code Language Server Extension Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) - Official architecture and patterns
- [microsoft/vscode-languageserver-node](https://github.com/microsoft/vscode-languageserver-node) - NPM packages v9.0.1
- [LSP Specification 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/) - Protocol details
- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) - Marketplace requirements

### Secondary (MEDIUM confidence)
- [Angular Language Service Design](https://github.com/angular/vscode-ng-language-service/wiki/Design) - TS plugin vs LSP tradeoffs
- [typescript-styled-plugin](https://github.com/Microsoft/typescript-styled-plugin) - Embedded DSL pattern
- [SuperHTML](https://github.com/kristoff-it/superhtml) - HTML nesting validation approach

### Tertiary (LOW confidence)
- WebSearch results on VS Code extension best practices 2026 - General patterns confirmed with docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Microsoft libraries, well-documented
- Architecture: HIGH - Based on official VS Code extension samples and Angular LS design
- Pitfalls: MEDIUM - Based on common patterns in LSP implementations, some from WebSearch
- Code examples: HIGH - Adapted from official documentation and verified libraries

**Research date:** 2026-01-22
**Valid until:** 2026-04-22 (LSP is stable, VS Code API changes slowly)
