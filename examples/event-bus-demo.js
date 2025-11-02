/**
 * Event Bus Demo for Coherent.js
 *
 * Demonstrates the event-driven architecture pattern with declarative DOM actions,
 * centralized event handling, and component communication.
 */

import { render } from '../packages/core/src/index.js';
import eventSystem, { withEventBus, createActionHandlers } from '../packages/core/src/events/index.js';

// Example: Todo Application with Event-Driven Architecture
function createTodoApp() {
    // Register action handlers for todo operations
    eventSystem.registerActions({
        'add-todo': ({ data, state, setState, emit }) => {
            const text = data.text || data.todoText;
            if (!text || !text.trim()) return;

            const newTodo = {
                id: Date.now(),
                text: text.trim(),
                completed: false
            };

            setState({
                todos: [...(state.todos || []), newTodo],
                newTodoText: ''
            });

            emit('notification:success', {
                message: `Todo "${text}" added!`
            });
        },

        'toggle-todo': ({ data, state, setState, emit }) => {
            const todoId = parseInt(data.todoId);

            setState({
                todos: state.todos.map(todo =>
                    todo.id === todoId
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            });

            emit('todo:toggled', { todoId, completed: !state.todos.find(t => t.id === todoId)?.completed });
        },

        'delete-todo': ({ data, state, setState, emit }) => {
            const todoId = parseInt(data.todoId);
            const todo = state.todos.find(t => t.id === todoId);

            setState({
                todos: state.todos.filter(todo => todo.id !== todoId)
            });

            emit('notification:info', {
                message: `Todo "${todo?.text}" deleted`
            });
        },

        'clear-completed': ({ state, setState, emit }) => {
            const completedCount = state.todos.filter(todo => todo.completed).length;

            setState({
                todos: state.todos.filter(todo => !todo.completed)
            });

            emit('notification:info', {
                message: `${completedCount} completed todos cleared`
            });
        },

        'filter-todos': ({ data, state, setState }) => {
            setState({
                filter: data.filter || 'all'
            });
        }
    });

    // Register modal actions
    eventSystem.registerActions(createActionHandlers.modal('todo-help'));

    // Register notification handlers
    eventSystem.on('notification:*', (data, eventName) => {
        console.log(`[Notification] ${eventName}:`, data.message);
        // In a real app, this would update a notification component
    });

    // Register todo event handlers
    eventSystem.on('todo:toggled', (data) => {
        console.log(`[Todo] Toggled todo ${data.todoId} to ${data.completed ? 'completed' : 'pending'}`);
    });

    // Component using event bus integration
    const TodoApp = withEventBus({
        scope: 'todo-app',
        events: {
            'app:mounted': () => {
                console.log('[TodoApp] Application mounted');
            }
        },
        debug: true
    })(({ eventBus, eventUtils, ...props }) => {
        const state = props.state || {
            todos: [
                { id: 1, text: 'Learn Coherent.js Event Bus', completed: false },
                { id: 2, text: 'Build an awesome app', completed: false }
            ],
            filter: 'all',
            newTodoText: ''
        };

        const filteredTodos = state.todos.filter(todo => {
            switch (state.filter) {
                case 'active': return !todo.completed;
                case 'completed': return todo.completed;
                default: return true;
            }
        });

        const stats = {
            total: state.todos.length,
            completed: state.todos.filter(todo => todo.completed).length,
            active: state.todos.filter(todo => !todo.completed).length
        };

        return {
            div: {
                className: 'todo-app',
                'data-coherent-component': 'TodoApp',
                'data-coherent-state': JSON.stringify(state),
                children: [
                    // Header
                    {
                        header: {
                            className: 'todo-header',
                            children: [
                                {
                                    h1: {
                                        text: 'Event-Driven Todos'
                                    }
                                },
                                {
                                    button: {
                                        'data-action': 'open-modal',
                                        'data-modal-id': 'todo-help',
                                        className: 'help-btn',
                                        text: '?'
                                    }
                                }
                            ]
                        }
                    },

                    // Add todo form
                    {
                        form: {
                            className: 'add-todo-form',
                            'data-action': 'add-todo',
                            children: [
                                {
                                    input: {
                                        type: 'text',
                                        name: 'todoText',
                                        placeholder: 'What needs to be done?',
                                        value: state.newTodoText,
                                        'data-action': 'update-input',
                                        required: true
                                    }
                                },
                                {
                                    button: {
                                        type: 'submit',
                                        text: 'Add Todo'
                                    }
                                }
                            ]
                        }
                    },

                    // Filter buttons
                    {
                        div: {
                            className: 'filter-controls',
                            children: ['all', 'active', 'completed'].map(filter => ({
                                button: {
                                    'data-action': 'filter-todos',
                                    'data-filter': filter,
                                    className: `filter-btn ${state.filter === filter ? 'active' : ''}`,
                                    text: filter.charAt(0).toUpperCase() + filter.slice(1)
                                }
                            }))
                        }
                    },

                    // Todo list
                    {
                        ul: {
                            className: 'todo-list',
                            children: filteredTodos.map(todo => ({
                                li: {
                                    className: `todo-item ${todo.completed ? 'completed' : ''}`,
                                    'data-todo-id': todo.id,
                                    children: [
                                        {
                                            input: {
                                                type: 'checkbox',
                                                checked: todo.completed,
                                                'data-action': 'toggle-todo',
                                                'data-todo-id': todo.id
                                            }
                                        },
                                        {
                                            span: {
                                                className: 'todo-text',
                                                text: todo.text
                                            }
                                        },
                                        {
                                            button: {
                                                'data-action': 'delete-todo',
                                                'data-todo-id': todo.id,
                                                className: 'delete-btn',
                                                text: '×'
                                            }
                                        }
                                    ]
                                }
                            }))
                        }
                    },

                    // Stats and actions
                    {
                        footer: {
                            className: 'todo-footer',
                            children: [
                                {
                                    div: {
                                        className: 'todo-stats',
                                        children: [
                                            {
                                                span: {
                                                    text: `${stats.total} total, ${stats.active} active, ${stats.completed} completed`
                                                }
                                            }
                                        ]
                                    }
                                },
                                stats.completed > 0 ? {
                                    button: {
                                        'data-action': 'clear-completed',
                                        className: 'clear-completed-btn',
                                        text: 'Clear Completed'
                                    }
                                } : null
                            ].filter(Boolean)
                        }
                    },

                    // Help modal (hidden by default)
                    {
                        div: {
                            id: 'todo-help',
                            className: 'modal hidden',
                            children: [
                                {
                                    div: {
                                        className: 'modal-content',
                                        children: [
                                            {
                                                h3: { text: 'Event-Driven Todo Help' }
                                            },
                                            {
                                                p: { text: 'This todo app demonstrates declarative event handling:' }
                                            },
                                            {
                                                ul: {
                                                    children: [
                                                        { li: { text: 'Click checkboxes to toggle completion' } },
                                                        { li: { text: 'Click × to delete todos' } },
                                                        { li: { text: 'Use filter buttons to view different states' } },
                                                        { li: { text: 'All actions use data-action attributes' } }
                                                    ]
                                                }
                                            },
                                            {
                                                button: {
                                                    'data-action': 'close-modal',
                                                    'data-modal-id': 'todo-help',
                                                    text: 'Close'
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        };
    });

    return TodoApp;
}

// Example: Product Catalog with CRUD operations
function createProductCatalog() {
    // Register CRUD actions for products
    eventSystem.registerActions(createActionHandlers.crud({
        entityName: 'product',
        onCreate: (data) => console.log('Creating product:', data),
        onUpdate: (data) => console.log('Updating product:', data),
        onDelete: (data) => console.log('Deleting product:', data),
        onRead: (data) => console.log('Reading product:', data)
    }));

    // Register form actions
    eventSystem.registerActions(createActionHandlers.form({
        onSubmit: (formData) => {
            eventSystem.emit('product:create', formData);
        },
        onValidate: (formData) => {
            return formData.name && formData.name.trim().length > 0;
        }
    }));

    const ProductCatalog = ({ products = [] }) => ({
        div: {
            className: 'product-catalog',
            children: [
                {
                    h2: { text: 'Product Catalog' }
                },

                // Add product form
                {
                    form: {
                        className: 'add-product-form',
                        'data-action': 'submit-form',
                        children: [
                            {
                                input: {
                                    type: 'text',
                                    name: 'name',
                                    placeholder: 'Product name',
                                    required: true
                                }
                            },
                            {
                                input: {
                                    type: 'number',
                                    name: 'price',
                                    placeholder: 'Price',
                                    min: '0',
                                    step: '0.01'
                                }
                            },
                            {
                                button: {
                                    type: 'submit',
                                    text: 'Add Product'
                                }
                            }
                        ]
                    }
                },

                // Product list
                {
                    div: {
                        className: 'product-list',
                        children: products.map(product => ({
                            div: {
                                className: 'product-card',
                                'data-product-id': product.id,
                                children: [
                                    {
                                        h3: { text: product.name }
                                    },
                                    {
                                        p: { text: `$${product.price}` }
                                    },
                                    {
                                        button: {
                                            'data-action': 'update-product',
                                            'data-product-id': product.id,
                                            text: 'Edit'
                                        }
                                    },
                                    {
                                        button: {
                                            'data-action': 'delete-product',
                                            'data-product-id': product.id,
                                            className: 'danger',
                                            text: 'Delete'
                                        }
                                    }
                                ]
                            }
                        }))
                    }
                }
            ]
        }
    });

    return ProductCatalog;
}

// Demo runner
function runDemo() {
    console.log('🚀 Coherent.js Event Bus Demo');
    console.log('===============================\n');

    // Create components
    const TodoApp = createTodoApp();
    const ProductCatalog = createProductCatalog();

    // Render todo app
    console.log('📝 Todo Application:');
    const todoHTML = render(TodoApp());
    console.log('Rendered HTML length:', todoHTML.length, 'characters');

    // Render product catalog
    console.log('\n🛍️ Product Catalog:');
    const catalogHTML = render(ProductCatalog({
        products: [
            { id: 1, name: 'Coherent.js Book', price: 29.99 },
            { id: 2, name: 'Event Bus Guide', price: 19.99 }
        ]
    }));
    console.log('Rendered HTML length:', catalogHTML.length, 'characters');

    // Demonstrate event system stats
    console.log('\n📊 Event Bus Statistics:');
    console.log(eventSystem.getStats());

    // Demonstrate scoped events
    console.log('\n🎯 Scoped Events Demo:');
    const userScope = eventSystem.createScope('user');
    const adminScope = eventSystem.createScope('admin');

    userScope.on('action', (data) => {
        console.log('[User Scope] Action:', data);
    });

    adminScope.on('action', (data) => {
        console.log('[Admin Scope] Action:', data);
    });

    userScope.emitSync('action', { type: 'user-click' });
    adminScope.emitSync('action', { type: 'admin-action' });

    // Test wildcard events
    console.log('\n🌟 Wildcard Events Demo:');
    eventSystem.on('demo:*', (data, event) => {
        console.log(`[Wildcard] Caught ${event}:`, data);
    });

    eventSystem.emitSync('demo:test1', { message: 'First test' });
    eventSystem.emitSync('demo:test2', { message: 'Second test' });

    console.log('\n✅ Demo completed successfully!');
    console.log('\nIn a real application, you would:');
    console.log('1. Include the event system in your main app');
    console.log('2. Use data-action attributes in your HTML');
    console.log('3. Register action handlers for your use cases');
    console.log('4. Leverage event communication between components');
}

// HTML/CSS for complete demo
const demoCSS = `
<style>
.todo-app {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

.todo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.help-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid #ccc;
    background: #f0f0f0;
    cursor: pointer;
}

.add-todo-form {
    display: flex;
    margin-bottom: 20px;
}

.add-todo-form input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px 0 0 4px;
}

.add-todo-form button {
    padding: 10px 20px;
    border: 1px solid #007bff;
    background: #007bff;
    color: white;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
}

.filter-controls {
    margin-bottom: 20px;
}

.filter-btn {
    margin-right: 10px;
    padding: 5px 15px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
}

.filter-btn.active {
    background: #007bff;
    color: white;
}

.todo-list {
    list-style: none;
    padding: 0;
}

.todo-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.todo-item.completed .todo-text {
    text-decoration: line-through;
    color: #888;
}

.todo-text {
    flex: 1;
    margin: 0 10px;
}

.delete-btn {
    background: #dc3545;
    color: white;
    border: none;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    cursor: pointer;
}

.todo-footer {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.clear-completed-btn {
    padding: 5px 15px;
    border: 1px solid #dc3545;
    background: #dc3545;
    color: white;
    border-radius: 4px;
    cursor: pointer;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal.hidden {
    display: none;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 500px;
}

.product-catalog {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.add-product-form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.add-product-form input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.product-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.product-card {
    border: 1px solid #ccc;
    padding: 15px;
    border-radius: 8px;
}

.product-card button {
    margin-right: 10px;
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
}

.product-card button.danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
}
</style>
`;

export { runDemo, demoCSS, createTodoApp, createProductCatalog };

// Run the demo if this file is executed directly
if (import.meta.main) {
    runDemo();
}
