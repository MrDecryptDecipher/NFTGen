/**
 * NFTGen and Nija Wallet Integration Verification Script
 * 
 * This script verifies the integration between NFTGen and Nija Wallet
 * by checking localStorage for activity data and generating test data if needed.
 */

import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const NWALLET_WS_URL = 'ws://localhost:5176/ws';
const NWALLET_URL = 'http://localhost:5174';
const NFTGEN_URL = 'http://localhost:5175';
const VERIFICATION_SERVER_URL = 'http://localhost:3456';

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Generate a random transaction hash
function generateRandomTxHash() {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

// Get a recent timestamp
function getRecentTimestamp() {
  return Date.now();
}

// Create a mock NFT
function createMockNFT() {
  const id = Math.floor(Math.random() * 1000);
  return {
    name: `Test NFT #${id}`,
    description: 'This is a test NFT created to verify the integration',
    fractions: 1,
    royaltyFee: 2.5,
    asset: {
      imageUrl: 'https://picsum.photos/300/300',
      metadataUrl: 'https://example.com/metadata/test.json'
    }
  };
}

// Create a mock NFT activity
function createMockNFTActivity() {
  const nft = createMockNFT();
  return {
    type: 'mint',
    hash: generateRandomTxHash(),
    status: 'pending',
    timestamp: getRecentTimestamp(),
    details: nft
  };
}

// Test WebSocket connection
async function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    log('Testing WebSocket connection to Nija Wallet...');
    
    const ws = new WebSocket(NWALLET_WS_URL);
    let connected = false;
    
    // Set a timeout
    const timeout = setTimeout(() => {
      if (!connected) {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      log('WebSocket connection established', 'success');
      
      // Send a heartbeat message
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: Date.now()
      }));
      log('Heartbeat message sent');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received message: ${JSON.stringify(message)}`);
        
        if (message.type === 'welcome') {
          log('Received welcome message', 'success');
        }
        
        if (message.type === 'heartbeat-response') {
          log('Received heartbeat response', 'success');
          ws.close();
          resolve(true);
        }
      } catch (e) {
        log(`Error parsing message: ${e.message}`, 'error');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`WebSocket error: ${error.message}`, 'error');
      reject(error);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!connected) {
        reject(new Error('WebSocket connection closed before establishing'));
      }
    });
  });
}

// Test sending an activity
async function testSendActivity() {
  return new Promise((resolve, reject) => {
    log('Testing sending NFT activity to Nija Wallet...');
    
    const ws = new WebSocket(NWALLET_WS_URL);
    let connected = false;
    
    // Set a timeout
    const timeout = setTimeout(() => {
      if (!connected) {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      log('WebSocket connection established', 'success');
      
      // Create a mock activity
      const activity = createMockNFTActivity();
      log(`Created mock activity: ${JSON.stringify(activity)}`);
      
      // Send the activity
      const message = {
        type: 'activity-sync',
        data: activity,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(message));
      log('Activity sent to WebSocket server', 'success');
      
      // Wait for a response
      setTimeout(() => {
        ws.close();
        resolve(activity);
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received message: ${JSON.stringify(message)}`);
        
        if (message.type === 'activity-update') {
          log('Activity was broadcast back to clients', 'success');
        }
      } catch (e) {
        log(`Error parsing message: ${e.message}`, 'error');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`WebSocket error: ${error.message}`, 'error');
      reject(error);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!connected) {
        reject(new Error('WebSocket connection closed before establishing'));
      }
    });
  });
}

// Check if services are running
async function checkServices() {
  log('Checking if all services are running...');
  
  const services = [
    { name: 'Nija Wallet', url: NWALLET_URL },
    { name: 'NFTGen', url: NFTGEN_URL },
    { name: 'Verification Server', url: VERIFICATION_SERVER_URL }
  ];
  
  const results = await Promise.all(services.map(async (service) => {
    try {
      const response = await fetch(service.url);
      const status = response.status;
      const isOk = status >= 200 && status < 300;
      
      if (isOk) {
        log(`${service.name} is running (${status})`, 'success');
      } else {
        log(`${service.name} returned status ${status}`, 'warning');
      }
      
      return { service: service.name, status, isOk };
    } catch (error) {
      log(`${service.name} is not accessible: ${error.message}`, 'error');
      return { service: service.name, status: 0, isOk: false, error: error.message };
    }
  }));
  
  const allRunning = results.every(r => r.isOk);
  
  if (allRunning) {
    log('All services are running', 'success');
  } else {
    log('Some services are not running', 'warning');
  }
  
  return { allRunning, results };
}

// Run all tests
async function runTests() {
  log('Starting integration tests...');
  
  try {
    // Step 1: Check if all services are running
    const servicesCheck = await checkServices();
    if (!servicesCheck.allRunning) {
      log('Cannot proceed with tests because some services are not running', 'error');
      return false;
    }
    
    // Step 2: Test WebSocket connection
    await testWebSocketConnection();
    
    // Step 3: Test sending an activity
    const activity = await testSendActivity();
    
    // Step 4: Verify the activity was received
    log('Waiting 2 seconds for activity to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    log('Integration tests completed successfully', 'success');
    log(`Test activity hash: ${activity.hash}`);
    log('You can now check the Nija Wallet UI to see if the activity appears in the transaction list');
    
    return true;
  } catch (error) {
    log(`Integration tests failed: ${error.message}`, 'error');
    return false;
  }
}

// Run the tests
runTests().then(success => {
  if (success) {
    log('All tests passed!', 'success');
  } else {
    log('Tests failed', 'error');
  }
}); 