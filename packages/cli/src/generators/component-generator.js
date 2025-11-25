/**
 * Component generator
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate a new component
 */
export async function generateComponent(name, options = {}) {
  const { path = 'src/components', template = 'basic', skipTest = false, skipStory = false } = options;

  // Ensure component name is PascalCase
  const componentName = toPascalCase(name);
  const fileName = componentName;

  // Create output directory
  const outputDir = join(process.cwd(), path);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files = [];
  const nextSteps = [];

  // Generate component file
  const componentPath = join(outputDir, `${fileName}.js`);
  const componentContent = generateComponentContent(componentName, template);
  writeFileSync(componentPath, componentContent);
  files.push(componentPath);

  // Generate test file
  if (!skipTest) {
    const testPath = join(outputDir, `${fileName}.test.js`);
    const testContent = generateTestContent(componentName);
    writeFileSync(testPath, testContent);
    files.push(testPath);
  }

  // Generate story file (for Storybook)
  if (!skipStory) {
    const storyPath = join(outputDir, `${fileName}.stories.js`);
    const storyContent = generateStoryContent(componentName);
    writeFileSync(storyPath, storyContent);
    files.push(storyPath);
  }

  // Add next steps
  nextSteps.push(`Import the component: import { ${componentName} } from '${path}/${fileName}.js'`);
  nextSteps.push(`Use the component: ${componentName}({ /* props */ })`);

  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

/**
 * Generate component content based on template
 */
function generateComponentContent(name, template) {
  switch (template) {
    case 'functional':
      return generateFunctionalComponent(name);
    case 'interactive':
      return generateInteractiveComponent(name);
    case 'layout':
      return generateLayoutComponent(name);
    default:
      return generateBasicComponent(name);
  }
}

/**
 * Generate basic component
 */
function generateBasicComponent(name) {
  return `import { createComponent } from '@coherent.js/core';

/**
 * ${name} component
 *
 * @param {Object} props - Component properties
 * @param {string} props.className - CSS class name
 * @param {Array|Object} props.children - Child elements
 */
export const ${name} = createComponent(({ className = '', children, ...props }) => ({
  div: {
    className: \`${name.toLowerCase()} \${className}\`.trim(),
    children,
    ...props
  }
}));

// Usage example:
// ${name}({
//   className: 'custom-class',
//   children: [
//     { h2: { text: 'Hello from ${name}!' } }
//   ]
// })
`;
}

/**
 * Generate functional component with business logic
 */
function generateFunctionalComponent(name) {
  return `import { createComponent } from '@coherent.js/core';

/**
 * ${name} - Functional component with business logic
 *
 * @param {Object} props - Component properties
 * @param {Array} props.items - Items to display
 * @param {Function} props.onItemClick - Callback for item clicks
 * @param {string} props.className - CSS class name
 */
export const ${name} = createComponent(({ items = [], onItemClick, className = '' }) => {
  // Business logic
  const processedItems = items.map((item, index) => ({
    ...item,
    id: item.id || \`item-\${index}\`,
    displayText: item.text || item.name || 'Untitled'
  }));

  return {
    div: {
      className: \`${name.toLowerCase()} \${className}\`.trim(),
      children: [
        {
          h3: {
            className: '${name.toLowerCase()}__title',
            text: '${name}'
          }
        },
        {
          ul: {
            className: '${name.toLowerCase()}__list',
            children: processedItems.map(item => ({
              li: {
                key: item.id,
                className: '${name.toLowerCase()}__item',
                onclick: () => onItemClick && onItemClick(item),
                children: [
                  {
                    span: {
                      className: '${name.toLowerCase()}__item-text',
                      text: item.displayText
                    }
                  }
                ]
              }
            }))
          }
        }
      ]
    }
  };
});

// Usage example:
// ${name}({
//   items: [
//     { id: '1', text: 'First item' },
//     { id: '2', text: 'Second item' }
//   ],
//   onItemClick: (item) => console.log('Clicked:', item),
//   className: 'custom-list'
// })
`;
}

/**
 * Generate interactive component with state
 */
function generateInteractiveComponent(name) {
  return `import { createComponent } from '@coherent.js/core';

/**
 * ${name} - Interactive component with state management
 *
 * @param {Object} props - Component properties
 * @param {*} props.initialValue - Initial value
 * @param {Function} props.onChange - Change callback
 * @param {string} props.className - CSS class name
 */
export const ${name} = createComponent(({
  initialValue = '',
  onChange,
  className = '',
  ...props
}) => {
  // Component state (handled by Coherent.js hydration)
  const state = {
    value: initialValue,
    isActive: false
  };

  const handleChange = (newValue) => {
    state.value = newValue;
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleToggle = () => {
    state.isActive = !state.isActive;
  };

  return {
    div: {
      className: \`${name.toLowerCase()} \${state.isActive ? 'active' : ''} \${className}\`.trim(),
      'data-component': '${name}',
      children: [
        {
          input: {
            type: 'text',
            value: state.value,
            className: '${name.toLowerCase()}__input',
            oninput: (event) => handleChange(event.target.value),
            placeholder: 'Enter text...',
            ...props
          }
        },
        {
          button: {
            type: 'button',
            className: \`${name.toLowerCase()}__toggle \${state.isActive ? 'active' : ''}\`,
            onclick: handleToggle,
            text: state.isActive ? 'Deactivate' : 'Activate'
          }
        },
        {
          div: {
            className: '${name.toLowerCase()}__display',
            children: [
              {
                p: {
                  text: \`Value: \${state.value}\`
                }
              },
              {
                p: {
                  text: \`Status: \${state.isActive ? 'Active' : 'Inactive'}\`
                }
              }
            ]
          }
        }
      ]
    }
  };
});

// Usage example:
// ${name}({
//   initialValue: 'Hello World',
//   onChange: (value) => console.log('Changed:', value),
//   className: 'my-interactive-component'
// })
`;
}

/**
 * Generate layout component
 */
function generateLayoutComponent(name) {
  return `import { createComponent } from '@coherent.js/core';

/**
 * ${name} - Layout component for page structure
 *
 * @param {Object} props - Component properties
 * @param {string} props.title - Page title
 * @param {Array|Object} props.children - Child content
 * @param {Object} props.header - Header content
 * @param {Object} props.footer - Footer content
 * @param {string} props.className - CSS class name
 */
export const ${name} = createComponent(({
  title = 'Page Title',
  children = [],
  header = null,
  footer = null,
  className = ''
}) => ({
  div: {
    className: \`${name.toLowerCase()} \${className}\`.trim(),
    children: [
      // Header section
      header ? {
        header: {
          className: '${name.toLowerCase()}__header',
          children: Array.isArray(header) ? header : [header]
        }
      } : {
        header: {
          className: '${name.toLowerCase()}__header',
          children: [
            {
              h1: {
                className: '${name.toLowerCase()}__title',
                text: title
              }
            }
          ]
        }
      },

      // Main content
      {
        main: {
          className: '${name.toLowerCase()}__content',
          children: Array.isArray(children) ? children : [children]
        }
      },

      // Footer section
      footer ? {
        footer: {
          className: '${name.toLowerCase()}__footer',
          children: Array.isArray(footer) ? footer : [footer]
        }
      } : {
        footer: {
          className: '${name.toLowerCase()}__footer',
          children: [
            {
              p: {
                text: \`© \${new Date().getFullYear()} ${name}\`
              }
            }
          ]
        }
      }
    ]
  }
}));

// Usage example:
// ${name}({
//   title: 'Welcome Page',
//   header: { nav: { text: 'Navigation' } },
//   children: [
//     { h2: { text: 'Main Content' } },
//     { p: { text: 'This is the main page content.' } }
//   ],
//   footer: { p: { text: 'Custom footer' } },
//   className: 'page-layout'
// })
`;
}

/**
 * Generate test content
 */
function generateTestContent(name) {
  return `import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { ${name} } from './${name}.js';

describe('${name}', () => {
  it('renders correctly', () => {
    const component = ${name}({});
    const html = render(component);

    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('${name.toLowerCase()}');
  });

  it('accepts className prop', () => {
    const component = ${name}({ className: 'test-class' });
    const html = render(component);

    expect(html).toContain('test-class');
  });
});

it('renders children correctly', () => {
    const children = [
      { p: { text: 'Test child content' } }
    ];

    const component = ${name}({ children });
    const html = render(component);

    expect(html).toContain('Test child content');
  });
});`;
}

/**
 * Generate Storybook story content
 */
function generateStoryContent(name) {
  return `import { ${name} } from './${name}.js';

export default {
  title: 'Components/${name}',
  component: ${name},
  argTypes: {
    className: { control: 'text' },
    children: { control: 'object' }
  }
};

// Default story
export const Default = {
  args: {}
};

// With custom class
export const WithCustomClass = {
  args: {
    className: 'custom-style'
  }
};

// With children
export const WithChildren = {
  args: {
    children: [
      { h3: { text: 'Story Title' } },
      { p: { text: 'This is a story example with children.' } }
    ]
  }
};
`;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}
