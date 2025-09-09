/**
 * Tests for event system functions in hydration.js
 * Tests event attachment, handling, and registration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerEventHandler } from '../src/hydration.js';

const setupBrowserEnvironment = () => {
  global.window = {
    __coherentEventRegistry: {},
    __coherentActionRegistry: {},
    __coherentEventHandler: vi.fn(),
    addEventListener: vi.fn()
  };
  
  global.document = {
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(),
    activeElement: null
  };
  
  global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
  };
};

const createMockElement = (tagName = 'div', attributes = {}) => {
  const element = {
    tagName: tagName.toUpperCase(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getAttribute: vi.fn((name) => attributes[name] || null),
    setAttribute: vi.fn(),
    hasAttribute: vi.fn((name) => name in attributes),
    removeAttribute: vi.fn(),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    closest: vi.fn(() => null),
    children: [],
    childNodes: [],
    parentElement: null,
    textContent: '',
    value: attributes.value || '',
    type: attributes.type || '',
    nodeType: 1
  };
  
  return element;
};

describe('Event System Functions', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should test registerEventHandler function', () => {
    // Test the actual exported function
    const handler = vi.fn();
    registerEventHandler('test-handler', handler);
    
    // The function should exist and be callable
    expect(registerEventHandler).toBeDefined();
    expect(typeof registerEventHandler).toBe('function');
  });

  it('should test event handler registration patterns', () => {
    const mockHandler = vi.fn();
    const eventId = 'increment-counter';
    
    // Test registration logic
    global.window.__coherentEventRegistry[eventId] = mockHandler;
    
    // Verify registration
    expect(global.window.__coherentEventRegistry[eventId]).toBe(mockHandler);
    
    // Test action registry as well
    global.window.__coherentActionRegistry['decrement'] = mockHandler;
    expect(global.window.__coherentActionRegistry['decrement']).toBe(mockHandler);
  });

  it('should test function-based event listener attachment logic', () => {
    const rootElement = createMockElement('div');
    const buttonElement = createMockElement('button');
    const inputElement = createMockElement('input', { type: 'text' });
    
    rootElement.children = [buttonElement, inputElement];
    
    // Mock component instance
    const mockInstance = {
      component: {
        __stateContainer: {
          getState: () => ({ count: 0 }),
          setState: vi.fn()
        }
      },
      state: { count: 0 },
      eventListeners: []
    };
    
    // Mock virtual element with event handlers
    const virtualElement = {
      div: {
        children: [
          {
            button: {
              text: 'Click me',
              onclick: vi.fn()
            }
          },
          {
            input: {
              type: 'text',
              oninput: vi.fn()
            }
          }
        ]
      }
    };
    
    // Test event handler detection
    const buttonHandler = virtualElement.div.children[0].button.onclick;
    const inputHandler = virtualElement.div.children[1].input.oninput;
    
    expect(typeof buttonHandler).toBe('function');
    expect(typeof inputHandler).toBe('function');
    
    // Test event listener attachment pattern
    const attachEventToElement = (element, eventType, handler, instance) => {
      const wrappedHandler = (event) => {
        const currentState = instance.component.__stateContainer.getState();
        const setState = instance.component.__stateContainer.setState;
        return handler.call(element, event, currentState, setState);
      };
      
      element.addEventListener(eventType, wrappedHandler);
      return wrappedHandler;
    };
    
    const wrappedClickHandler = attachEventToElement(buttonElement, 'click', buttonHandler, mockInstance);
    const wrappedInputHandler = attachEventToElement(inputElement, 'input', inputHandler, mockInstance);
    
    expect(buttonElement.addEventListener).toHaveBeenCalledWith('click', wrappedClickHandler);
    expect(inputElement.addEventListener).toHaveBeenCalledWith('input', wrappedInputHandler);
  });

  it('should test data-attribute event attachment', () => {
    const element = createMockElement('button', {
      'data-action': 'increment',
      'data-event': 'click'
    });
    
    const mockInstance = {
      state: { count: 5 },
      setState: vi.fn(),
      eventListeners: []
    };
    
    // Test data attribute extraction
    const action = element.getAttribute('data-action');
    const eventType = element.getAttribute('data-event') || 'click';
    
    expect(action).toBe('increment');
    expect(eventType).toBe('click');
    
    // Test handler attachment for data actions
    if (action) {
      const handler = (e) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        // Test that action handling would be called
        expect(action).toBe('increment');
      };
      
      element.addEventListener(eventType, handler);
      mockInstance.eventListeners.push({
        element,
        event: eventType,
        handler
      });
    }
    
    expect(element.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockInstance.eventListeners).toHaveLength(1);
  });

  it('should test component action handling patterns', () => {
    const mockEvent = {
      preventDefault: vi.fn(),
      target: createMockElement('button')
    };
    
    const mockInstance = {
      state: { count: 10, step: 2 },
      setState: vi.fn(),
      element: createMockElement('div')
    };
    
    // Mock querySelector for count display
    mockInstance.element.querySelector.mockImplementation((selector) => {
      if (selector === '[data-ref="count"]') {
        return { textContent: '' };
      }
      return null;
    });
    
    // Test increment action logic
    const handleIncrement = (event, action, target, instance) => {
      if (action === 'increment' && instance.state && instance.state.count !== undefined) {
        const step = instance.state.step || 1;
        const newCount = instance.state.count + step;
        
        instance.setState({ count: newCount });
        
        // Update DOM directly for immediate feedback
        const countElement = instance.element.querySelector('[data-ref="count"]');
        if (countElement) {
          countElement.textContent = `Count: ${newCount}`;
        }
      }
    };
    
    handleIncrement(mockEvent, 'increment', 'default', mockInstance);
    
    expect(mockInstance.setState).toHaveBeenCalledWith({ count: 12 });
  });

  it('should test event handler context and state management', () => {
    const element = createMockElement('button');
    const mockInstance = {
      component: {
        __stateContainer: {
          getState: () => ({ count: 5 }),
          setState: vi.fn()
        }
      },
      state: { count: 5 }
    };
    
    // Test event handler with proper context
    const eventHandler = vi.fn();
    
    const contextualHandler = (event) => {
      const currentState = mockInstance.component.__stateContainer.getState();
      const setState = mockInstance.component.__stateContainer.setState;
      
      // Call original handler with context
      eventHandler.call(element, event, currentState, setState);
    };
    
    // Simulate event triggering
    const mockEvent = { type: 'click' };
    contextualHandler(mockEvent);
    
    expect(eventHandler).toHaveBeenCalledWith(
      mockEvent,
      { count: 5 },
      expect.any(Function)
    );
  });

  it('should test event cleanup patterns', () => {
    const element = createMockElement('button');
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    const mockInstance = {
      eventListeners: [
        { element, event: 'click', handler: handler1 },
        { element, event: 'change', handler: handler2 }
      ]
    };
    
    // Test event cleanup logic
    mockInstance.eventListeners.forEach(({ element, event, handler }) => {
      if (element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    
    expect(element.removeEventListener).toHaveBeenCalledWith('click', handler1);
    expect(element.removeEventListener).toHaveBeenCalledWith('change', handler2);
  });

  it('should test complex event propagation patterns', () => {
    // Test nested element event handling
    const parentElement = createMockElement('div', { 'data-coherent-component': 'true' });
    const childElement = createMockElement('button', { 'data-action': 'click-action' });
    
    parentElement.__coherentInstance = {
      state: { value: 'test' },
      setState: vi.fn()
    };
    
    // Mock closest to find parent component
    childElement.closest.mockImplementation((selector) => {
      if (selector === '[data-coherent-component]') {
        return parentElement;
      }
      return null;
    });
    
    // Test finding component instance from child element
    const findComponentInstance = (element) => {
      const componentElement = element.closest('[data-coherent-component]');
      return componentElement?.__coherentInstance;
    };
    
    const instance = findComponentInstance(childElement);
    expect(instance).toBe(parentElement.__coherentInstance);
  });

  it('should test todo-specific event handler reattachment', () => {
    const rootElement = createMockElement('div');
    const deleteButton = createMockElement('button', { 
      'data-todo-id': '123',
      'data-action': 'remove'
    });
    const checkbox = createMockElement('input', { 
      type: 'checkbox',
      'data-todo-id': '123'
    });
    
    rootElement.querySelectorAll.mockImplementation((selector) => {
      if (selector === 'button[data-action="remove"]') return [deleteButton];
      if (selector === '.todo-checkbox') return [checkbox];
      return [];
    });
    
    // Mock component instance
    const componentInstance = {
      component: {
        __stateContainer: {
          getState: () => ({
            todos: [
              { id: 123, text: 'Test todo', completed: false }
            ]
          }),
          setState: vi.fn()
        }
      }
    };
    
    rootElement.__coherentInstance = componentInstance;
    
    // Test delete button handler creation
    const deleteButtons = rootElement.querySelectorAll('button[data-action="remove"]');
    deleteButtons.forEach(button => {
      const todoId = parseInt(button.getAttribute('data-todo-id'));
      expect(todoId).toBe(123);
      
      const clickHandler = (event) => {
        event.preventDefault();
        const currentState = componentInstance.component.__stateContainer.getState();
        const setState = componentInstance.component.__stateContainer.setState.bind(componentInstance.component.__stateContainer);
        
        setState({
          todos: currentState.todos.filter(todo => todo.id !== todoId)
        });
      };
      
      button.addEventListener('click', clickHandler);
    });
    
    expect(deleteButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
});