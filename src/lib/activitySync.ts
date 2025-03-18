// Types for activity synchronization between NFTGen and Nija Wallet
export type ActivityType = 'mint' | 'transfer' | 'fractionalize' | 'sell' | 'buy';
export type ActivityStatus = 'pending' | 'confirmed' | 'failed';

export interface ActivityData {
  type: ActivityType;
  hash: `0x${string}`;
  status: ActivityStatus;
  timestamp: number;
  details: {
    name: string;
    description?: string;
    fractions?: number;
    royaltyFee?: number;
    status?: ActivityStatus;
    timestamp?: number;
    confirmationTime?: number;
    transactionHash?: string;
    asset: {
      name?: string;
      imageUrl: string;
      metadataUrl: string;
    };
  };
}

// Create needed variables at the top of the file
let wsConnected = false;
const pendingActivities: ActivityData[] = [];

/**
 * Syncs NFT activity data with Nija Wallet
 * Uses multiple methods to ensure the data is received:
 * 1. WebSocket - for real-time updates across tabs/windows (if available)
 * 2. LocalStorage - both apps can access the same localStorage
 * 3. Custom Events - if both apps are running in the same browser
 * 
 * @param activity The activity data to sync
 */
export function syncActivityToNijaWallet(activity: ActivityData): void {
  console.log(`🔄 Syncing activity to Nija Wallet: ${activity.type} - ${activity.hash}`);
  
  // Method 1: Try WebSocket first (most reliable)
  if (ws && ws.readyState === 1) { // 1 = OPEN
    try {
      console.log('📤 Sending activity via WebSocket');
      ws.send(JSON.stringify({
        type: 'activity-sync',
        data: activity,
        timestamp: Date.now()
      }));
      console.log('✅ Activity sent via WebSocket');
      
      // Also store in localStorage as backup
      try {
        localStorage.setItem(`nftgen_tx_${activity.hash}`, JSON.stringify(activity));
        localStorage.setItem('nftgen_latest_activity', JSON.stringify(activity));
        console.log('💾 Activity saved to localStorage as backup');
      } catch (e) {
        console.error('❌ Failed to save activity to localStorage:', e);
      }
      
      return; // Successfully sent via WebSocket, no need for fallbacks
    } catch (error) {
      console.error('❌ Failed to send activity via WebSocket:', error);
      // Continue to fallback methods
    }
  } else {
    console.log('⚠️ WebSocket not connected, using fallback methods');
    
    // Add to pending activities to send when WebSocket connects
    pendingActivities.push(activity);
    console.log('📋 Added to pending activities queue');
    
    // Try to establish WebSocket connection
    if (!ws || ws.readyState === 3) { // 3 = CLOSED
      console.log('🔄 Attempting to reconnect WebSocket');
      createWebSocketConnection();
    }
  }
  
  // Method 2: Store in localStorage for cross-tab access
  try {
    // Use a specific key format that Nija Wallet looks for
    localStorage.setItem(`nftgen_tx_${activity.hash}`, JSON.stringify(activity));
    localStorage.setItem('nftgen_latest_activity', JSON.stringify(activity));
    
    // Additional keys for backward compatibility
    localStorage.setItem(`nija_transaction_${activity.hash.toLowerCase()}`, JSON.stringify(activity));
    localStorage.setItem('nija_nftgen_latest_activity', JSON.stringify({
      activity,
      timestamp: Date.now()
    }));
    localStorage.setItem('nija_nftgen_activity_sync_time', Date.now().toString());
    
    console.log('💾 Activity saved to localStorage for Nija Wallet');
  } catch (error) {
    console.error('❌ Failed to save activity to localStorage:', error);
  }
  
  // Method 3: Dispatch custom events
  try {
    // Main activity sync event
    const syncEvent = new CustomEvent('nftgen-activity-sync', { 
      detail: activity 
    });
    window.dispatchEvent(syncEvent);
    
    // Legacy event name for backward compatibility
    const legacyEvent = new CustomEvent('nija-nftgen-activity', {
      detail: {
        activity,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(legacyEvent);
    
    console.log('📢 Activity events dispatched for Nija Wallet');
  } catch (error) {
    console.error('❌ Failed to dispatch activity events:', error);
  }
}

/**
 * Updates the status of an existing activity
 * 
 * @param hash Transaction hash
 * @param status New status (confirmed, failed)
 */
export function updateActivityStatus(hash: `0x${string}`, status: ActivityStatus): void {
  try {
    // Get existing activity
    const activityJson = localStorage.getItem(`nftgen_tx_${hash}`);
    if (!activityJson) {
      console.error(`Activity not found for hash: ${hash}`);
      return;
    }
    
    const activity = JSON.parse(activityJson) as ActivityData;
    
    // Update status
    const updatedActivity: ActivityData = {
      ...activity,
      status,
      details: {
        ...activity.details,
        status,
        confirmationTime: status === 'confirmed' ? Date.now() : undefined
      }
    };
    
    // Sync the updated activity
    syncActivityToNijaWallet(updatedActivity);
    console.log(`Activity status updated to ${status} for ${hash}`);
  } catch (error) {
    console.error(`Failed to update activity status for ${hash}:`, error);
  }
}

/**
 * Checks if Nija Wallet is connected for activity syncing
 */
export function isNijaWalletConnected(): boolean {
  try {
    // Check for multiple indicators
    const hasWalletAddress = !!localStorage.getItem('walletAddress');
    const hasConnection = !!localStorage.getItem('nija_connected_wallet');
    const hasEthereumProvider = !!(window as any).ethereum?.isNijaWallet;
    
    return hasWalletAddress || hasConnection || hasEthereumProvider;
  } catch (error) {
    console.error('Error checking Nija Wallet connection:', error);
    return false;
  }
}

// Configuration for WebSocket connection
const WS_RETRY_DELAY = 2000;
const WS_MAX_RETRIES = 5;
const WS_HEARTBEAT_INTERVAL = 30000;

// WebSocket connection state
let ws: WebSocket | null = null;
let wsRetryCount = 0;
let wsHeartbeatInterval: NodeJS.Timeout | null = null;
let wsEnabled = true;

// Check if WebSockets are disabled by environment variable
if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_DISABLE_WEBSOCKET === 'true') {
  wsEnabled = false;
  console.log('WebSocket connections are disabled by configuration');
}

// Function to handle fallback when WebSocket is not available
function fallbackToCustomEvent() {
  console.log('Using CustomEvent for activity sync');
  
  try {
    // Check if we're in the same origin as Nija Wallet
    // This only works in development when both apps are running on the same origin
    if (window.location.origin === document.location.origin) {
      // Use CustomEvent for same-origin communication
      const event = new CustomEvent('nftgen-activity-sync', {
        detail: {
          timestamp: Date.now()
        }
      });
      
      window.dispatchEvent(event);
      console.log('Activity synced via CustomEvent');
      return;
    }
  } catch (e) {
    console.warn('Error dispatching CustomEvent:', e);
  }
  
  // If everything else fails, use localStorage as a last resort
  try {
    // This is a fallback when the Nija Wallet is running as an extension
    // or in a different window - less reliable, but better than nothing
    const syncData = {
      timestamp: Date.now()
    };
    
    localStorage.setItem('nija_nftgen_last_activity', JSON.stringify(syncData));
    localStorage.setItem('nija_nftgen_activity_sync_time', Date.now().toString());
    
    console.log('Activity synced via localStorage fallback');
  } catch (e) {
    console.error('Failed to sync activity via localStorage:', e);
  }
}

// Get the WebSocket URL based on the environment
const getWalletWebSocketUrl = (): string => {
  // If running in a local development environment
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Updated port to match the Nija Wallet WebSocket server port
    return `ws://${window.location.hostname}:3001/ws`;
  }
  
  // If running on the specific IP
  if (window.location.hostname === '13.126.230.108' || /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)) {
    return `ws://${window.location.hostname}:3001/ws`;
  }
  
  // Default fallback for Chrome extension or production environment
  return 'ws://13.126.230.108:3001/ws';
};

// Enhanced WebSocket connection with better error handling
export function createWebSocketConnection(): void {
  console.log('🔌 Initializing WebSocket connection to Nija Wallet...');
  
  // Disable WebSockets if specified in environment
  if (process.env.REACT_APP_DISABLE_WEBSOCKET === 'true') {
    console.log('❌ WebSocket connections are disabled by configuration');
    return;
  }

  // Close any existing connection
  if (ws) {
    try {
      console.log('🔄 Closing existing WebSocket connection');
      ws.close();
    } catch (e) {
      console.warn('⚠️ Error closing existing WebSocket:', e);
    }
    ws = null;
  }
  
  // Clear any existing heartbeat interval
  if (wsHeartbeatInterval) {
    console.log('🔄 Clearing existing heartbeat interval');
    clearInterval(wsHeartbeatInterval);
    wsHeartbeatInterval = null;
  }
  
  try {
    const url = getWalletWebSocketUrl();
    console.log(`🔌 Attempting to connect to WebSocket at ${url}`);
    
    // Add a timeout to handle connection issues
    let connectionTimeout = setTimeout(() => {
      console.warn('⏱️ WebSocket connection attempt timed out');
      if (ws && ws.readyState !== 1) { // 1 = OPEN state
        try {
          ws.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
        ws = null;
        
        // Try to reconnect after a delay
        setTimeout(createWebSocketConnection, 5000);
      }
    }, 10000);
    
    // Create new WebSocket connection
    ws = new WebSocket(url);
    
    // Connection opened
    ws.onopen = () => {
      console.log('✅ Connected to Nija Wallet WebSocket server');
      clearTimeout(connectionTimeout);
      
      // Send a heartbeat message to verify connection
      sendHeartbeat();
      
      // Set up heartbeat interval to keep connection alive
      wsHeartbeatInterval = setInterval(sendHeartbeat, 30000);
      
      // Update connection status
      wsConnected = true;
      
      // Handle any pending activities that weren't sent
      processPendingActivities();
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        console.log('📩 Received WebSocket message:', message);
        
        if (message.type === 'heartbeat-response') {
          // Handle heartbeat response if needed
          console.log('💓 Received heartbeat response');
          return;
        }
        
        // Handle different message types here
        if (message.type === 'activity-update') {
          console.log('🔄 Received activity update:', message.data);
          
          // Update local activities
          const activity = message.data as ActivityData;
          const activities = getActivities();
          
          // Check if this activity already exists (by hash)
          const existingIndex = activities.findIndex(a => a.hash === activity.hash);
          
          if (existingIndex >= 0) {
            // Update existing activity
            console.log('🔄 Updating existing activity');
            activities[existingIndex] = activity;
          } else {
            // Add new activity
            console.log('➕ Adding new activity');
            activities.push(activity);
          }
          
          // Save updated activities
          localStorage.setItem('nija_nftgen_activities', JSON.stringify(activities));
          
          // Dispatch event for UI to update
          console.log('🔔 Dispatching activity update event');
          window.dispatchEvent(new CustomEvent('nftgen-activity-update', { detail: activity }));
        } else if (message.type === 'welcome') {
          console.log('👋 Received welcome message from WebSocket server');
        } else {
          console.log('❓ Received unknown message type:', message.type);
        }
      } catch (e) {
        console.error('❌ Error processing WebSocket message:', e);
      }
    };
    
    ws.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log(`🔌 WebSocket connection closed: ${event.code} - ${event.reason}`);
      
      // Clean up
      if (wsHeartbeatInterval) {
        clearInterval(wsHeartbeatInterval);
        wsHeartbeatInterval = null;
      }
      
      // Update connection status
      wsConnected = false;
      
      // Try to reconnect with exponential backoff
      if (wsRetryCount < WS_MAX_RETRIES) {
        const delay = WS_RETRY_DELAY * Math.pow(2, wsRetryCount);
        wsRetryCount++;
        
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${wsRetryCount}/${WS_MAX_RETRIES})`);
        
        setTimeout(() => {
          createWebSocketConnection();
        }, delay);
      } else {
        console.log('⚠️ Max WebSocket reconnection attempts reached, falling back to alternative communication methods');
        ws = null;
      }
    };
  } catch (e) {
    console.error('❌ Error creating WebSocket connection:', e);
  }
}

// Initialize the WebSocket connection when the module is loaded
createWebSocketConnection();

// Reset the WebSocket connection status and retry counter
export function resetWebSocketStatus(): void {
  wsRetryCount = 0;
  
  if (wsHeartbeatInterval) {
    clearInterval(wsHeartbeatInterval);
    wsHeartbeatInterval = null;
  }
  
  if (ws) {
    try {
      ws.close();
    } catch (e) {
      console.warn('Error closing WebSocket during reset:', e);
    }
    ws = null;
  }
  
  // Try to re-establish the connection
  createWebSocketConnection();
}

// Synchronize activity to Nija Wallet
// Renamed to prevent conflicts with the enhanced version above
function _legacySyncActivityToNijaWallet(activity: ActivityData): void {
  console.log('Syncing activity to Nija Wallet (legacy):', activity);
  
  // First save to local storage
  const activities = getActivities();
  
  // Check if this activity already exists (by hash)
  const existingIndex = activities.findIndex(a => a.hash === activity.hash);
  
  if (existingIndex >= 0) {
    // Update existing activity
    activities[existingIndex] = activity;
  } else {
    // Add new activity
    activities.push(activity);
  }
  
  // Save updated activities
  localStorage.setItem('nija_nftgen_activities', JSON.stringify(activities));
  
  // Then try to send over WebSocket if available
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: 'activity-sync',
        data: activity,
        timestamp: Date.now()
      }));
      console.log('Activity sent via WebSocket');
      return;
    } catch (e) {
      console.error('Error sending activity via WebSocket:', e);
    }
  }
  
  // If WebSocket failed or not available, try CustomEvent
  const fallbackData = {
    activity,
    timestamp: Date.now()
  };
  
  try {
    // Check if we're in the same origin as Nija Wallet
    // This only works in development when both apps are running on the same origin
    if (window.location.origin === document.location.origin) {
      // Use CustomEvent for same-origin communication
      const event = new CustomEvent('nftgen-activity-sync', {
        detail: fallbackData
      });
      
      window.dispatchEvent(event);
      console.log('Activity synced via CustomEvent');
      return;
    }
  } catch (e) {
    console.warn('Error dispatching CustomEvent:', e);
  }
  
  // If everything else fails, use localStorage as a last resort
  try {
    // This is a fallback when the Nija Wallet is running as an extension
    // or in a different window - less reliable, but better than nothing
    localStorage.setItem('nija_nftgen_last_activity', JSON.stringify(fallbackData));
    localStorage.setItem('nija_nftgen_activity_sync_time', Date.now().toString());
    
    console.log('Activity synced via localStorage fallback');
  } catch (e) {
    console.error('Failed to sync activity via localStorage:', e);
  }
}

// Get activities from localStorage
export function getActivities(): ActivityData[] {
  try {
    const activities = localStorage.getItem('nija_nftgen_activities');
    return activities ? JSON.parse(activities) : [];
  } catch (e) {
    console.error('Error retrieving activities from localStorage:', e);
    return [];
  }
}

// Clear all activities
export function clearActivities(): void {
  try {
    localStorage.removeItem('nija_nftgen_activities');
    console.log('Activities cleared');
  } catch (e) {
    console.error('Error clearing activities:', e);
  }
}

// Add the missing functions
function sendHeartbeat() {
  if (ws && ws.readyState === 1) { // 1 = OPEN state
    try {
      ws.send(JSON.stringify({ 
        type: 'heartbeat', 
        timestamp: Date.now() 
      }));
    } catch (e) {
      console.warn('Error sending heartbeat:', e);
    }
  }
}

function processPendingActivities() {
  if (pendingActivities.length > 0 && wsConnected && ws && ws.readyState === 1) {
    console.log(`Processing ${pendingActivities.length} pending activities`);
    
    while (pendingActivities.length > 0) {
      const activity = pendingActivities.shift();
      if (activity) {
        try {
          ws.send(JSON.stringify({
            type: 'activity-sync',
            data: activity,
            timestamp: Date.now()
          }));
          console.log('Sent pending activity:', activity.hash);
        } catch (e) {
          console.error('Error sending pending activity:', e);
          // Put it back in the queue to try again later
          pendingActivities.unshift(activity);
          break;
        }
      }
    }
  }
}

import { toast } from 'react-toastify';
import { WebSocketMessage, Activity } from '../types';

export function reconnectWebSocket(url: string, maxRetries = 5, delay = 2000): WebSocket {
  let ws: WebSocket;
  let retryCount = 0;
  
  function connect(): WebSocket {
    const socket = new WebSocket(url);
    
    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      retryCount = 0;
    };
    
    socket.onclose = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`WebSocket connection closed. Retrying (${retryCount}/${maxRetries})...`);
        setTimeout(() => {
          ws = connect();
        }, delay * retryCount);
      } else {
        console.error('Max retry attempts reached for WebSocket connection');
        toast.error('Connection lost. Please refresh the page.');
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return socket;
  }
  
  ws = connect();
  return ws;
}

export function subscribeToActivities(
  url: string,
  onActivity: (activity: Activity) => void
): () => void {
  const ws = reconnectWebSocket(url);

  ws.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (message.type === 'ACTIVITY') {
        onActivity(message.data as Activity);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  return () => {
    ws.close();
  };
}

export function convertActivitiesToTransfers(activities: Activity[]): any[] {
  return activities.map(activity => ({
    hash: activity.hash,
    from: activity.from,
    to: activity.to,
    tokenId: activity.tokenId,
    timestamp: activity.timestamp,
    value: activity.value,
  }));
}