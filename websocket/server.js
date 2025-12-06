const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { v4: uuidv4 } = require('uuid');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NFTGen WebSocket Server');
});

// Create WebSocket server with path
const wss = new WebSocket.Server({
  server,
  path: '/ws/nftgen'
});

// Store connected clients
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const id = uuidv4();
  const parsedUrl = url.parse(req.url, true);
  const sessionId = parsedUrl.query.sessionId || '';
  const address = parsedUrl.query.address || '';
  const origin = parsedUrl.query.origin || '';

  console.log(`[${new Date().toISOString()}] New connection: ${id} from ${req.socket.remoteAddress}`);
  console.log(`Session ID: ${sessionId}, Address: ${address}, Origin: ${origin}`);

  // Store client information
  clients.set(ws, {
    id,
    sessionId,
    address,
    origin,
    lastActivity: Date.now()
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    timestamp: Date.now(),
    id
  }));

  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[${new Date().toISOString()}] Received message from ${id}:`, data);

      // Update last activity
      const client = clients.get(ws);
      if (client) {
        client.lastActivity = Date.now();
      }

      // Handle different message types
      switch (data.type) {
        case 'heartbeat':
          ws.send(JSON.stringify({
            type: 'heartbeat-response',
            timestamp: Date.now()
          }));
          break;

        case 'activity':
          // Broadcast activity to all clients with the same address
          broadcastToAddress(address, data);
          break;

        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Connection closed: ${id}`);
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error for ${id}:`, error);
    clients.delete(ws);
  });
});

// Broadcast message to all clients with the same address
function broadcastToAddress(address, data) {
  if (!address) return;

  let count = 0;
  clients.forEach((client, ws) => {
    if (client.address === address && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      count++;
    }
  });

  console.log(`Broadcasted message to ${count} clients with address ${address}`);
}

// Periodic cleanup of stale connections
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, ws) => {
    if (now - client.lastActivity > 5 * 60 * 1000) { // 5 minutes
      console.log(`Closing stale connection: ${client.id}`);
      ws.terminate();
      clients.delete(ws);
    }
  });
}, 60 * 1000); // Check every minute

// Start server
const PORT = process.env.PORT || 7101;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`NFTGen WebSocket server running on port ${PORT}`);
});
