import http from 'http';
import createObjectRouter from '../packages/api/src/router.js';

// Create router with WebSocket support using object-based routing
const router = createObjectRouter({
  '/': {
    get: {
      handler: (req, res) => {
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        });
        res.end(`<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Object Routing Demo</title>
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
    <h1>WebSocket Object Routing Demo</h1>
    <p>This demonstrates object-based routing with proper CSP headers.</p>
    
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

    <script>
        let chatWs = null;
        let notificationWs = null;

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
            chatWs = new WebSocket('ws://localhost:3004/ws/chat');
            
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
            notificationWs = new WebSocket('ws://localhost:3004/ws/notifications');
            
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

        // Event listeners
        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('connectChatBtn').addEventListener('click', connectChat);
        document.getElementById('disconnectChatBtn').addEventListener('click', disconnectChat);
        document.getElementById('connectNotificationsBtn').addEventListener('click', connectNotifications);
        document.getElementById('disconnectNotificationsBtn').addEventListener('click', disconnectNotifications);
        
        // Enter key support
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
      }
    }
  },
  
  'admin': {
    'metrics': {
      get: {
        handler: (req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(router.metrics, null, 2));
        }
      }
    },
    'ws': {
      'connections': {
        get: {
          handler: (req, res) => {
            const connections = router.getWebSocketConnections();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              total: connections.length,
              connections: connections
            }, null, 2));
          }
        }
      }
    }
  }
}, {
  enableWebSockets: true,
  enableMetrics: true,
  enableVersioning: true
});

// WebSocket routes
router.addWebSocketRoute('/ws/chat', (ws) => {
  console.log('New chat connection established');
  
  ws.send('Welcome to the chat room!');
  
  ws.onmessage = (event) => {
    const message = event.data;
    console.log('Chat message received:', message);
    
    // Broadcast to all chat connections
    router.broadcast('/ws/chat', `User says: ${message}`);
  };
  
  ws.socket.on('close', () => {
    console.log('Chat connection closed');
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

// Create HTTP server
const server = http.createServer((req, res) => {
  router.handle(req, res);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  router.handleWebSocketUpgrade(request, socket, head);
});

const PORT = 3004;
server.listen(PORT, () => {
  console.log(`WebSocket object routing demo server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /                     - Demo page');
  console.log('  WS   /ws/chat              - Chat room');
  console.log('  WS   /ws/notifications     - Real-time notifications');
  console.log('  GET  /admin/ws/connections - List active connections');
  console.log('  GET  /admin/metrics        - Performance metrics');
});
