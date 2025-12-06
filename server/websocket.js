import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const port = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : 7105;

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NFTGen WebSocket Server');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const clientId = req.headers['sec-websocket-key'] || Date.now().toString();

  // Store client connection
  clients.set(clientId, {
    ws,
    isAlive: true,
    lastActivity: Date.now(),
    sessionId: null,
    address: null
  });

  console.log(`Client connected: ${clientId}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to NFTGen WebSocket Server',
    timestamp: new Date().toISOString()
  }));

  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(clientId);

      // Update last activity
      client.lastActivity = Date.now();

      // Handle different message types
      switch (data.type) {
        case 'auth':
          // Store session info
          client.sessionId = data.sessionId;
          client.address = data.address;

          // Send auth success response
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Authentication successful',
            address: data.address,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        case 'subscribe':
          // Handle subscription
          client.subscriptions = client.subscriptions || [];
          client.subscriptions.push(data.channel);

          // Send subscription confirmation
          ws.send(JSON.stringify({
            type: 'subscription_success',
            channel: data.channel,
            message: `Subscribed to ${data.channel}`,
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          // Echo unknown messages
          ws.send(JSON.stringify({
            type: 'echo',
            data: data,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);

      // Send error response
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  });

  // Set up ping-pong for connection health check
  ws.isAlive = true;
  ws.on('pong', () => {
    const client = clients.get(clientId);
    if (client) {
      client.isAlive = true;
    }
  });
});

// Heartbeat to check for dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Handle WebSocket server close
wss.on('close', () => {
  clearInterval(interval);
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`NFTGen WebSocket server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing WebSocket server');
  wss.close(() => {
    console.log('WebSocket server closed');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

export default { server, wss };
