/**
 * WebSocket Service for NFTGen
 * 
 * Handles real-time communication with Nwallet for NFT activity updates
 * Sends minting events and receives wallet connection status
 */

export interface NFTMintEvent {
  type: 'nft_minted';
  data: {
    tokenId: string;
    contractAddress: string;
    transactionHash: string;
    imageUrl: string;
    metadataUrl: string;
    metadata: {
      name: string;
      description: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
    timestamp: number;
    network: string;
  };
}

export interface WalletConnectionEvent {
  type: 'wallet_connected' | 'wallet_disconnected';
  data: {
    address: string;
    network: string;
    timestamp: number;
  };
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

interface ConnectionMetrics {
  totalConnections: number;
  totalReconnections: number;
  totalMessages: number;
  averageLatency: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8; // Increased for better resilience
  private baseReconnectDelay = 1000; // Base delay for exponential backoff
  private maxReconnectDelay = 30000; // Maximum delay cap
  private reconnectJitter = 0.1; // Add randomness to prevent thundering herd
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  // Connection state management
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    totalReconnections: 0,
    totalMessages: 0,
    averageLatency: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null
  };

  // Connection pooling and lifecycle management
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private latencyMeasurements: number[] = [];
  private maxLatencyMeasurements = 10;

  // WebSocket server URL (Nwallet's WebSocket port) - environment-based configuration
  private readonly WS_URL = this.getWebSocketUrl();

  /**
   * Get WebSocket URL based on environment configuration
   */
  private getWebSocketUrl(): string {
    // Check for environment-specific WebSocket URL
    const envWsUrl = import.meta.env.VITE_NWALLET_WS_URL;
    if (envWsUrl) {
      console.log('🔗 Using environment WebSocket URL:', envWsUrl);
      return envWsUrl;
    }

    // Production environment detection
    const isProduction = import.meta.env.PROD;
    const isDevelopment = import.meta.env.DEV;

    if (isProduction) {
      // Production URL - use the production server IP
      const productionUrl = 'ws://3.111.22.56:6103/ws';
      console.log('🌐 Using production WebSocket URL:', productionUrl);
      return productionUrl;
    } else if (isDevelopment) {
      // Development URL - check if running in local development
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const localUrl = 'ws://localhost:6103/ws';
        console.log('🏠 Using local development WebSocket URL:', localUrl);
        return localUrl;
      } else {
        // Development on remote server
        const remoteUrl = `ws://${hostname}:6103/ws`;
        console.log('🔗 Using remote development WebSocket URL:', remoteUrl);
        return remoteUrl;
      }
    }

    // Fallback to production URL
    const fallbackUrl = 'ws://3.111.22.56:6103/ws';
    console.log('⚠️ Using fallback WebSocket URL:', fallbackUrl);
    return fallbackUrl;
  }

  /**
   * Initialize WebSocket connection with state management
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.connectionState === ConnectionState.CONNECTED) {
      console.log('🔄 Connection already in progress or established');
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    this.isConnecting = true;

    try {
      console.log('🔌 Connecting to Nwallet WebSocket server...');
      
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to Nwallet');
        this.isConnecting = false;
        this.resetReconnectionAttempts(); // Reset attempts on successful connection
        this.connectionMetrics.totalConnections++;
        this.connectionMetrics.lastConnectedAt = Date.now();

        // Update connection state
        this.setConnectionState(ConnectionState.CONNECTED);

        // Start heartbeat to maintain connection
        this.startHeartbeat();

        // Send any queued messages
        this.flushMessageQueue();

        // Emit connection event
        this.emit('connected', {
          timestamp: Date.now(),
          metrics: this.getConnectionMetrics()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Received message from Nwallet:', message);
          
          // Emit the specific event type
          this.emit(message.type, message.data);
          
          // Emit general message event
          this.emit('message', message);
          
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.connectionMetrics.lastDisconnectedAt = Date.now();

        // Stop heartbeat
        this.stopHeartbeat();

        // Update connection state
        const wasCleanClose = event.code === 1000;
        this.setConnectionState(wasCleanClose ? ConnectionState.DISCONNECTED : ConnectionState.ERROR);

        // Emit disconnection event
        this.emit('disconnected', {
          code: event.code,
          reason: event.reason,
          timestamp: Date.now(),
          wasCleanClose,
          metrics: this.getConnectionMetrics()
        });

        // Attempt to reconnect if not a clean close
        if (!wasCleanClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.connectionMetrics.totalReconnections++;
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
        
        // Emit error event
        this.emit('error', { error, timestamp: Date.now() });
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt with optimized exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;

    // Calculate exponential backoff with jitter
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitterRange = exponentialDelay * this.reconnectJitter;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange; // Random jitter ±10%
    const delay = Math.min(exponentialDelay + jitter, this.maxReconnectDelay);

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms (exponential backoff with jitter)`);

    // Update connection state
    this.setConnectionState(ConnectionState.RECONNECTING);

    // Clean up any existing connection before reconnecting
    this.cleanupConnection();

    // Limit message queue size to prevent memory leaks during extended disconnections
    if (this.messageQueue.length > 100) {
      console.warn('⚠️ Message queue too large, clearing oldest messages');
      this.messageQueue = this.messageQueue.slice(-50); // Keep only last 50 messages
    }

    // Check if we've exceeded maximum attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Maximum reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
      this.setConnectionState(ConnectionState.ERROR);
      this.emit('maxReconnectAttemptsExceeded', {
        attempts: this.reconnectAttempts,
        timestamp: Date.now()
      });
      return;
    }

    setTimeout(() => {
      // Double-check we're still in reconnecting state
      if (this.connectionState === ConnectionState.RECONNECTING) {
        this.connect().catch(error => {
          console.error('❌ Reconnection attempt failed:', error);
          this.setConnectionState(ConnectionState.ERROR);

          // Schedule next attempt if we haven't exceeded max attempts
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });
      }
    }, delay);
  }

  /**
   * Reset reconnection attempts (call when connection is successful)
   */
  private resetReconnectionAttempts(): void {
    if (this.reconnectAttempts > 0) {
      console.log(`✅ Reconnection successful after ${this.reconnectAttempts} attempts`);
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Clean up connection resources without changing state
   */
  private cleanupConnection(): void {
    if (this.ws) {
      // Remove event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;

      // Don't close the connection here as it might already be closed
      this.ws = null;
    }

    // Stop any running timers
    this.stopHeartbeat();
    this.isConnecting = false;
  }

  /**
   * Send message to Nwallet
   */
  sendMessage(type: string, data: any): void {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('📤 Sent message to Nwallet:', message);
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        // Queue the message for later
        this.messageQueue.push(message);
      }
    } else {
      console.log('📦 Queueing message (WebSocket not connected):', message);
      this.messageQueue.push(message);
      
      // Try to connect if not already connecting
      if (!this.isConnecting) {
        this.connect().catch(error => {
          console.error('❌ Failed to connect for message sending:', error);
        });
      }
    }
  }

  /**
   * Send NFT minting event to Nwallet
   */
  sendNFTMintEvent(event: NFTMintEvent): void {
    this.sendMessage('nft_minted', event.data);
  }

  /**
   * Request wallet connection status from Nwallet
   */
  requestWalletStatus(): void {
    this.sendMessage('request_wallet_status', {
      timestamp: Date.now()
    });
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Failed to send queued message:', error);
          // Re-queue the message
          this.messageQueue.push(message);
        }
      }
    });
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener with memory leak prevention
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);

        // Clean up empty listener arrays to prevent memory leaks
        if (listeners.length === 0) {
          this.eventListeners.delete(event);
        }
      }
    }
  }

  /**
   * Remove all event listeners for cleanup
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
      console.log(`🧹 Removed all listeners for event: ${event}`);
    } else {
      const eventCount = this.eventListeners.size;
      this.eventListeners.clear();
      console.log(`🧹 Removed all event listeners (${eventCount} events)`);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }

  /**
   * Disconnect WebSocket with proper cleanup
   */
  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');

    // Stop all timers and intervals
    this.stopHeartbeat();

    // Clear any pending reconnection attempts
    this.reconnectAttempts = this.maxReconnectAttempts;

    // Close WebSocket connection
    if (this.ws) {
      // Remove all event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;

      // Close connection cleanly
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }

      this.ws = null;
    }

    // Update connection state
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.isConnecting = false;

    // Clear message queue to prevent memory leaks
    this.messageQueue = [];

    // Clear latency measurements
    this.latencyMeasurements = [];

    console.log('✅ WebSocket disconnected and cleaned up');
  }

  /**
   * Set connection state and emit state change event
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;

    if (previousState !== state) {
      console.log(`🔄 WebSocket state changed: ${previousState} → ${state}`);
      this.emit('stateChange', {
        previousState,
        currentState: state,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        this.sendMessage('ping', { timestamp: pingTime });

        // Set timeout for pong response
        this.connectionTimeout = setTimeout(() => {
          console.warn('⚠️ WebSocket heartbeat timeout - connection may be stale');
          this.setConnectionState(ConnectionState.ERROR);
        }, 5000);
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Handle pong response for latency measurement
   */
  private handlePong(data: any): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (data.timestamp) {
      const latency = Date.now() - data.timestamp;
      this.latencyMeasurements.push(latency);

      // Keep only recent measurements
      if (this.latencyMeasurements.length > this.maxLatencyMeasurements) {
        this.latencyMeasurements.shift();
      }

      // Update average latency
      this.connectionMetrics.averageLatency =
        this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length;

      console.log(`📊 WebSocket latency: ${latency}ms (avg: ${this.connectionMetrics.averageLatency.toFixed(2)}ms)`);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get queued message count
   */
  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Check if connection is healthy
   */
  isHealthy(): boolean {
    return this.connectionState === ConnectionState.CONNECTED &&
           this.ws !== null &&
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    console.log('🔄 Forcing WebSocket reconnection...');
    this.disconnect();
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Forced reconnection failed:', error);
      });
    }, 1000);
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
