import { toast } from 'react-toastify';
import { TransactionParams } from '../types/wallet';
import axios from 'axios';
import { NWALLET_API_URL, NWALLET_WS_URL, NFTGEN_ORIGIN } from '../config/constants';

// WebSocket connection state
let ws: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;

/**
 * Service for interacting with the Nwallet
 */
export class NwalletService {
  private sessionId: string | null = null;

  constructor() {
    // Try to get session from localStorage on initialization
    this.sessionId = localStorage.getItem('nija_session');
    
    // Initialize websocket connection for real-time updates
    this.initWebsocket();
  }

  /**
   * Initialize WebSocket connection to Nwallet
   */
  private initWebsocket() {
    try {
      console.log('🔌 Initializing WebSocket connection to Nija Wallet...');
      console.log('WebSocket URL:', NWALLET_WS_URL);

      const sessionStr = localStorage.getItem('nija_wallet_session');
      if (!sessionStr) {
        console.log('No session found in localStorage');
        return;
      }

      const session = JSON.parse(sessionStr);
      if (!session || !session.sessionId || !session.address) {
        console.log('Invalid session data');
        return;
      }

      const wsUrl = `${NWALLET_WS_URL}/ws?sessionId=${session.sessionId}&address=${session.address}&app=NFTGen&v=1.0.0&origin=${encodeURIComponent(NFTGEN_ORIGIN)}`;
      console.log('🔌 Attempting to connect to WebSocket at', wsUrl);

      // Prevent multiple simultaneous connection attempts
      if (isConnecting) {
        console.log('Already attempting to connect to WebSocket');
        return;
      }

      // If already connected, don't reconnect
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      isConnecting = true;

      try {
        // Create WebSocket connection with proper error handling
        ws = new WebSocket(wsUrl);
        console.log('WebSocket object created');

        // Set up event handlers
        ws.onopen = () => {
          console.log('🔌 WebSocket connection established successfully');
          reconnectAttempts = 0;
          isConnecting = false;

          // Send identification message
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              const identifyMessage = {
                type: 'identify',
                app: 'NFTGen',
                sessionId: session.sessionId,
                address: session.address,
                timestamp: Date.now()
              };
              ws.send(JSON.stringify(identifyMessage));
              console.log('🔌 Identification message sent');
            } catch (identifyError) {
              console.error('🔌 Error sending identification message:', identifyError);
            }
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('🔌 Received WebSocket message:', data);
            
            // Handle specific message types
            if (data.type === 'heartbeat') {
              // Send heartbeat response
              if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                  type: 'heartbeat-response',
              timestamp: Date.now()
            }));
              }
            }
          } catch (error) {
            console.error('🔌 Error processing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error);
          isConnecting = false;
        };

        ws.onclose = (event) => {
          console.log(`🔌 WebSocket connection closed: ${event.code} ${event.reason}`);
          isConnecting = false;

          // Attempt to reconnect if not at max attempts
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`🔌 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            // Exponential backoff for reconnect attempts
            setTimeout(() => {
              this.initWebsocket();
            }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1));
          } else {
            console.warn('🔌 Max reconnect attempts reached. Please check the WebSocket server.');
          }
        };
        } catch (error) {
        console.error('🔌 Error creating WebSocket connection:', error);
        isConnecting = false;
      }
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Handle transaction updates from WebSocket
   */
  private handleTransactionUpdate(transaction: any) {
    // Display transaction notification
    toast.info(`Transaction ${transaction.hash.substring(0, 6)}... ${transaction.status}`);
    
    // Dispatch custom event that can be listened to by components
    window.dispatchEvent(new CustomEvent('nwallet-transaction-update', { 
      detail: transaction
    }));
  }

  /**
   * Connect to Nwallet
   */
  async connect(): Promise<string | null> {
    try {
      // First check if already connected
      if (this.sessionId) {
        console.log("Found existing session, verifying...");
        const isValid = await this.verifySession();
        if (isValid) {
          console.log("Existing session is valid");
          return this.getAddress();
        } else {
          console.log("Existing session is invalid, creating new session");
          localStorage.removeItem('nija_session');
          this.sessionId = null;
        }
      }
      
      console.log("Requesting new wallet connection");
      
      // Try the normal endpoint first
      let response;
      try {
        response = await fetch(`${NWALLET_API_URL}/wallet/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://3.111.22.56:7104'
          },
          body: JSON.stringify({
            origin: 'http://3.111.22.56:7104',
            dappName: 'NFTGen'
          })
        });
      } catch (fetchError) {
        console.error("Error connecting to primary endpoint:", fetchError);
        
        // Try the legacy endpoint if the first one fails
        response = await fetch(`${NWALLET_API_URL}/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            origin: NFTGEN_ORIGIN,
            dappName: 'NFTGen'
          })
        });
      }
      
      if (!response.ok) {
        console.error(`Connection failed with status: ${response.status}`);
        throw new Error(`Failed to connect to wallet (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to connect to wallet');
      }
      
      console.log("Successfully connected to wallet:", data);
      
      // Store session
      this.sessionId = data.sessionId;
      localStorage.setItem('nija_session', data.sessionId);
      
      // Return address
      return data.address || null;
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to connect to wallet. Please try again.');
      return null;
    }
  }

  /**
   * Verify if current session is valid
   */
  async verifySession(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        console.log("No session ID found");
        return false;
      }
      
      const response = await fetch(`${NWALLET_API_URL}/session/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId
        })
      });
      
      if (!response.ok) {
        console.log(`Session verification failed with status: ${response.status}`);
        if (response.status === 404) {
          // Try the legacy endpoint
          const legacyResponse = await fetch(`${NWALLET_API_URL}/wallet/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId: this.sessionId
            })
          });
          
          if (!legacyResponse.ok) {
            console.log("Legacy session verification also failed");
            return false;
          }
          
          const legacyData = await legacyResponse.json();
          return legacyData.valid === true;
        }
        return false;
      }
      
      const data = await response.json();
      const isValid = data.valid === true;
      console.log(`Session verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error('Verify session error:', error);
      return false;
    }
  }

  /**
   * Get currently connected wallet address
   */
  async getAddress(): Promise<string | null> {
    try {
      if (!this.sessionId) {
        return null;
      }
      
      const response = await fetch(`${NWALLET_API_URL}/wallet/address`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get address');
      }
      
      const data = await response.json();
      return data.address || null;
    } catch (error) {
      console.error('Get address error:', error);
      return null;
    }
  }

  /**
   * Send a transaction through Nwallet
   */
  async sendTransaction(transaction: TransactionParams): Promise<string | null> {
    try {
      if (!this.sessionId) {
        throw new Error('Not connected to wallet');
      }
      
      const response = await fetch(`${NWALLET_API_URL}/wallet/send-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionId}`
        },
        body: JSON.stringify({
          transaction,
          sessionId: this.sessionId,
          nonce: this.generateNonce()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transaction failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Transaction failed');
      }
      
      return data.hash || null;
    } catch (error) {
      console.error('Send transaction error:', error);
      toast.error('Transaction failed. Please try again.');
      throw error;
    }
  }

  /**
   * Disconnect from Nwallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.sessionId) {
        await fetch(`${NWALLET_API_URL}/wallet/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: this.sessionId
          })
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      // Clear session regardless of API success
      this.sessionId = null;
      localStorage.removeItem('nija_session');
      localStorage.removeItem('nija_eth_address');
      localStorage.removeItem('nija_chain_id');
    }
  }

  /**
   * Generate a random nonce for request authentication
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const nwalletService = new NwalletService(); 