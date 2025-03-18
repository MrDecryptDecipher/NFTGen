import { ActivitySync } from '../activitySync';
import { sendTransaction } from '../walletConnection';
import { ethers } from 'ethers';
import type { NFT } from '../types';
import { API_BASE_URL } from '../config';

// NFT Fractionalization Config (internal type)
interface NFTFractionalizationConfig {
  supply: number;
  pricePerFraction: string;
  minimumPurchase: number;
}

// Extended fallback ports for API endpoints
const API_PORTS = [5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5184];
const PORT_CHECK_TIMEOUT = 3000;
const PORT_CHECK_CACHE_DURATION = 180000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Enhanced logging
const log = {
  info: (message: string, data?: any) => {
    console.log(`[NFTService] ℹ️ ${message}`, data || '');
  },
  warn: (message: string, error?: any) => {
    console.warn(`[NFTService] ⚠️ ${message}`, error || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[NFTService] ❌ ${message}`, error || '');
  },
  success: (message: string, data?: any) => {
    console.log(`[NFTService] ✅ ${message}`, data || '');
  }
};

// Service metrics
interface ServiceMetrics {
  successfulUploads: number;
  failedUploads: number;
  averageUploadTime: number;
  totalTransactions: number;
  confirmedTransactions: number;
  failedTransactions: number;
  currentPort: number | null;
  lastError: string | null;
  uptime: number;
}

interface PortMetrics {
  available: boolean;
  lastCheckTime: number;
  responseTime: number;
  failureCount: number;
  successCount: number;
}

const portMetrics = new Map<number, PortMetrics>();

const checkPortAvailability = async (port: number): Promise<boolean> => {
  const now = Date.now();
  const metrics = portMetrics.get(port) || {
    available: false,
    lastCheckTime: 0,
    responseTime: 0,
    failureCount: 0,
    successCount: 0
  };

  if (now - metrics.lastCheckTime < PORT_CHECK_CACHE_DURATION) {
    log.info(`Using cached availability for port ${port}: ${metrics.available}`);
    return metrics.available;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PORT_CHECK_TIMEOUT);

    const startTime = performance.now();
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.split(':').slice(0, 2).join(':') || 'http://13.126.230.108';
    const response = await fetch(`${baseUrl}:${port}/health`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    clearTimeout(timeoutId);
    const responseTime = performance.now() - startTime;
    
    const isAvailable = response.ok;
    metrics.available = isAvailable;
    metrics.lastCheckTime = now;
    metrics.responseTime = responseTime;
    
    if (isAvailable) {
      metrics.successCount++;
      log.success(`Port ${port} is available (${responseTime.toFixed(2)}ms)`);
    } else {
      metrics.failureCount++;
      log.warn(`Port ${port} health check failed with status ${response.status}`);
    }

    portMetrics.set(port, metrics);
    return isAvailable;
  } catch (error) {
    metrics.failureCount++;
    metrics.available = false;
    metrics.lastCheckTime = now;
    portMetrics.set(port, metrics);
    
    log.warn(`Port ${port} check failed`, error);
    return false;
  }
};

const findAvailablePort = async (): Promise<number | null> => {
  // Sort ports by success rate and response time
  const sortedPorts = API_PORTS.sort((a, b) => {
    const metricsA = portMetrics.get(a);
    const metricsB = portMetrics.get(b);
    
    if (!metricsA && !metricsB) return 0;
    if (!metricsA) return 1;
    if (!metricsB) return -1;

    const successRateA = metricsA.successCount / (metricsA.successCount + metricsA.failureCount) || 0;
    const successRateB = metricsB.successCount / (metricsB.successCount + metricsB.failureCount) || 0;

    if (successRateA !== successRateB) return successRateB - successRateA;
    return metricsA.responseTime - metricsB.responseTime;
  });

  for (const port of sortedPorts) {
    if (await checkPortAvailability(port)) {
      return port;
    }
  }
  return null;
};

const getApiUrl = (port: number): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.split(':').slice(0, 2).join(':') || 'http://13.126.230.108';
  return `${baseUrl}:${port}`;
};

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface TransactionStatus {
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  error?: string;
}

// This is a mock ABI for demonstration. Replace with your actual contract ABI
const NFT_FRACTIONALIZATION_ABI = [
  'function fractionalize(uint256 tokenId, uint256 totalSupply, uint256 pricePerFraction, uint256 minimumPurchase) external',
  'function buyFractions(uint256 tokenId, uint256 amount) external payable',
  'function getFractionDetails(uint256 tokenId) external view returns (uint256 supply, uint256 available, uint256 pricePerFraction, uint256 minimumPurchase)'
];

// Replace with your actual contract address
const NFT_FRACTIONALIZATION_ADDRESS = '0x...';

export class NFTService {
  private static instance: NFTService | null = null;
  private readonly baseUrl: string;
  private activitySync: ActivitySync;
  private transactionStatuses: Map<string, TransactionStatus>;
  private currentPort: number | null = null;
  private readonly requiredConfirmations = 3;
  private startTime: number;
  private metrics: ServiceMetrics;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.JsonRpcSigner | null;
  private contract: ethers.Contract | null;

  private constructor() {
    this.startTime = Date.now();
    this.transactionStatuses = new Map();
    this.metrics = {
      successfulUploads: 0,
      failedUploads: 0,
      averageUploadTime: 0,
      totalTransactions: 0,
      confirmedTransactions: 0,
      failedTransactions: 0,
      currentPort: null,
      lastError: null,
      uptime: 0
    };

    this.activitySync = new ActivitySync({
      onTransactionUpdate: this.handleTransactionUpdate.bind(this),
      onPortChange: this.handlePortChange.bind(this),
      onError: (error) => {
        console.error('WebSocket error:', error);
        this.metrics.lastError = error.message;
      },
    });

    // Start metrics update interval
    setInterval(() => this.updateMetrics(), 60000);

    this.baseUrl = API_BASE_URL;
    this.provider = new ethers.JsonRpcProvider(API_BASE_URL);
    this.signer = null;
    this.contract = null;

    // Initialize signer and contract
    this.initializeWallet();
  }

  private async initializeWallet() {
    try {
      this.signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(
        NFT_FRACTIONALIZATION_ADDRESS,
        NFT_FRACTIONALIZATION_ABI,
        this.signer
      );
    } catch (error) {
      console.error('Error initializing wallet:', error);
    }
  }

  public static async create(): Promise<NFTService> {
    if (!NFTService.instance) {
      NFTService.instance = new NFTService();
      await NFTService.instance.initializeWallet();
    }
    return NFTService.instance;
  }

  private updateMetrics() {
    this.metrics.uptime = Date.now() - this.startTime;
    window.dispatchEvent(new CustomEvent('nft-service-metrics', {
      detail: { ...this.metrics }
    }));
  }

  private handleTransactionUpdate = (transaction: any) => {
    const { hash: txHash, status } = transaction;
    if (!txHash) return;

    const currentStatus = this.transactionStatuses.get(txHash) || {
      status: 'pending',
      confirmations: 0
    };

    switch (status) {
      case 'confirmed':
        currentStatus.confirmations++;
        if (currentStatus.confirmations >= this.requiredConfirmations) {
          currentStatus.status = 'confirmed';
          this.metrics.confirmedTransactions++;
        }
        break;
      case 'failed':
        currentStatus.status = 'failed';
        this.metrics.failedTransactions++;
        break;
      default:
        currentStatus.status = 'pending';
    }

    this.transactionStatuses.set(txHash, currentStatus);
    this.notifyStatusChange(txHash, currentStatus);
  };

  private handlePortChange = (port: number) => {
    this.currentPort = port;
    this.metrics.currentPort = port;
    localStorage.setItem('nft_service_port', port.toString());
    log.info(`Port changed to ${port}`);
  };

  private notifyStatusChange(txHash: string, status: TransactionStatus) {
    window.dispatchEvent(new CustomEvent('nft-transaction-update', {
      detail: { txHash, status }
    }));
  }

  public async createNFT(
    metadata: NFTMetadata,
    onProgress?: (status: string) => void
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        onProgress?.(`Attempt ${attempt}/${MAX_RETRIES}: Checking service availability...`);
        
        const walletInfo = localStorage.getItem('nija_wallet_connection');
        if (!walletInfo) {
          throw new Error('Please connect your Nija Wallet first');
        }
        
        const { address } = JSON.parse(walletInfo);

        if (!this.currentPort) {
          const port = await findAvailablePort();
          if (!port) {
            throw new Error('No available service ports found');
          }
          this.handlePortChange(port);
        }

        onProgress?.('Uploading metadata to IPFS...');
        const startTime = performance.now();

        const metadataUrl = await this.uploadToIPFS(metadata);
        const uploadTime = performance.now() - startTime;
        
        this.metrics.successfulUploads++;
        this.metrics.averageUploadTime = (this.metrics.averageUploadTime * (this.metrics.successfulUploads - 1) + uploadTime) / this.metrics.successfulUploads;
        
        onProgress?.('Metadata uploaded, initiating transaction...');

        const transaction = {
          from: address,
          to: import.meta.env.VITE_NFT_CONTRACT_ADDRESS,
          data: this.encodeNFTMintData(metadataUrl),
          value: '0x0'
        };

        const txHash = await sendTransaction(transaction);
        this.metrics.totalTransactions++;
        onProgress?.('Transaction submitted...');

        this.transactionStatuses.set(txHash, {
          status: 'pending',
          confirmations: 0
        });

        await this.activitySync.connect();
        log.success('NFT creation initiated', { txHash });

        return txHash;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        log.error(`NFT creation attempt ${attempt} failed:`, error);
        this.metrics.failedUploads++;
        this.metrics.lastError = lastError.message;
        
        if (attempt < MAX_RETRIES) {
          onProgress?.(`Retrying in ${RETRY_DELAY/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    portMetrics.clear();
    this.currentPort = null;
    throw lastError || new Error('Failed to create NFT after all retries');
  }

  private async uploadToIPFS(metadata: NFTMetadata): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const sessionToken = localStorage.getItem('nija_wallet_session');
        if (!sessionToken) {
          throw new Error('No active wallet session');
        }

        if (!this.currentPort) {
          throw new Error('No active service port');
        }

        const apiUrl = getApiUrl(this.currentPort);
        log.info(`Uploading to IPFS via ${apiUrl} (attempt ${attempt}/${MAX_RETRIES})`);

        const response = await fetch(`${apiUrl}/api/ipfs/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'X-Retry-Attempt': attempt.toString()
          },
          body: JSON.stringify(metadata)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to upload to IPFS');
        }

        const { url } = await response.json();
        log.success('IPFS upload successful', { url });
        return url;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        log.error(`IPFS upload attempt ${attempt} failed:`, error);
        
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    portMetrics.clear();
    this.currentPort = null;
    throw lastError || new Error('Failed to upload to IPFS after all retries');
  }

  private encodeNFTMintData(metadataUrl: string): string {
    const mintMethodId = '0x731133e5'; // mint(string)
    const encodedUrl = Buffer.from(metadataUrl).toString('hex');
    return `${mintMethodId}${encodedUrl}`;
  }

  public getTransactionStatus(txHash: string): TransactionStatus | undefined {
    return this.transactionStatuses.get(txHash);
  }

  public async waitForConfirmation(
    txHash: string,
    timeout = 300000 // 5 minutes
  ): Promise<TransactionStatus> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutId: NodeJS.Timeout;
      
      const checkStatus = () => {
        const status = this.getTransactionStatus(txHash);
        
        if (status?.status === 'confirmed') {
          clearTimeout(timeoutId);
          resolve(status);
          return;
        }
        
        if (status?.status === 'failed') {
          clearTimeout(timeoutId);
          reject(new Error(status.error || 'Transaction failed'));
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          clearTimeout(timeoutId);
          reject(new Error('Transaction confirmation timeout'));
          return;
        }
        
        timeoutId = setTimeout(checkStatus, 1000);
      };
      
      checkStatus();
    });
  }

  public getMetrics(): ServiceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  async fractionalize(nftId: string, config: NFTFractionalizationConfig): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Wallet not initialized');
      }
      const tx = await this.contract.fractionalize(
        nftId,
        config.supply,
        ethers.parseEther(config.pricePerFraction),
        config.minimumPurchase
      );
      await tx.wait();
    } catch (error) {
      console.error('Error fractionalizing NFT:', error);
      throw error;
    }
  }

  async buyFractions(
    nftId: string,
    amount: number,
    pricePerFraction: string
  ): Promise<boolean> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Wallet not initialized');
      }
      const totalPrice = ethers.parseEther(pricePerFraction);
      const value = totalPrice * BigInt(amount);
      const tx = await this.contract.buyFractions(nftId, amount, {
        value
      });
      await tx.wait();
      return true;
    } catch (error) {
      console.error('Error buying fractions:', error);
      throw error;
    }
  }

  async getFractionDetails(nftId: string): Promise<{
    supply: string;
    available: string;
    pricePerFraction: string;
    minimumPurchase: string;
  }> {
    try {
      // TODO: Replace with actual contract call
      return {
        supply: '100',
        available: '100',
        pricePerFraction: '0.1',
        minimumPurchase: '1'
      };
    } catch (error) {
      console.error('Error getting fraction details:', error);
      throw error;
    }
  }
} 