import { toast } from 'react-toastify';

// Use environment variables for configuration
const WS_HOST = process.env.REACT_APP_WS_HOST || window.location.hostname;
const WS_PORT = process.env.REACT_APP_WS_PORT || '5176';
const API_HOST = process.env.REACT_APP_API_HOST || window.location.hostname;
const API_PORT = process.env.REACT_APP_API_PORT || '3456';

const NWALLET_WS_URL = process.env.REACT_APP_WS_USE_SECURE === 'true'
  ? `wss://${WS_HOST}:${WS_PORT}/ws`
  : `ws://${WS_HOST}:${WS_PORT}/ws`;

const NWALLET_API_URL = `http://${API_HOST}:${API_PORT}`;
const RECONNECT_INTERVAL = parseInt(process.env.REACT_APP_WS_RECONNECT_INTERVAL || '5000', 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.REACT_APP_WS_HEARTBEAT_INTERVAL || '30000', 10);
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.REACT_APP_WS_MAX_RECONNECT_ATTEMPTS || '5', 10);

interface Activity {
  hash: string;
  createdAt: number;
  updatedAt?: number;
  verified?: boolean;
  verifiedAt?: number;
  type: 'mint' | 'transfer';
  data: any;
}

class NwalletService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  private activityListeners: ((activity: Activity) => void)[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    if (process.env.REACT_APP_DISABLE_WEBSOCKET !== 'true') {
      this.setupWebSocket();
      this.setupConnectionCheck();
    }
  }

  private setupConnectionCheck() {
    // Clear existing interval if any
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    // Check connection status every minute
    this.connectionCheckInterval = setInterval(() => {
      if (!this.isConnected() && !this.isReconnecting) {
        console.log('Connection check failed, attempting reconnect...');
        this.setupWebSocket();
      }
    }, 60000);
  }

  private clearIntervals() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  private async setupWebSocket() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    try {
      // Check if the service is available before attempting WebSocket connection
      const healthCheck = await fetch(`http://${WS_HOST}:${API_PORT}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).catch(() => null);

      if (!healthCheck?.ok) {
        throw new Error('Service not available');
      }

      // Clear any existing connection
      if (this.ws) {
        try {
          this.ws.close();
        } catch (error) {
          console.warn('Error closing existing WebSocket:', error);
        }
        this.ws = null;
      }

      this.clearIntervals();
      
      // Create WebSocket with error handling
      this.ws = new WebSocket(NWALLET_WS_URL);
      
      if (!this.ws) {
        throw new Error('Failed to create WebSocket connection');
      }

      // Set up event handlers with proper error handling
      const ws = this.ws;
      
      ws.onopen = () => {
        console.log('Connected to Nwallet WebSocket');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;

        // Setup heartbeat only after successful connection
        this.heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'heartbeat' }));
            } catch (error) {
              console.error('Error sending heartbeat:', error);
              this.handleDisconnect('Heartbeat failed');
            }
          }
        }, HEARTBEAT_INTERVAL);

        // Send initial connection message
        try {
          ws.send(JSON.stringify({ 
            type: 'connect',
            data: {
              origin: window.location.origin,
              timestamp: Date.now()
            }
          }));
          toast.success('Connected to Nija Wallet');
        } catch (error) {
          console.error('Error sending initial connection message:', error);
          this.handleDisconnect('Failed to send initial message');
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.handleDisconnect(`Connection closed: ${event.code}`);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't call handleDisconnect here as onclose will be called
      };
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      this.handleDisconnect(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private handleDisconnect(reason: string = 'Unknown reason') {
    console.log(`Disconnected from Nwallet WebSocket: ${reason}`);
    this.clearIntervals();
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.isReconnecting = false;
      const delay = RECONNECT_INTERVAL * Math.min(this.reconnectAttempts, 5);
      console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.setupWebSocket();
      }, delay);
    } else {
      this.isReconnecting = false;
      toast.error(`Failed to connect to Nija Wallet: ${reason}`);
    }
  }

  private notifyActivityListeners(activity: Activity) {
    this.activityListeners.forEach(listener => {
      try {
        listener(activity);
      } catch (error) {
        console.error('Error in activity listener:', error);
      }
    });
  }

  public addActivityListener(listener: (activity: Activity) => void) {
    this.activityListeners.push(listener);
    return () => this.removeActivityListener(listener);
  }

  public removeActivityListener(listener: (activity: Activity) => void) {
    this.activityListeners = this.activityListeners.filter(l => l !== listener);
  }

  public async getAllActivities(): Promise<Activity[]> {
    try {
      const response = await fetch('/api/activities', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  public async getActivity(hash: string): Promise<Activity> {
    try {
      const response = await fetch(`/api/activities/${hash}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Activity not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching activity:', error);
      throw error;
    }
  }

  public async verifyTransaction(hash: string): Promise<boolean> {
    try {
      const response = await fetch(`${NWALLET_API_URL}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify transaction');
      }
      
      const result = await response.json();
      return result.status === 'verified';
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw error;
    }
  }

  public async syncActivity(activity: Omit<Activity, 'createdAt'>) {
    try {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }
      
      const activityData = {
        ...activity,
        createdAt: Date.now()
      };
      
      this.ws.send(JSON.stringify({
        type: 'activity-sync',
        data: activityData
      }));
      
      return true;
    } catch (error) {
      console.error('Error syncing activity:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    this.clearIntervals();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }
}

// Export singleton instance
export const nwalletService = new NwalletService(); 