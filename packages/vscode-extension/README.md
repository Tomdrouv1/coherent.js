# Coherent.js Language Support

IntelliSense, validation, and snippets for [Coherent.js](https://github.com/Tomdrouv1/coherent.js) - a high-performance server-side rendering framework built on pure JavaScript objects.

## Features

### IntelliSense & Autocomplete

- **Attribute completion** - Get suggestions for valid HTML attributes when typing in Coherent.js objects
- **Event handler completion** - Autocomplete for onClick, onChange, onSubmit, and other event handlers
- **Context-aware suggestions** - Suggestions based on the element type (div, input, form, etc.)

### Validation & Diagnostics

- **Invalid attribute warnings** - Highlights attributes that are not valid for the element type
- **Nesting validation** - Warns about invalid HTML nesting (e.g., `<p>` inside `<p>`)
- **Typo detection** - Suggests fixes for common typos like `classname` instead of `className`

### Code Snippets

Quick snippets for common Coherent.js patterns:

| Prefix | Description |
|--------|-------------|
| `cel` | Create a Coherent.js element |
| `ccomp` | Create a functional component |
| `ctext` | Text element with `text` property |
| `clink` | Anchor element |
| `cimg` | Image element |
| `cinput` | Input element with type choices |
| `cbtn` | Button element |
| `cform` | Form element |
| `clist` | List with mapped items |
| `cif` | Conditional rendering |
| `cevent` | Event handler property |
| `cdata` | Data attribute |
| `cpage` | Full page layout |
| `ccard` | Card component structure |
| `ctable` | Table with header and body |
| `cimport` | Import Coherent.js functions |
| `cserver` | Basic server setup |

### Hover Information

Hover over attributes to see their type information and valid values.

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Coherent.js Language Support"
4. Click Install

### From VSIX

1. Download the `.vsix` file from [releases](https://github.com/Tomdrouv1/coherent.js/releases)
2. Run: `code --install-extension coherent-language-support-1.0.0.vsix`

## Usage

The extension activates automatically for JavaScript and TypeScript files. Simply start writing Coherent.js components:

```javascript
// Type 'cel' and press Tab for a quick element
{ div: {
    className: 'container',
    children: [
        // Type 'ctext' for text elements
        { p: { text: 'Hello, Coherent.js!' } }
    ]
}}
```

### Configuration

Configure the extension in VS Code settings:

```json
{
  "coherent.trace.server": "off" // "off" | "messages" | "verbose"
}
```

## Requirements

- VS Code 1.85.0 or higher
- Working with JavaScript or TypeScript files

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `coherent.trace.server` | `off` | Traces communication between VS Code and the language server |

## Known Issues

- Language server features require the file to be saved at least once
- Very large files (>10,000 lines) may experience slower validation

## Contributing

This extension is part of the [Coherent.js](https://github.com/Tomdrouv1/coherent.js) project. Contributions are welcome!

## License

MIT
