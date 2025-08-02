import { renderToString } from '../src/coherent.js';

// Basic component example - Greeting component with conditional rendering
const Greeting = ({ name = 'World', mood = 'happy' }) => ({
    div: {
        className: `greeting greeting--${mood}`,
        children: [
            { h2: { text: `Hello, ${name}!` } },
            { p: { text: `You seem ${mood} today` } },
            mood === 'fantastic' ? {
                div: {
                    className: 'celebration',
                    children: [
                        // Celebration message with emojis
                        { span: { text: '🎉' } },
                        { span: { text: ' Amazing!' } },
                        { span: { text: ' 🎉' } }
                    ]
                }
            } : null
        ].filter(Boolean)
    }
});

// User profile component with styling
const UserCard = ({ user }) => ({
    div: {
        className: 'user-card',
        style: 'border: 1px solid #ccc; padding: 10px; margin: 10px;',
        children: [
            { h3: { text: user.name } },
            { p: { text: `Email: ${user.email}` } },
            { p: { text: `Role: ${user.role}` } }
        ]
    }
});

// List component rendering multiple user cards
const UserList = ({ users = [] }) => ({
    div: {
        className: 'user-list',
        children: [
            { h2: { text: 'User List' } },
            users.length > 0 ? {
                ul: {
                    children: users.map(user => ({
                        li: {
                            key: user.id,
                            children: [UserCard({ user })]
                        }
                    }))
                }
            } : {
                p: { text: 'No users found' }
            }
        ]
    }
});

// Test data
const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' }
];

console.log('=== Basic Greeting ===');
console.log(renderToString(Greeting({ name: 'World', mood: 'fantastic' })));

console.log('\n=== User List ===');
console.log(renderToString(UserList({ users })));

console.log('\n=== Complete HTML Page ===');
const completePage = {
    html: {
        children: [
            {
                head: {
                    children: [
                        { title: { text: 'Coherent Framework Demo' } },
                        {
                            style: {
                                text: `
                  .greeting { padding: 20px; margin: 10px; border: 1px solid #ddd; }
                  .greeting--happy { border-color: #4CAF50; }
                  .greeting--fantastic { border-color: #FF5722; background: #fff3e0; }
                  .user-list { margin: 20px 0; }
                  .user-list ul { list-style-type: none; padding: 0; }
                  .user-list li { padding: 8px; margin: 4px 0; background: #f5f5f5; }
                `
                            }
                        }
                    ]
                }
            },
            {
                body: {
                    children: [
                        { h1: { text: 'Coherent Framework Demo' } },
                        Greeting({ name: 'Coherent User', mood: 'fantastic' }),
                        UserList({ users })
                    ]
                }
            }
        ]
    }
};

console.log(renderToString(completePage));
