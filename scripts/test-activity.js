import WebSocket from 'ws';

// Generate a random hash for the transaction
const generateRandomHash = () => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
};

// Create a mock NFT activity
const createMockActivity = () => {
  return {
    type: 'mint',
    hash: generateRandomHash(),
    status: 'pending',
    timestamp: Date.now(),
    details: {
      name: 'Test NFT ' + Math.floor(Math.random() * 1000),
      description: 'This is a test NFT created to verify the integration',
      fractions: 1,
      royaltyFee: 2.5,
      asset: {
        imageUrl: 'https://picsum.photos/300/300',
        metadataUrl: 'https://example.com/metadata/test.json'
      }
    }
  };
};

// Connect to the WebSocket server and send the activity
const sendMockActivity = async () => {
  try {
    console.log('Connecting to Nija Wallet WebSocket server...');
    const ws = new WebSocket('ws://localhost:5176/ws');
    
    ws.on('open', () => {
      console.log('Connected to WebSocket server!');
      
      // Generate a mock activity
      const activity = createMockActivity();
      console.log('Created mock activity:', activity);
      
      // Send the activity
      const message = {
        type: 'activity-sync',
        data: activity,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(message));
      console.log('Sent activity to WebSocket server');
      
      // Wait for confirmation
      setTimeout(() => {
        console.log('Test completed');
        ws.close();
        process.exit(0);
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received response:', message);
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      process.exit(1);
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  } catch (error) {
    console.error('Error sending mock activity:', error);
    process.exit(1);
  }
};

// Run the test
sendMockActivity(); 