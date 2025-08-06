// Basic component example - Greeting component with conditional rendering
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

// Complete page example with embedded styles
export const completePage = {
    html: {
        children: [
            {
                head: {
                    children: [
                        { title: { text: 'Coherent Framework Demo' } },
                        {
                            style: {
                                text: `
                                .greeting { 
                                    padding: 20px; 
                                    margin: 10px; 
                                    border: 1px solid #ddd; 
                                    border-radius: 4px;
                                }
                                .greeting--happy { border-color: #4CAF50; }
                                .greeting--fantastic { 
                                    border-color: #FF5722; 
                                    background: #fff3e0; 
                                }
                                .celebration { 
                                    margin-top: 10px; 
                                    font-size: 1.2em; 
                                    text-align: center; 
                                }
                                .user-list { margin: 20px 0; }
                                .user-list ul { list-style-type: none; padding: 0; }
                                .user-list li { padding: 8px; margin: 4px 0; background: #f5f5f5; }
                                .user-card { 
                                    border-radius: 4px; 
                                    background: white; 
                                }
                                body { 
                                    font-family: Arial, sans-serif; 
                                    max-width: 800px; 
                                    margin: 0 auto; 
                                    padding: 20px; 
                                }
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
                        { p: { text: 'This page demonstrates basic component usage, composition, and styling.' } },
                        Greeting({ name: 'Coherent User', mood: 'fantastic' }),
                        UserList({ users: sampleUsers })
                    ]
                }
            }
        ]
    }
};

console.log(JSON.stringify(completePage));
// Export the complete page as default for live preview
export default completePage;
