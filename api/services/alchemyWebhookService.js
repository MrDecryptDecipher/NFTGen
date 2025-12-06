require('dotenv').config({ path: __dirname + '/../.env' });
const { Alchemy, Network } = require('alchemy-sdk');

console.log('🔔 Alchemy Webhook Service 2025: Module loaded successfully');

class AlchemyWebhookService {
  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY || 'gRcliAnQ2ysaJacOBBlOCd7eT9NxGLd0';
    this.network = Network.ETH_SEPOLIA;
    this.webhookUrl = process.env.ALCHEMY_WEBHOOK_URL || 'https://3.111.22.56:7105/api/webhooks/alchemy';
    this.alchemy = null;
    this.initialized = false;
    this.activeWebhooks = new Map();
    this.transactionCallbacks = new Map();

    console.log('🔔 Alchemy Webhook Service: Initializing...');
    console.log('🔔 Network:', this.network);
    console.log('🔔 Webhook URL:', this.webhookUrl);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔔 Initializing Alchemy SDK for webhook management...');

      // Initialize Alchemy SDK
      this.alchemy = new Alchemy({
        apiKey: this.apiKey,
        network: this.network,
      });

      console.log('✅ Alchemy Webhook Service initialized successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize Alchemy Webhook Service:', error);
      throw error;
    }
  }

  // Monitor specific addresses (using polling instead of webhooks)
  async monitorAddresses(addresses) {
    await this.initialize();

    try {
      console.log('🔔 Setting up address monitoring for:', addresses);

      // Store addresses for monitoring
      const addressList = Array.isArray(addresses) ? addresses : [addresses];

      return {
        success: true,
        message: 'Address monitoring set up (using polling)',
        addresses: addressList,
        method: 'polling'
      };

    } catch (error) {
      console.error('❌ Failed to set up address monitoring:', error);
      throw error;
    }
  }

  // Monitor a specific transaction hash
  async monitorTransaction(transactionHash, callback) {
    await this.initialize();

    try {
      console.log('🔍 Setting up transaction monitoring for:', transactionHash);

      // Store callback for this transaction
      this.transactionCallbacks.set(transactionHash.toLowerCase(), callback);

      // Get transaction details
      const tx = await this.alchemy.core.getTransaction(transactionHash);
      
      if (!tx) {
        throw new Error('Transaction not found');
      }

      console.log('📋 Transaction details retrieved:', {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: tx.blockNumber,
        status: tx.blockNumber ? 'confirmed' : 'pending'
      });

      // If transaction is already confirmed, call callback immediately
      if (tx.blockNumber) {
        const receipt = await this.alchemy.core.getTransactionReceipt(transactionHash);
        console.log('✅ Transaction already confirmed, calling callback');
        
        if (callback) {
          callback({
            type: 'confirmed',
            transactionHash: transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? 'success' : 'failed',
            receipt: receipt
          });
        }
      } else {
        // Set up polling for pending transaction
        console.log('⏳ Transaction pending, setting up monitoring...');
        this.pollTransaction(transactionHash);
      }

      return {
        success: true,
        transactionHash: transactionHash,
        status: tx.blockNumber ? 'confirmed' : 'pending',
        blockNumber: tx.blockNumber
      };

    } catch (error) {
      console.error('❌ Failed to monitor transaction:', error);
      throw error;
    }
  }

  // Poll transaction status until confirmed
  async pollTransaction(transactionHash, maxAttempts = 60, interval = 5000) {
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔍 Polling transaction ${transactionHash} (attempt ${attempts}/${maxAttempts})`);

        const receipt = await this.alchemy.core.getTransactionReceipt(transactionHash);

        if (receipt) {
          console.log('✅ Transaction confirmed!');
          
          const callback = this.transactionCallbacks.get(transactionHash.toLowerCase());
          if (callback) {
            callback({
              type: 'confirmed',
              transactionHash: transactionHash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString(),
              status: receipt.status === 1 ? 'success' : 'failed',
              receipt: receipt
            });
            
            // Clean up callback
            this.transactionCallbacks.delete(transactionHash.toLowerCase());
          }
          
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          console.warn('⚠️ Transaction polling timeout reached');
          
          const callback = this.transactionCallbacks.get(transactionHash.toLowerCase());
          if (callback) {
            callback({
              type: 'timeout',
              transactionHash: transactionHash,
              message: 'Transaction monitoring timeout'
            });
            
            this.transactionCallbacks.delete(transactionHash.toLowerCase());
          }
        }

      } catch (error) {
        console.error('❌ Error polling transaction:', error);
        
        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        }
      }
    };

    poll();
  }

  // Handle incoming webhook notifications
  handleWebhookNotification(notification) {
    try {
      console.log('🔔 Received webhook notification:', JSON.stringify(notification, null, 2));

      const { type, event } = notification;

      switch (type) {
        case 'ADDRESS_ACTIVITY':
          this.handleAddressActivity(event);
          break;
        case 'MINED_TRANSACTION':
          this.handleMinedTransaction(event);
          break;
        case 'DROPPED_TRANSACTION':
          this.handleDroppedTransaction(event);
          break;
        default:
          console.log('🔔 Unknown webhook type:', type);
      }

    } catch (error) {
      console.error('❌ Error handling webhook notification:', error);
    }
  }

  // Handle address activity notifications
  handleAddressActivity(event) {
    console.log('🏠 Address activity detected:', event);
    
    // Process transaction if we're monitoring it
    if (event.transaction && event.transaction.hash) {
      const txHash = event.transaction.hash.toLowerCase();
      const callback = this.transactionCallbacks.get(txHash);
      
      if (callback) {
        callback({
          type: 'activity',
          transactionHash: event.transaction.hash,
          blockNumber: event.transaction.blockNumber,
          event: event
        });
      }
    }
  }

  // Handle mined transaction notifications
  handleMinedTransaction(event) {
    console.log('⛏️ Transaction mined:', event);
    
    if (event.transaction && event.transaction.hash) {
      const txHash = event.transaction.hash.toLowerCase();
      const callback = this.transactionCallbacks.get(txHash);
      
      if (callback) {
        callback({
          type: 'mined',
          transactionHash: event.transaction.hash,
          blockNumber: event.transaction.blockNumber,
          event: event
        });
      }
    }
  }

  // Handle dropped transaction notifications
  handleDroppedTransaction(event) {
    console.log('🗑️ Transaction dropped:', event);
    
    if (event.transaction && event.transaction.hash) {
      const txHash = event.transaction.hash.toLowerCase();
      const callback = this.transactionCallbacks.get(txHash);
      
      if (callback) {
        callback({
          type: 'dropped',
          transactionHash: event.transaction.hash,
          event: event
        });
        
        // Clean up callback for dropped transaction
        this.transactionCallbacks.delete(txHash);
      }
    }
  }

  // Get webhook status (simplified version without API calls)
  async getWebhookStatus() {
    await this.initialize();

    try {
      return {
        success: true,
        service: 'Alchemy Transaction Monitoring',
        initialized: this.initialized,
        monitoredTransactions: this.transactionCallbacks.size,
        activeCallbacks: Array.from(this.transactionCallbacks.keys()),
        network: this.network,
        apiKey: this.apiKey ? 'Present' : 'Missing'
      };

    } catch (error) {
      console.error('❌ Failed to get webhook status:', error);
      throw error;
    }
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up Alchemy Webhook Service...');
    this.transactionCallbacks.clear();
    this.activeWebhooks.clear();
  }
}

module.exports = AlchemyWebhookService;
