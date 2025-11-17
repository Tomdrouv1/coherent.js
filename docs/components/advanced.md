# Advanced Components in Coherent.js

This guide covers advanced component patterns, optimization techniques, and complex use cases in Coherent.js. Learn how to build sophisticated, reusable, and performant components.

## 🚀 Higher-Order Components (HOCs)

### Basic HOC Pattern

Higher-Order Components are functions that take a component and return a new component with additional functionality:

```javascript
const withLoading = (WrappedComponent) => {
  return withState({ isLoading: false })(({ state, stateUtils, ...props }) => {
    const { setState } = stateUtils;
    
    if (state.isLoading) {
      return {
        div: {
          className: 'loading-container',
          children: [
            { div: { className: 'spinner' } },
            { p: { text: 'Loading...' } }
          ]
        }
      };
    }
    
    return WrappedComponent({
      ...props,
      setLoading: (isLoading) => setState({ isLoading })
    });
  });
};

// Usage
const DataComponent = ({ data, setLoading }) => ({
  div: {
    children: [
      { h2: { text: 'Data Display' } },
      {
        button: {
          text: 'Load Data',
          onclick: async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
          }
        }
      }
    ]
  }
});

const LoadingDataComponent = withLoading(DataComponent);
```

### Composable HOCs

Chain multiple HOCs together for complex functionality:

```javascript
const withAuth = (WrappedComponent) => {
  return withState({ user: null })(({ state, stateUtils, ...props }) => {
    if (!state.user) {
      return {
        div: {
          className: 'auth-required',
          children: [
            { h2: { text: 'Authentication Required' } },
            { button: { text: 'Login', onclick: () => showLogin() } }
          ]
        }
      };
    }
    
    return WrappedComponent({ ...props, user: state.user });
  });
};

const withErrorBoundary = (WrappedComponent) => {
  return withState({ hasError: false, error: null })(({ state, stateUtils, ...props }) => {
    const { setState } = stateUtils;
    
    if (state.hasError) {
      return {
        div: {
          className: 'error-boundary',
          children: [
            { h2: { text: 'Something went wrong' } },
            { p: { text: state.error?.message } },
            {
              button: {
                text: 'Try Again',
                onclick: () => setState({ hasError: false, error: null })
              }
            }
          ]
        }
      };
    }
    
    try {
      return WrappedComponent({
        ...props,
        onError: (error) => setState({ hasError: true, error })
      });
    } catch (error) {
      setState({ hasError: true, error });
      return { div: { text: 'Error occurred' } };
    }
  });
};

// Compose multiple HOCs
const EnhancedComponent = withAuth(withErrorBoundary(withLoading(DataComponent)));
```

### Context Provider HOC

Create context-like functionality with HOCs:

```javascript
const withTheme = (WrappedComponent) => {
  return withState({ 
    theme: 'light',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      background: '#ffffff'
    }
  })(({ state, stateUtils, ...props }) => {
    const { setState } = stateUtils;
    
    const toggleTheme = () => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      const newColors = newTheme === 'dark' ? {
        primary: '#0d6efd',
        secondary: '#adb5bd',
        background: '#212529'
      } : {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff'
      };
      
      setState({ theme: newTheme, colors: newColors });
    };
    
    return WrappedComponent({
      ...props,
      theme: state.theme,
      colors: state.colors,
      toggleTheme
    });
  });
};
```

## 🔄 Component Composition Patterns

### Render Props Pattern

Pass rendering logic as props:

```javascript
const DataFetcher = ({ url, children }) => {
  return withState({ 
    data: null, 
    loading: false, 
    error: null 
  })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    const fetchData = async () => {
      setState({ loading: true, error: null });
      try {
        const response = await fetch(url);
        const data = await response.json();
        setState({ data, loading: false });
      } catch (error) {
        setState({ error: error.message, loading: false });
      }
    };
    
    if (typeof children === 'function') {
      return children({
        data: state.data,
        loading: state.loading,
        error: state.error,
        refetch: fetchData
      });
    }
    
    return { div: { text: 'No render function provided' } };
  });
};

// Usage
const App = () => ({
  div: {
    children: [
      DataFetcher({
        url: '/api/users',
        children: ({ data, loading, error, refetch }) => {
          if (loading) return { div: { text: 'Loading...' } };
          if (error) return { div: { text: `Error: ${error}` } };
          
          return {
            div: {
              children: [
                { h2: { text: 'Users' } },
                { button: { text: 'Refresh', onclick: refetch } },
                data ? {
                  ul: {
                    children: data.map(user => ({
                      li: { key: user.id, text: user.name }
                    }))
                  }
                } : null
              ].filter(Boolean)
            }
          };
        }
      })
    ]
  }
});
```

### Compound Components

Create components that work together:

```javascript
const Tabs = withState({ activeTab: 0 })(({ state, stateUtils, children }) => {
  const { setState } = stateUtils;
  
  const childrenArray = Array.isArray(children) ? children : [children];
  const tabPanels = childrenArray.filter(child => child.type === 'TabPanel');
  const tabLabels = childrenArray.filter(child => child.type === 'TabList');
  
  return {
    div: {
      className: 'tabs-container',
      children: [
        // Tab navigation
        {
          ul: {
            className: 'tab-nav',
            children: tabPanels.map((panel, index) => ({
              li: {
                key: index,
                className: `tab ${state.activeTab === index ? 'active' : ''}`,
                children: [
                  {
                    button: {
                      text: panel.props.label,
                      onclick: () => setState({ activeTab: index })
                    }
                  }
                ]
              }
            }))
          }
        },
        
        // Active tab content
        {
          div: {
            className: 'tab-content',
            children: [
              tabPanels[state.activeTab]?.children || { div: { text: 'No content' } }
            ]
          }
        }
      ]
    }
  };
});

const TabPanel = ({ label, children }) => ({
  type: 'TabPanel',
  props: { label },
  children
});

// Usage
const App = () => ({
  div: {
    children: [
      Tabs({
        children: [
          TabPanel({
            label: 'Tab 1',
            children: { div: { text: 'Content for tab 1' } }
          }),
          TabPanel({
            label: 'Tab 2',
            children: { div: { text: 'Content for tab 2' } }
          })
        ]
      })
    ]
  }
});
```

### Slot Pattern

Create components with named slots:

```javascript
const Card = ({ header, body, footer, ...props }) => ({
  div: {
    className: `card ${props.className || ''}`,
    style: props.style,
    children: [
      header ? {
        div: {
          className: 'card-header',
          children: Array.isArray(header) ? header : [header]
        }
      } : null,
      
      body ? {
        div: {
          className: 'card-body',
          children: Array.isArray(body) ? body : [body]
        }
      } : null,
      
      footer ? {
        div: {
          className: 'card-footer',
          children: Array.isArray(footer) ? footer : [footer]
        }
      } : null
    ].filter(Boolean)
  }
});

// Usage
const UserCard = ({ user }) => Card({
  header: { h3: { text: user.name } },
  body: [
    { p: { text: `Email: ${user.email}` } },
    { p: { text: `Role: ${user.role}` } }
  ],
  footer: [
    { button: { text: 'Edit', onclick: () => editUser(user.id) } },
    { button: { text: 'Delete', onclick: () => deleteUser(user.id) } }
  ]
});
```

## 🎯 Dynamic Components

### Component Registry

Create a system for dynamic component loading:

```javascript
const componentRegistry = new Map();

const registerComponent = (name, component) => {
  componentRegistry.set(name, component);
};

const getComponent = (name) => {
  return componentRegistry.get(name);
};

const DynamicComponent = ({ type, props = {} }) => {
  const Component = getComponent(type);
  
  if (!Component) {
    return {
      div: {
        className: 'error',
        text: `Component "${type}" not found`
      }
    };
  }
  
  return Component(props);
};

// Register components
registerComponent('Button', ({ text, onClick }) => ({
  button: { text, onclick: onClick }
}));

registerComponent('Input', ({ value, onChange, placeholder }) => ({
  input: { 
    type: 'text',
    value, 
    oninput: onChange,
    placeholder
  }
}));

// Usage
const FormBuilder = ({ fields }) => ({
  form: {
    children: fields.map(field => DynamicComponent({
      type: field.type,
      props: field.props
    }))
  }
});

const dynamicForm = FormBuilder({
  fields: [
    { type: 'Input', props: { placeholder: 'Name' } },
    { type: 'Input', props: { placeholder: 'Email' } },
    { type: 'Button', props: { text: 'Submit' } }
  ]
});
```

### Conditional Component Loading

```javascript
const ConditionalRenderer = ({ condition, components }) => {
  if (typeof condition === 'function') {
    const result = condition();
    return components[result] || components.default || { div: { text: 'No match' } };
  }
  
  return components[condition] || components.default || { div: { text: 'No match' } };
};

// Usage
const UserDisplay = ({ user, isAdmin }) => ConditionalRenderer({
  condition: () => {
    if (!user) return 'guest';
    if (isAdmin) return 'admin';
    return 'user';
  },
  components: {
    guest: { div: { text: 'Please log in' } },
    user: { div: { text: `Welcome, ${user.name}` } },
    admin: { div: { text: `Admin: ${user.name}` } },
    default: { div: { text: 'Unknown user type' } }
  }
});
```

## 🔄 Async Components

### Lazy Loading Components

```javascript
const LazyComponent = ({ loader, fallback, ...props }) => {
  return withState({ 
    Component: null, 
    loading: false, 
    error: null 
  })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    if (!state.Component && !state.loading) {
      setState({ loading: true });
      
      loader()
        .then(module => {
          setState({ 
            Component: module.default || module, 
            loading: false 
          });
        })
        .catch(error => {
          setState({ 
            error: error.message, 
            loading: false 
          });
        });
    }
    
    if (state.error) {
      return {
        div: {
          className: 'lazy-error',
          text: `Failed to load component: ${state.error}`
        }
      };
    }
    
    if (state.loading || !state.Component) {
      return fallback || { div: { text: 'Loading component...' } };
    }
    
    return state.Component(props);
  });
};

// Usage
const App = () => ({
  div: {
    children: [
      LazyComponent({
        loader: () => import('./HeavyComponent.js'),
        fallback: { div: { text: 'Loading heavy component...' } },
        someProp: 'value'
      })
    ]
  }
});
```

### Data-Dependent Components

```javascript
const DataDependentComponent = ({ dataSource, dependencies = [] }) => {
  return withState({ 
    data: null, 
    loading: false, 
    error: null,
    lastDependencies: null
  })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    const depsChanged = !state.lastDependencies || 
      JSON.stringify(dependencies) !== JSON.stringify(state.lastDependencies);
    
    if (depsChanged && !state.loading) {
      setState({ 
        loading: true, 
        error: null,
        lastDependencies: dependencies
      });
      
      dataSource(dependencies)
        .then(data => setState({ data, loading: false }))
        .catch(error => setState({ error: error.message, loading: false }));
    }
    
    if (state.loading) {
      return { div: { text: 'Loading data...' } };
    }
    
    if (state.error) {
      return { div: { text: `Error: ${state.error}` } };
    }
    
    return {
      div: {
        children: [
          { h3: { text: 'Data-Dependent Component' } },
          state.data ? {
            pre: { text: JSON.stringify(state.data, null, 2) }
          } : { div: { text: 'No data' } }
        ]
      }
    };
  });
};
```

## 🎨 Style and Theme Management

### CSS-in-JS Pattern

```javascript
const createStyles = (theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: theme.spacing.medium,
    borderRadius: theme.borderRadius,
    fontFamily: theme.fonts.body
  },
  
  button: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    border: 'none',
    padding: `${theme.spacing.small} ${theme.spacing.medium}`,
    borderRadius: theme.borderRadius,
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  
  input: {
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.small,
    borderRadius: theme.borderRadius,
    fontSize: theme.fonts.size.medium
  }
});

const styleToString = (styleObj) => {
  return Object.entries(styleObj)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
};

const ThemedComponent = withTheme(({ theme, ...props }) => {
  const styles = createStyles(theme);
  
  return {
    div: {
      style: styleToString(styles.container),
      children: [
        {
          input: {
            style: styleToString(styles.input),
            placeholder: 'Enter text...'
          }
        },
        {
          button: {
            style: styleToString(styles.button),
            text: 'Submit'
          }
        }
      ]
    }
  };
});
```

### Responsive Components

```javascript
const useMediaQuery = (query) => {
  return withState({ matches: false })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    if (typeof window !== 'undefined' && !state._initialized) {
      const mediaQuery = window.matchMedia(query);
      setState({ 
        matches: mediaQuery.matches,
        _initialized: true
      });
      
      const handler = (e) => setState({ matches: e.matches });
      mediaQuery.addEventListener('change', handler);
      
      // Cleanup would need to be handled in a real implementation
    }
    
    return state.matches;
  });
};

const ResponsiveGrid = ({ items }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const getColumns = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 3;
  };
  
  const columns = getColumns();
  
  return {
    div: {
      style: `
        display: grid;
        grid-template-columns: repeat(${columns}, 1fr);
        gap: 1rem;
        padding: 1rem;
      `,
      children: items.map((item, index) => ({
        div: {
          key: index,
          style: `
            border: 1px solid #ccc;
            padding: 1rem;
            border-radius: 4px;
          `,
          children: [
            { h3: { text: item.title } },
            { p: { text: item.description } }
          ]
        }
      }))
    }
  };
};
```

## ⚡ Performance Optimization

### Memoization

```javascript
const memoizeComponent = (Component, keyExtractor = JSON.stringify) => {
  const cache = new Map();
  
  return (props) => {
    const key = keyExtractor(props);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = Component(props);
    cache.set(key, result);
    
    // Cleanup old entries to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

// Usage
const ExpensiveComponent = memoizeComponent(({ data }) => {
  // Expensive computation
  const processedData = data.map(item => ({
    ...item,
    processed: heavyComputation(item)
  }));
  
  return {
    div: {
      children: processedData.map(item => ({
        div: { key: item.id, text: item.processed }
      }))
    }
  };
});
```

### Virtual Scrolling

```javascript
const VirtualList = ({ items, itemHeight = 50, visibleCount = 10 }) => {
  return withState({ 
    scrollTop: 0, 
    containerHeight: visibleCount * itemHeight 
  })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.floor(state.scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + 1,
      items.length
    );
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return {
      div: {
        style: `
          height: ${state.containerHeight}px;
          overflow-y: auto;
          position: relative;
        `,
        onscroll: (e) => {
          setState({ scrollTop: e.target.scrollTop });
        },
        children: [
          // Spacer for total height
          {
            div: {
              style: `height: ${totalHeight}px; position: relative;`,
              children: [
                // Visible items container
                {
                  div: {
                    style: `
                      position: absolute;
                      top: ${offsetY}px;
                      left: 0;
                      right: 0;
                    `,
                    children: visibleItems.map((item, index) => ({
                      div: {
                        key: startIndex + index,
                        style: `
                          height: ${itemHeight}px;
                          display: flex;
                          align-items: center;
                          padding: 0 1rem;
                          border-bottom: 1px solid #eee;
                        `,
                        children: [
                          { span: { text: item.name } }
                        ]
                      }
                    }))
                  }
                }
              ]
            }
          }
        ]
      }
    };
  });
};
```

## 🧪 Testing Advanced Components

### Component Testing Utilities

```javascript
const createTestRenderer = () => {
  const renders = [];
  
  const mockRenderer = (component) => {
    renders.push(component);
    return JSON.stringify(component);
  };
  
  return {
    render: mockRenderer,
    getRenders: () => renders,
    getLastRender: () => renders[renders.length - 1],
    clearRenders: () => renders.length = 0
  };
};

// Test HOCs
test('withLoading HOC shows loading state', () => {
  const TestComponent = ({ data }) => ({
    div: { text: `Data: ${data}` }
  });
  
  const LoadingTestComponent = withLoading(TestComponent);
  const renderer = createTestRenderer();
  
  // Should show loading initially
  const result = LoadingTestComponent({ data: 'test' });
  expect(result).toMatchObject({
    div: {
      className: 'loading-container'
    }
  });
});

// Test state changes
test('component state updates correctly', () => {
  const stateLogs = [];
  
  const TestComponent = withState({ count: 0 }, { 
    debug: true,
    onStateChange: (oldState, newState) => {
      stateLogs.push({ old: oldState, new: newState });
    }
  })(({ state, stateUtils }) => {
    const { setState } = stateUtils;
    
    return {
      div: {
        children: [
          { span: { text: `Count: ${state.count}` } },
          {
            button: {
              onclick: () => setState({ count: state.count + 1 })
            }
          }
        ]
      }
    };
  });
  
  // Test state change logic
  expect(stateLogs).toHaveLength(1); // Initial state
});
```

## 📚 Best Practices for Advanced Components

### 1. Component Composition Over Inheritance

```javascript
// ✅ Good - Composition
const EnhancedButton = (props) => BaseButton({
  ...props,
  className: `${props.className} enhanced`,
  children: [
    { span: { className: 'icon' } },
    ...props.children
  ]
});

// ❌ Avoid - Complex inheritance
class ComplexButton extends BaseButton {
  // Complex inheritance hierarchy
}
```

### 2. Clear Component Contracts

```javascript
const Button = ({ 
  text, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false,
  onClick,
  ...props 
}) => {
  // Validate props
  if (!text && !props.children) {
    console.warn('Button requires either text or children');
  }
  
  return {
    button: {
      className: `btn btn--${variant} btn--${size}`,
      disabled,
      onclick: disabled ? undefined : onClick,
      ...props,
      children: text ? [{ span: { text } }] : props.children
    }
  };
};
```

### 3. Error Boundaries

```javascript
const withErrorBoundary = (Component, fallback) => {
  return (props) => {
    try {
      return Component(props);
    } catch (error) {
      console.error('Component error:', error);
      return fallback ? fallback(error, props) : {
        div: {
          className: 'error',
          text: 'Something went wrong'
        }
      };
    }
  };
};
```

### 4. Performance Monitoring

```javascript
const withPerformanceTracking = (Component, componentName) => {
  return (props) => {
    const start = Date.now();
    const result = Component(props);
    const end = Date.now();
    
    if (end - start > 10) {
      console.warn(`Component ${componentName} took ${end - start}ms to render`);
    }
    
    return result;
  };
};
```

---

These advanced patterns enable you to build sophisticated, maintainable, and performant applications with Coherent.js. Combine these techniques as needed while keeping components focused and testable.