import http from 'http';
import createObjectRouter from '../src/api/router.js';

// Create router with WebSocket support enabled
const router = createObjectRouter({}, {
  enableWebSockets: true,
  enableMetrics: true,
  enableVersioning: true
});

// Regular HTTP routes
router.addRoute('GET', '/', (req, res) => {
  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  });
  res.end(`<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Routing Demo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { margin: 20px 0; }
        #messages { border: 1px solid #ccc; height: 300px; overflow-y: scroll; padding: 10px; }
        .message { margin: 5px 0; padding: 5px; background: #f5f5f5; }
        input, button { margin: 5px; padding: 8px; }
        button { background: #007cba; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a87; }
    </style>
</head>
<body>
    <h1>WebSocket Routing Demo</h1>
    
    <div class="container">
        <h2>Chat Room</h2>
        <div id="messages"></div>
        <input type="text" id="messageInput" placeholder="Type a message..." />
        <button id="sendBtn">Send</button>
        <button id="connectChatBtn">Connect to Chat</button>
        <button id="disconnectChatBtn">Disconnect</button>
    </div>
    
    <div class="container">
        <h2>Real-time Notifications</h2>
        <div id="notifications"></div>
        <button id="connectNotificationsBtn">Connect to Notifications</button>
        <button id="disconnectNotificationsBtn">Disconnect</button>
    </div>
    
    <div class="container">
        <h2>User-specific Channel</h2>
        <input type="text" id="userId" placeholder="Enter user ID..." />
        <button id="connectUserBtn">Connect to User Channel</button>
        <button id="disconnectUserBtn">Disconnect</button>
        <div id="userMessages"></div>
    </div>

    <script>
        let chatWs = null;
        let notificationWs = null;
        let userWs = null;

        function addMessage(containerId, message) {
            const container = document.getElementById(containerId);
            const div = document.createElement('div');
            div.className = 'message';
            div.textContent = new Date().toLocaleTimeString() + ': ' + message;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function connectChat() {
            if (chatWs) return;
            chatWs = new WebSocket('ws://localhost:3003/ws/chat');
            
            chatWs.onopen = () => addMessage('messages', 'Connected to chat');
            chatWs.onmessage = (event) => addMessage('messages', 'Received: ' + event.data);
            chatWs.onclose = () => {
                addMessage('messages', 'Disconnected from chat');
                chatWs = null;
            };
        }

        function disconnectChat() {
            if (chatWs) {
                chatWs.close();
                chatWs = null;
            }
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            if (chatWs && input.value) {
                chatWs.send(input.value);
                addMessage('messages', 'Sent: ' + input.value);
                input.value = '';
            }
        }

        function connectNotifications() {
            if (notificationWs) return;
            notificationWs = new WebSocket('ws://localhost:3003/ws/notifications');
            
            notificationWs.onopen = () => addMessage('notifications', 'Connected to notifications');
            notificationWs.onmessage = (event) => addMessage('notifications', 'Notification: ' + event.data);
            notificationWs.onclose = () => {
                addMessage('notifications', 'Disconnected from notifications');
                notificationWs = null;
            };
        }

        function disconnectNotifications() {
            if (notificationWs) {
                notificationWs.close();
                notificationWs = null;
            }
        }

        function connectUser() {
            const userId = document.getElementById('userId').value;
            if (!userId || userWs) return;
            
            userWs = new WebSocket('ws://localhost:3003/ws/user/' + userId);
            
            userWs.onopen = () => addMessage('userMessages', 'Connected to user channel: ' + userId);
            userWs.onmessage = (event) => addMessage('userMessages', 'User message: ' + event.data);
            userWs.onclose = () => {
                addMessage('userMessages', 'Disconnected from user channel');
                userWs = null;
            };
        }

        function disconnectUser() {
            if (userWs) {
                userWs.close();
                userWs = null;
            }
        }

        // Event listeners
        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('connectChatBtn').addEventListener('click', connectChat);
        document.getElementById('disconnectChatBtn').addEventListener('click', disconnectChat);
        document.getElementById('connectNotificationsBtn').addEventListener('click', connectNotifications);
        document.getElementById('disconnectNotificationsBtn').addEventListener('click', disconnectNotifications);
        document.getElementById('connectUserBtn').addEventListener('click', connectUser);
        document.getElementById('disconnectUserBtn').addEventListener('click', disconnectUser);
        
        // Enter key support for message input
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Auto-connect on page load
        setTimeout(() => {
            connectChat();
            connectNotifications();
        }, 1000);
    </script>
</body>
</html>`);
});

// Admin endpoints
router.addRoute('GET', '/admin/ws/connections', (req, res) => {
  const connections = router.getWebSocketConnections();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    total: connections.length,
    connections: connections
  }, null, 2));
});

router.addRoute('POST', '/admin/ws/broadcast', async (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { path, message } = JSON.parse(body);
      router.broadcast(path || '*', message);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, broadcasted: message }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

router.addRoute('GET', '/admin/metrics', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(router.metrics, null, 2));
});

// WebSocket routes
router.addWebSocketRoute('/ws/chat', (ws) => {
  console.log('New chat connection established');
  
  // Broadcast user joined message to all other users
  setTimeout(() => router.broadcast('/ws/chat', 'A user joined the chat'), 100);
  ws.send('Welcome to the chat room!');
  
  ws.onmessage = (event) => {
    const message = event.data;
    console.log('Chat message received:', message);
    
    // Broadcast to all chat connections
    router.broadcast('/ws/chat', `User says: ${message}`);
  };
  
  // Store the connection path for disconnect broadcast
  ws._chatPath = '/ws/chat';
  ws._router = router;
  
  ws.socket.on('close', () => {
    console.log('Chat connection closed, broadcasting disconnect message');
    // Broadcast user left message to remaining users BEFORE connection cleanup
    if (ws._router && ws._chatPath) {
      // Use setTimeout to ensure broadcast happens before connection cleanup
      setTimeout(() => {
        ws._router.broadcast(ws._chatPath, 'A user left the chat', ws.id);
      }, 10);
    }
  });
});

router.addWebSocketRoute('/ws/notifications', (ws) => {
  console.log('New notification connection established');
  
  ws.send('Connected to notifications');
  
  // Send periodic notifications
  const interval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(`Notification at ${new Date().toLocaleTimeString()}`);
    } else {
      clearInterval(interval);
    }
  }, 5000);
  
  ws.socket.on('close', () => {
    console.log('Notification connection closed');
    clearInterval(interval);
  });
});

// Parameterized WebSocket route
router.addWebSocketRoute('/ws/user/:userId', (ws) => {
  const userId = ws.params.userId;
  console.log(`New user connection for: ${userId}`);
  
  ws.send(`Welcome user ${userId}!`);
  
  ws.onmessage = (event) => {
    const message = event.data;
    console.log(`Message from user ${userId}:`, message);
    ws.send(`Echo: ${message}`);
  };
  
  ws.socket.on('close', () => {
    console.log(`User ${userId} disconnected`);
  });
});

// Versioned WebSocket route
router.addWebSocketRoute('/ws/api/data', (ws) => {
  console.log('API data connection established');
  
  const version = ws.version || 'v1';
  ws.send(`Connected to API data stream (${version})`);
  
  // Send different data based on version
  const interval = setInterval(() => {
    if (ws.readyState === 1) {
      const data = version === 'v2' 
        ? { timestamp: Date.now(), data: 'enhanced data', version }
        : { time: new Date().toISOString(), message: 'basic data' };
      
      ws.send(JSON.stringify(data));
    } else {
      clearInterval(interval);
    }
  }, 3000);
  
  ws.socket.on('close', () => {
    clearInterval(interval);
  });
}, { version: 'v1' });

// Create HTTP server
const server = http.createServer((req, res) => {
  router.handle(req, res);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  router.handleWebSocketUpgrade(request, socket, head);
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`WebSocket routing demo server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /                     - Demo page');
  console.log('  WS   /ws/chat              - Chat room');
  console.log('  WS   /ws/notifications     - Real-time notifications');
  console.log('  WS   /ws/user/:userId      - User-specific channel');
  console.log('  WS   /ws/api/data          - Versioned API data stream');
  console.log('  GET  /admin/ws/connections - List active connections');
  console.log('  POST /admin/ws/broadcast   - Broadcast message');
  console.log('  GET  /admin/metrics        - Performance metrics');
});
