import WebSocket from 'ws';

// Test script for WebSocket connection to Nija Wallet
const ws = new WebSocket('ws://localhost:5176/ws');

console.log('Attempting to connect to Nija Wallet WebSocket...');

// Connection opened
ws.on('open', () => {
  console.log('Connection established with Nija Wallet WebSocket server!');
  
  // Send a heartbeat message which should get a response
  ws.send(JSON.stringify({
    type: 'heartbeat',
    timestamp: Date.now()
  }));
  
  console.log('Heartbeat message sent');
});

// Listen for messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received message:', message);
    
    // Close the connection after receiving a heartbeat response
    if (message.type === 'heartbeat-response') {
      console.log('Test completed successfully - received heartbeat response');
      ws.close();
      process.exit(0);
    }
  } catch (e) {
    console.error('Error parsing message:', e);
  }
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

// Set a timeout to close the connection if no response is received
setTimeout(() => {
  console.log('Test timed out after 5 seconds');
  ws.close();
  process.exit(1);
}, 5000); 