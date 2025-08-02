import { renderToString, withState, Component } from '../src/coherent.js';

// Example 1: Basic counter component with state
const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    className: 'counter',
    children: [
      { h2: { text: 'Counter Example' } },
      { p: { text: `Count: ${state.count}` } },
      { button: { 
        text: 'Increment', 
        onclick: () => setState({ count: state.count + 1 }) 
      }},
      { button: { 
        text: 'Decrement', 
        onclick: () => setState({ count: state.count - 1 }) 
      }},
      { button: { 
        text: 'Reset', 
        onclick: () => setState({ count: 0 }) 
      }}
    ]
  }
}));

// Example 2: Todo list with state
const TodoList = withState({ 
  todos: [
    { id: 1, text: 'Learn Coherent.js', completed: false },
    { id: 2, text: 'Build an app', completed: false }
  ],
  newTodo: ''
})(({ state, setState }) => {
  const addTodo = () => {
    if (state.newTodo.trim() === '') return;
    
    const newTodo = {
      id: Date.now(),
      text: state.newTodo,
      completed: false
    };
    
    setState({
      todos: [...state.todos, newTodo],
      newTodo: ''
    });
  };
  
  const toggleTodo = (id) => {
    setState({
      todos: state.todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };
  
  const removeTodo = (id) => {
    setState({
      todos: state.todos.filter(todo => todo.id !== id)
    });
  };
  
  return {
    div: {
      className: 'todo-app',
      children: [
        { h2: { text: 'Todo List Example' } },
        {
          div: {
            children: [
              { input: { 
                type: 'text', 
                value: state.newTodo,
                placeholder: 'Add a new todo...',
                oninput: (e) => setState({ newTodo: e.target.value })
              }},
              { button: { 
                text: 'Add', 
                onclick: addTodo 
              }}
            ]
          }
        },
        {
          ul: {
            children: state.todos.map(todo => ({
              li: {
                key: todo.id,
                className: todo.completed ? 'completed' : '',
                children: [
                  { input: {
                    type: 'checkbox',
                    checked: todo.completed,
                    onchange: () => toggleTodo(todo.id)
                  }},
                  { span: { 
                    text: todo.text,
                    style: todo.completed ? 'text-decoration: line-through;' : ''
                  }},
                  { button: { 
                    text: 'Remove', 
                    onclick: () => removeTodo(todo.id) 
                  }}
                ]
              }
            }))
          }
        },
        { p: { text: `Total: ${state.todos.length} todos` } },
        { p: { text: `Completed: ${state.todos.filter(t => t.completed).length}` } }
      ]
    }
  };
});

// Example 3: Component with computed properties
const UserProfile = withState({
  firstName: 'John',
  lastName: 'Doe',
  age: 30,
  email: 'john.doe@example.com'
}, {
  computed: {
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    isAdult: (state) => state.age >= 18
  }
})(({ state, setState }) => ({
  div: {
    className: 'user-profile',
    children: [
      { h2: { text: 'User Profile with Computed Properties' } },
      { p: { text: `Name: ${state.fullName}` } },
      { p: { text: `Age: ${state.age}` } },
      { p: { text: `Email: ${state.email}` } },
      { p: { 
        text: `Status: ${state.isAdult ? 'Adult' : 'Minor'}`,
        style: `color: ${state.isAdult ? 'green' : 'red'}`
      }},
      {
        div: {
          children: [
            { input: {
              type: 'text',
              placeholder: 'First Name',
              value: state.firstName,
              oninput: (e) => setState({ firstName: e.target.value })
            }},
            { input: {
              type: 'number',
              placeholder: 'Age',
              value: state.age,
              oninput: (e) => setState({ age: parseInt(e.target.value) || 0 })
            }}
          ]
        }
      }
    ]
  }
}));

// Example 4: Component with actions
const ShoppingCart = withState({
  items: [
    { id: 1, name: 'Apple', price: 1.20, quantity: 3 },
    { id: 2, name: 'Banana', price: 0.80, quantity: 2 }
  ]
}, {
  actions: {
    addItem: (state, setState, { args: [item] }) => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        setState({
          items: state.items.map(i => 
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        });
      } else {
        setState({ items: [...state.items, { ...item, quantity: 1 }] });
      }
    },
    removeItem: (state, setState, { args: [id] }) => {
      setState({
        items: state.items.filter(item => item.id !== id)
      });
    },
    updateQuantity: (state, setState, { args: [id, quantity] }) => {
      if (quantity <= 0) {
        return ShoppingCart.actions.removeItem(state, setState, { args: [id] });
      }
      setState({
        items: state.items.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      });
    }
  }
})(({ state, actions }) => {
  const total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    div: {
      className: 'shopping-cart',
      children: [
        { h2: { text: 'Shopping Cart Example' } },
        {
          ul: {
            children: state.items.map(item => ({
              li: {
                key: item.id,
                children: [
                  { span: { text: `${item.name} - $${item.price.toFixed(2)} x ${item.quantity}` } },
                  { button: { 
                    text: '+', 
                    onclick: () => actions.updateQuantity(item.id, item.quantity + 1) 
                  }},
                  { button: { 
                    text: '-', 
                    onclick: () => actions.updateQuantity(item.id, item.quantity - 1) 
                  }},
                  { button: { 
                    text: 'Remove', 
                    onclick: () => actions.removeItem(item.id) 
                  }}
                ]
              }
            }))
          }
        },
        { p: { text: `Total: $${total.toFixed(2)}` } },
        { button: { 
          text: 'Add Apple', 
          onclick: () => actions.addItem({ id: 3, name: 'Orange', price: 1.50 }) 
        }}
      ]
    }
  };
});

// Render examples
console.log('=== Counter Example ===');
console.log(renderToString(Counter()));

console.log('\n=== Todo List Example ===');
console.log(renderToString(TodoList()));

console.log('\n=== User Profile Example ===');
console.log(renderToString(UserProfile()));

console.log('\n=== Shopping Cart Example ===');
console.log(renderToString(ShoppingCart()));
