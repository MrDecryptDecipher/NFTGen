import { NFTActivity } from '../types/nft';
import { NWALLET_WS_URL } from '../config/web3';

// Configuration
const NWALLET_API_URL = 'http://localhost:3456/api';

// WebSocket connection
let ws: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

/**
 * Initialize WebSocket connection to Nija Wallet
 */
export function initializeWebSocketConnection() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log('WebSocket connection already exists');
    return;
  }

  if (isConnecting) {
    console.log('WebSocket connection already in progress');
    return;
  }

  isConnecting = true;
  console.log('🔌 Initializing WebSocket connection to Nija Wallet...');
  console.log(`🔌 Attempting to connect to WebSocket at ${NWALLET_WS_URL}`);

  try {
    ws = new WebSocket(NWALLET_WS_URL);

    ws.onopen = () => {
      console.log('✅ Connected to Nija Wallet WebSocket server');
      isConnecting = false;
      reconnectAttempts = 0;
      
      // Send a heartbeat message to verify connection
      sendHeartbeat();
      
      // Set up heartbeat interval
      if (window.nijaHeartbeatInterval) {
        clearInterval(window.nijaHeartbeatInterval);
      }
      window.nijaHeartbeatInterval = setInterval(sendHeartbeat, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📩 Received WebSocket message:', message);
        
        if (message.type === 'welcome') {
          console.log('👋 Received welcome message from WebSocket server');
        } else if (message.type === 'heartbeat-response') {
          console.log('💓 Received heartbeat response');
          // Update heartbeat timestamp in localStorage
          localStorage.setItem('nija_wallet_heartbeat', Date.now().toString());
        } else if (message.type === 'activity-update') {
          console.log('📝 Received activity update:', message.data);
          // Store activity in localStorage
          if (message.data?.hash) {
            localStorage.setItem(`nftgen_tx_${message.data.hash}`, JSON.stringify(message.data));
            localStorage.setItem('nftgen_latest_activity', JSON.stringify(message.data));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting = false;
      
      // Clear heartbeat interval on error
      if (window.nijaHeartbeatInterval) {
        clearInterval(window.nijaHeartbeatInterval);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      isConnecting = false;
      ws = null;
      
      // Clear heartbeat interval on close
      if (window.nijaHeartbeatInterval) {
        clearInterval(window.nijaHeartbeatInterval);
      }
      
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(initializeWebSocketConnection, RECONNECT_DELAY * reconnectAttempts);
      } else {
        console.error('Max reconnect attempts reached. Please check the WebSocket server.');
      }
    };
  } catch (error) {
    console.error('Failed to initialize WebSocket connection:', error);
    isConnecting = false;
  }
}

/**
 * Send a heartbeat message to keep the connection alive
 */
function sendHeartbeat() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now()
    }));
    console.log('Heartbeat sent to Nija Wallet');
  }
}

/**
 * Sync NFT activity to Nija Wallet
 * @param activity NFT activity to sync
 */
export async function syncActivityToNijaWallet(activity: NFTActivity): Promise<boolean> {
  console.log('Syncing activity to Nija Wallet:', activity);
  
  // Ensure WebSocket connection is initialized
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not connected, initializing connection...');
    initializeWebSocketConnection();
    
    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // If still not connected, try alternative methods
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket connection failed, falling back to API');
      return syncViaAPI(activity);
    }
  }
  
  try {
    // Send activity via WebSocket
    const message = {
      type: 'activity-sync',
      data: activity,
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(message));
    console.log('Activity sent via WebSocket:', activity.hash);
    return true;
  } catch (error) {
    console.error('Error sending activity via WebSocket:', error);
    
    // Fall back to API if WebSocket fails
    return syncViaAPI(activity);
  }
}

/**
 * Sync activity via REST API as fallback
 * @param activity NFT activity to sync
 */
async function syncViaAPI(activity: NFTActivity): Promise<boolean> {
  try {
    console.log('Syncing activity via API:', activity.hash);
    
    const response = await fetch(`${NWALLET_API_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });
    
    if (response.ok) {
      console.log('Activity synced via API successfully');
      return true;
    } else {
      console.error('Failed to sync activity via API:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error syncing activity via API:', error);
    return false;
  }
}

/**
 * Fetch all NFT activities from Nija Wallet
 */
export async function fetchActivitiesFromNijaWallet(): Promise<NFTActivity[]> {
  try {
    console.log('Fetching activities from Nija Wallet API');
    
    const response = await fetch(`${NWALLET_API_URL}/activities`);
    
    if (response.ok) {
      const activities = await response.json();
      console.log(`Fetched ${activities.length} activities from Nija Wallet`);
      return activities;
    } else {
      console.error('Failed to fetch activities:', response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

/**
 * Fetch a specific NFT activity by hash
 * @param hash Transaction hash
 */
export async function fetchActivityByHash(hash: string): Promise<NFTActivity | null> {
  try {
    console.log(`Fetching activity with hash ${hash} from Nija Wallet API`);
    
    const response = await fetch(`${NWALLET_API_URL}/activities/${hash}`);
    
    if (response.ok) {
      const activity = await response.json();
      console.log('Fetched activity:', activity);
      return activity;
    } else if (response.status === 404) {
      console.log(`Activity with hash ${hash} not found`);
      return null;
    } else {
      console.error('Failed to fetch activity:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching activity:', error);
    return null;
  }
}

// Initialize WebSocket connection when this module is imported
initializeWebSocketConnection(); 