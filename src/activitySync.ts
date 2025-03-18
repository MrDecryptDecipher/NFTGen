import { API_BASE_URL } from './config';

interface ActivitySyncOptions {
  onTransactionUpdate?: (transaction: any) => void;
  onPortChange?: (port: number) => void;
  onError?: (error: Error) => void;
  onMetricsUpdate?: (metrics: any) => void;
}

interface WsConfig {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTransactionUpdate?: (txHash: string, status: string) => void;
  onPortChange?: (port: number) => void;
  onMetricsUpdate?: (metrics: ConnectionMetrics) => void;
}

interface ConnectionMetrics {
  latency: number;
  messageCount: number;
  errorCount: number;
  lastHeartbeat: number;
  reconnections: number;
  currentPort: number;
  uptime: number;
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export class ActivitySync {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private portCheckTimeout: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private messageCount = 0;
  private errorCount = 0;
  private lastHeartbeatTime = 0;
  private readonly options: ActivitySyncOptions;
  private readonly reconnectDelay = 1000;
  private isConnected = false;

  private readonly CONNECTION_TIMEOUT = 15000;
  private readonly PORT_CHECK_TIMEOUT = 3000;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly METRICS_INTERVAL = 60000;
  private readonly WS_PORTS = [5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5184];
  private currentPortIndex = 0;
  private readonly WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://3.111.22.56';
  private isSecure = window.location.protocol === 'https:';
  private portAvailabilityCache: Map<number, boolean> = new Map();
  private lastPortCheckTime: Map<number, number> = new Map();
  private readonly PORT_CHECK_CACHE_DURATION = 180000;

  private readonly log = {
    info: (message: string, data?: any) => {
      console.log(`[ActivitySync] ℹ️ ${message}`, data || '');
    },
    warn: (message: string, error?: any) => {
      console.warn(`[ActivitySync] ⚠️ ${message}`, error || '');
    },
    error: (message: string, error?: any) => {
      console.error(`[ActivitySync] ❌ ${message}`, error || '');
      this.errorCount++;
    },
    success: (message: string, data?: any) => {
      console.log(`[ActivitySync] ✅ ${message}`, data || '');
    }
  };

  constructor(options: ActivitySyncOptions) {
    this.options = options;
    this.connect();
  }

  private getCurrentWsUrl(address: string): string {
    const protocol = this.isSecure ? 'wss' : 'ws';
    const port = this.WS_PORTS[this.currentPortIndex];
    const baseUrl = this.WS_BASE_URL.replace(/^(ws|wss):\/\//, '');
    return `${protocol}://${baseUrl}:${port}/ws?address=${address}&v=1.0.0`;
  }

  private async checkPortAvailability(port: number): Promise<boolean> {
    const now = Date.now();
    const lastCheck = this.lastPortCheckTime.get(port);
    
    if (lastCheck && now - lastCheck < this.PORT_CHECK_CACHE_DURATION) {
      this.log.info(`Using cached availability for port ${port}`);
      return this.portAvailabilityCache.get(port) || false;
    }

    try {
      const controller = new AbortController();
      this.portCheckTimeout = setTimeout(() => controller.abort(), this.PORT_CHECK_TIMEOUT);

      const startTime = performance.now();
      const response = await fetch(`${this.WS_BASE_URL.replace('ws', 'http')}:${port}/health`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(this.portCheckTimeout);
      const latency = performance.now() - startTime;
      
      const isAvailable = response.ok;
      this.portAvailabilityCache.set(port, isAvailable);
      this.lastPortCheckTime.set(port, now);
      
      this.log[isAvailable ? 'success' : 'warn'](`Port ${port} availability check: ${isAvailable} (${latency.toFixed(2)}ms)`);
      return isAvailable;
    } catch (error) {
      this.log.error(`Port ${port} check failed`, error);
      this.portAvailabilityCache.set(port, false);
      this.lastPortCheckTime.set(port, now);
      return false;
    }
  }

  private async findAvailablePort(): Promise<number | null> {
    const checkResults = await Promise.all(
      this.WS_PORTS.map(async port => ({
        port,
        available: await this.checkPortAvailability(port)
      }))
    );

    const availablePort = checkResults.find(result => result.available)?.port;
    if (availablePort) {
      this.currentPortIndex = this.WS_PORTS.indexOf(availablePort);
      return availablePort;
    }
    return null;
  }

  private updateMetrics() {
    const metrics: ConnectionMetrics = {
      latency: this.ws ? performance.now() - this.connectionStartTime : 0,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      lastHeartbeat: this.lastHeartbeatTime,
      reconnections: this.reconnectAttempts,
      currentPort: this.WS_PORTS[this.currentPortIndex],
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      status: this.getConnectionStatus()
    };

    this.options.onMetricsUpdate?.(metrics);
  }

  private getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.ws) return 'disconnected';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'reconnecting';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }

  private startMetricsTracking() {
    this.stopMetricsTracking();
    this.metricsInterval = setInterval(() => this.updateMetrics(), this.METRICS_INTERVAL);
  }

  private stopMetricsTracking() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  public async connect() {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.log.info('WebSocket connection already open');
        return;
      }

      this.clearTimeouts();
      this.log.info('Initializing WebSocket connection...');
      
      const walletInfo = localStorage.getItem('nija_wallet_connection');
      if (!walletInfo) {
        throw new Error('No wallet connection found');
      }

      const { address } = JSON.parse(walletInfo);
      
      const availablePort = await this.findAvailablePort();
      if (!availablePort) {
        throw new Error('No available ports found');
      }

      if (this.options.onPortChange) {
        this.options.onPortChange(availablePort);
      }
      
      this.connectionTimeout = setTimeout(() => {
        this.log.error(`Connection timeout on port ${availablePort}`);
        this.ws?.close();
        if (this.options.onError) {
          this.options.onError(new Error(`Connection timeout on port ${availablePort}`));
        }
      }, this.CONNECTION_TIMEOUT);

      const wsUrl = this.getCurrentWsUrl(address);
      this.log.info(`Connecting to ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      this.connectionStartTime = Date.now();

      this.ws.onopen = () => {
        this.log.success(`Connected on port ${availablePort}`);
        this.clearTimeouts();
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.startMetricsTracking();
        this.isConnected = true;

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'auth',
            address,
            timestamp: Date.now(),
            version: '1.0.0',
            origin: window.location.origin,
            port: availablePort
          }));
        }
      };

      this.ws.onclose = () => {
        this.log.warn('Connection closed');
        this.clearTimeouts();
        this.stopHeartbeat();
        this.stopMetricsTracking();
        this.isConnected = false;
        this.reconnect();
      };

      this.ws.onerror = (event) => {
        this.log.error('WebSocket error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('WebSocket connection error'));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageCount++;
          this.log.info(`Received message: ${data.type}`);
          
          switch (data.type) {
            case 'heartbeat-response':
              this.lastHeartbeatTime = Date.now();
              localStorage.setItem('nija_wallet_heartbeat', this.lastHeartbeatTime.toString());
              break;
            case 'auth-success':
              this.log.success('Authentication successful');
              break;
            case 'auth-error':
              this.log.error('Authentication failed:', data.error);
              if (this.options.onError) {
                this.options.onError(new Error(data.error));
              }
              this.disconnect();
              break;
            case 'transaction':
              if (this.options.onTransactionUpdate) {
                this.options.onTransactionUpdate(data.transaction);
              }
              break;
            case 'port':
              if (data.port && this.options.onPortChange) {
                this.options.onPortChange(data.port);
              }
              break;
          }
          
          this.updateMetrics();
        } catch (error) {
          this.log.error('Failed to parse message:', error);
          if (this.options.onError) {
            this.options.onError(new Error('Invalid message format'));
          }
        }
      };
    } catch (error) {
      this.log.error('Failed to initialize WebSocket:', error);
      this.clearTimeouts();
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error('Connection failed'));
      }
      this.reconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ 
          type: 'heartbeat',
          timestamp: Date.now(),
          port: this.WS_PORTS[this.currentPortIndex]
        }));
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearTimeouts() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.portCheckTimeout) {
      clearTimeout(this.portCheckTimeout);
      this.portCheckTimeout = null;
    }
  }

  private async reconnect(immediate = false) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log.error('Max reconnection attempts reached');
      this.options.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    
    if (this.reconnectAttempts % 2 === 0) {
      this.portAvailabilityCache.clear();
      this.lastPortCheckTime.clear();
    }

    const delay = immediate ? 0 : Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.log.info(`Reconnecting in ${delay/1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  public disconnect() {
    this.log.info('Disconnecting...');
    this.clearTimeouts();
    this.stopHeartbeat();
    this.stopMetricsTracking();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
  }
} 