import createObjectRouter from '../packages/api/src/router.js';
import http from 'http';


// Define routes using configuration objects with 'ws' property
const routes = {
  // Regular HTTP routes
  '/': {
    get: {
      handler: (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Config Routing Demo</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .messages { height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
        input, button { padding: 8px; margin: 5px; }
        .status { font-weight: bold; }
        .connected { color: green; }
        .disconnected { color: red; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WebSocket Configuration Routing Demo</h1>
        
        <div class="section">
            <h2>Chat Room (Config-based WebSocket)</h2>
            <div class="status" id="chatStatus">Disconnected</div>
            <div class="messages" id="chatMessages"></div>
            <input type="text" id="chatInput" placeholder="Type a message..." />
            <button onclick="sendChatMessage()">Send</button>
            <button onclick="connectChat()">Connect</button>
            <button onclick="disconnectChat()">Disconnect</button>
        </div>

        <div class="section">
            <h2>Notifications (Config-based WebSocket)</h2>
            <div class="status" id="notifStatus">Disconnected</div>
            <div class="messages" id="notifMessages"></div>
            <button onclick="connectNotifications()">Connect</button>
            <button onclick="disconnectNotifications()">Disconnect</button>
        </div>

        <div class="section">
            <h2>User Channel (Config-based WebSocket with Parameters)</h2>
            <input type="text" id="userId" placeholder="Enter user ID" value="123" />
            <div class="status" id="userStatus">Disconnected</div>
            <div class="messages" id="userMessages"></div>
            <button onclick="connectUser()">Connect</button>
            <button onclick="disconnectUser()">Disconnect</button>
        </div>
    </div>

    <script>
        let chatWs = null;
        let notifWs = null;
        let userWs = null;

        function addMessage(containerId, message) {
            const container = document.getElementById(containerId);
            const div = document.createElement('div');
            div.textContent = new Date().toLocaleTimeString() + ': ' + message;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        function updateStatus(statusId, connected) {
            const status = document.getElementById(statusId);
            status.textContent = connected ? 'Connected' : 'Disconnected';
            status.className = 'status ' + (connected ? 'connected' : 'disconnected');
        }

        // Generate a unique user ID for this session
        const userId = 'User' + Math.floor(Math.random() * 1000);
        
        // Chat functions
        function connectChat() {
            console.log('Connect chat button clicked');
            if (chatWs) {
                console.log('Chat WebSocket already exists');
                return;
            }
            console.log('Creating new chat WebSocket');
            chatWs = new WebSocket('ws://localhost:3004/ws/chat');
            
            chatWs.onopen = () => {
                console.log('Chat WebSocket opened');
                updateStatus('chatStatus', true);
                addMessage('chatMessages', 'Connected to chat as ' + userId);
                // Send user ID to server immediately for join message
                chatWs.send(JSON.stringify({ userId: userId, message: '' }));
            };
            
            chatWs.onmessage = (event) => {
                console.log('Received chat message:', event.data);
                addMessage('chatMessages', event.data);
            };
            
            chatWs.onclose = () => {
                console.log('Chat WebSocket closed, updating status');
                updateStatus('chatStatus', false);
                addMessage('chatMessages', 'Disconnected from chat');
                chatWs = null;
            };
            
            chatWs.onerror = (error) => {
                console.log('Chat WebSocket error:', error);
            };
        }

        function disconnectChat() {
            if (chatWs) {
                console.log('Disconnecting chat WebSocket');
                updateStatus('chatStatus', false);
                addMessage('chatMessages', 'Disconnecting from chat...');
                // Send disconnect message before closing
                try {
                    chatWs.send(JSON.stringify({ userId: userId, message: 'DISCONNECT' }));
                } catch (e) {
                    console.log('Could not send disconnect message:', e);
                }
                chatWs.close();
                chatWs = null;
            }
        }

        function sendChatMessage() {
            const input = document.getElementById('chatInput');
            if (chatWs && input.value.trim()) {
                // Send message with user ID
                const messageData = JSON.stringify({
                    userId: userId,
                    message: input.value.trim()
                });
                chatWs.send(messageData);
                input.value = '';
            }
        }

        // Notifications functions
        function connectNotifications() {
            if (notifWs) return;
            notifWs = new WebSocket('ws://localhost:3004/ws/notifications');
            
            notifWs.onopen = () => {
                updateStatus('notifStatus', true);
                addMessage('notifMessages', 'Connected to notifications');
            };
            
            notifWs.onmessage = (event) => {
                addMessage('notifMessages', event.data);
            };
            
            notifWs.onclose = () => {
                console.log('Notifications WebSocket closed, updating status');
                updateStatus('notifStatus', false);
                addMessage('notifMessages', 'Disconnected from notifications');
                notifWs = null;
            };
        }

        function disconnectNotifications() {
            console.log('Disconnect notifications button clicked');
            if (notifWs) {
                console.log('Closing notifications WebSocket');
                // Update status immediately when disconnect is clicked
                updateStatus('notifStatus', false);
                addMessage('notifMessages', 'Disconnected from notifications');
                notifWs.close();
                notifWs = null;
            } else {
                console.log('No notifications WebSocket to close');
            }
        }

        // User channel functions
        function connectUser() {
            if (userWs) return;
            const userId = document.getElementById('userId').value || '123';
            userWs = new WebSocket(\`ws://localhost:3004/ws/user/\${userId}\`);
            
            userWs.onopen = () => {
                updateStatus('userStatus', true);
                addMessage('userMessages', \`Connected to user channel \${userId}\`);
            };
            
            userWs.onmessage = (event) => {
                addMessage('userMessages', event.data);
            };
            
            userWs.onclose = () => {
                console.log('User WebSocket closed, updating status');
                updateStatus('userStatus', false);
                addMessage('userMessages', 'Disconnected from user channel');
                userWs = null;
            };
        }

        function disconnectUser() {
            console.log('Disconnect user button clicked');
            if (userWs) {
                console.log('Closing user WebSocket');
                // Update status immediately when disconnect is clicked
                updateStatus('userStatus', false);
                addMessage('userMessages', 'Disconnected from user channel');
                userWs.close();
                userWs = null;
            } else {
                console.log('No user WebSocket to close');
            }
        }

        // Allow Enter key to send chat messages
        document.getElementById('chatInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    </script>
</body>
</html>
        `);
      }
    }
  },

  // WebSocket routes defined using configuration objects
  'ws': {
    'chat': {
      ws: (ws) => {
        console.log('Chat WebSocket connected via config routing');
        
        let userIdForConnection = null;
        
        ws.send('Welcome to the config-based chat room!');
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Store user ID for disconnect message on first message
            if (!userIdForConnection) {
              userIdForConnection = data.userId;
              router.broadcast('/ws/chat', data.userId + ' joined the chat');
            }
            // Handle disconnect message
            if (data.message === 'DISCONNECT') {
              console.log('Received disconnect message from', data.userId);
              router.broadcast('/ws/chat', data.userId + ' left the chat', ws.id);
              return;
            }
            // Only broadcast if there's an actual message (not empty join message)
            if (data.message && data.message.trim()) {
              console.log('Config chat message from', data.userId + ':', data.message);
              router.broadcast('/ws/chat', data.userId + ': ' + data.message);
            }
          } catch {
            // Fallback for plain text messages
            const message = event.data;
            console.log('Config chat message:', message);
            router.broadcast('/ws/chat', 'User: ' + message);
          }
        };
        
        ws.onclose = () => {
          console.log('Config chat connection closed, broadcasting disconnect message');
          const disconnectMessage = userIdForConnection ? 
            userIdForConnection + ' left the chat' : 
            'A user left the chat';
          console.log('Broadcasting disconnect message:', disconnectMessage);
          console.log('Active connections before broadcast:', router.wsConnections.size);
          router.broadcast('/ws/chat', disconnectMessage, ws.id);
          console.log('Disconnect message broadcasted');
        };
      }
    },

    'notifications': {
      ws: (ws) => {
        console.log('Notifications WebSocket connected via config routing');
        ws.send('Connected to config-based notifications');
        
        // Send periodic notifications
        const interval = setInterval(() => {
          if (ws.readyState === 1) {
            const notifications = [
              'New message received',
              'System update available', 
              'Your report is ready',
              'Meeting reminder: 15 minutes',
              'New comment on your post'
            ];
            const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
            ws.send(`📢 ${randomNotif}`);
          } else {
            clearInterval(interval);
          }
        }, 3000);
        
        ws.socket.on('close', () => {
          console.log('Config notifications connection closed');
          clearInterval(interval);
        });
      }
    },

    'user': {
      ':userId': {
        ws: (ws, request) => {
          const userId = request.params.userId;
          console.log(`User-specific WebSocket connected for user ${userId} via config routing`);
          
          ws.send(`Welcome user ${userId}! This is your personal channel.`);
          
          // Send user-specific updates
          const interval = setInterval(() => {
            if (ws.readyState === 1) {
              const updates = [
                `User ${userId}: Your profile was viewed`,
                `User ${userId}: New friend request`,
                `User ${userId}: Task completed`,
                `User ${userId}: Achievement unlocked!`
              ];
              const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
              ws.send(randomUpdate);
            } else {
              clearInterval(interval);
            }
          }, 4000);
          
          ws.socket.on('close', () => {
            console.log(`Config user ${userId} connection closed`);
            clearInterval(interval);
          });
        }
      }
    }
  },

  // Admin routes for monitoring
  'admin': {
    'ws': {
      'connections': {
        get: {
          handler: (req, res) => {
            const connections = router.getWebSocketConnections();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(connections, null, 2));
          }
        }
      },
      'broadcast': {
        post: {
          handler: (req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const { path, message } = JSON.parse(body);
                router.broadcast(path, message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, broadcasted: message }));
              } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
          }
        }
      }
    },
    'metrics': {
      get: {
        handler: (req, res) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(router.metrics, null, 2));
        }
      }
    }
  }
};

const router = createObjectRouter(routes, { enableWebSockets: true });


// Create HTTP server
const server = http.createServer((req, res) => {
  router.handle(req, res);
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  router.handleWebSocketUpgrade(request, socket, head);
});

const PORT = 3004;
server.listen(PORT, () => {
  console.log(`WebSocket config routing demo server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /                     - Demo page');
  console.log('  WS   /ws/chat              - Chat room (config-based)');
  console.log('  WS   /ws/notifications     - Real-time notifications (config-based)');
  console.log('  WS   /ws/user/:userId      - User-specific channel (config-based)');
  console.log('  GET  /admin/ws/connections - List active connections');
  console.log('  POST /admin/ws/broadcast   - Broadcast message');
  console.log('  GET  /admin/metrics        - Performance metrics');
});
