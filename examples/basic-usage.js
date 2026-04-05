/**
 * @name Basic Usage
 * @category Getting Started
 * @description Greeting components with conditional rendering and user cards.
 */
export const Greeting = ({ name = 'World', mood = 'happy' }) => ({
    div: {
        className: `greeting greeting--${mood}`,
        children: [
            { h2: { text: `Hello, ${name}!` } },
            { p: { text: `You seem ${mood} today` } },
            mood === 'fantastic' ? {
                div: {
                    className: 'celebration',
                    children: [
                        { span: { text: '🎉 Amazing! 🎉' } }
                    ]
                }
            } : null
        ].filter(Boolean)
    }
});

// User profile component with styling
export const UserCard = ({ user }) => ({
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
export const UserList = ({ users = [] }) => ({
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

// Sample data for demonstration
const sampleUsers = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'User' }
];

// Demo component combining everything
const Demo = () => ({
    div: {
        style: 'font-family: system-ui, sans-serif; max-width: 800px; padding: 20px;',
        children: [
            { h1: { text: 'Coherent Framework Demo' } },
            { p: { text: 'This page demonstrates basic component usage, composition, and styling.' } },
            Greeting({ name: 'Coherent User', mood: 'fantastic' }),
            UserList({ users: sampleUsers })
        ]
    }
});

// Export for playground preview
export default Demo();
