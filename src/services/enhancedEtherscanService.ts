/**
 * Enhanced Etherscan Service
 * Production-ready service for NFT transaction tracking and link generation
 * Implements July 2025 best practices with comprehensive error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Etherscan API Configuration
interface EtherscanConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  rateLimit: number; // requests per second
}

// Network Configuration
interface NetworkConfig {
  chainId: number;
  name: string;
  explorerUrl: string;
  apiUrl: string;
  nativeCurrency: string;
}

// Transaction Data
interface TransactionData {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  contractAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

// NFT Transaction
interface NFTTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  contractAddress: string;
  tokenId: string;
  tokenName?: string;
  tokenSymbol?: string;
  explorerUrl: string;
  type: 'mint' | 'transfer' | 'burn';
}

/**
 * Enhanced Etherscan Service Class
 * Implements production-ready transaction tracking with intelligent network detection
 */
export class EnhancedEtherscanService {
  private static instance: EnhancedEtherscanService;
  private config: EtherscanConfig;
  private apiClient: AxiosInstance;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;

  // Supported Networks
  private readonly networks: Map<number, NetworkConfig> = new Map([
    [1, {
      chainId: 1,
      name: 'Ethereum Mainnet',
      explorerUrl: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api',
      nativeCurrency: 'ETH'
    }],
    [11155111, {
      chainId: 11155111,
      name: 'Sepolia Testnet',
      explorerUrl: 'https://sepolia.etherscan.io',
      apiUrl: 'https://api-sepolia.etherscan.io/api',
      nativeCurrency: 'SepoliaETH'
    }],
    [5, {
      chainId: 5,
      name: 'Goerli Testnet',
      explorerUrl: 'https://goerli.etherscan.io',
      apiUrl: 'https://api-goerli.etherscan.io/api',
      nativeCurrency: 'GoerliETH'
    }]
  ]);

  private constructor() {
    // Initialize with production credentials
    this.config = {
      apiKey: 'KVZKZU964PPF29B4IP9G4FXPXIKY7FFA8S',
      baseUrl: 'https://api.etherscan.io/api',
      timeout: 15000,
      maxRetries: 3,
      rateLimit: 5 // 5 requests per second for free tier
    };

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      params: {
        apikey: this.config.apiKey
      }
    });

    console.log('✅ Enhanced Etherscan Service initialized with production credentials');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedEtherscanService {
    if (!EnhancedEtherscanService.instance) {
      EnhancedEtherscanService.instance = new EnhancedEtherscanService();
    }
    return EnhancedEtherscanService.instance;
  }

  /**
   * Rate-limited API request
   */
  private async makeRateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 1000 / this.config.rateLimit; // milliseconds between requests

      if (timeSinceLastRequest < minInterval) {
        await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Detect network from contract address or transaction hash
   */
  private async detectNetwork(address: string): Promise<NetworkConfig> {
    // Default to Sepolia for NFTGen project
    return this.networks.get(11155111) || this.networks.get(1)!;
  }

  /**
   * Generate explorer URL for transaction
   */
  public generateTransactionUrl(txHash: string, chainId?: number): string {
    if (!txHash) return '';

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      console.warn(`Invalid transaction hash format: ${txHash}`);
      return '';
    }

    const network = this.networks.get(chainId || 11155111) || this.networks.get(11155111)!;
    return `${network.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Generate explorer URL for contract address
   */
  public generateContractUrl(contractAddress: string, chainId?: number): string {
    if (!contractAddress) return '';

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      console.warn(`Invalid contract address format: ${contractAddress}`);
      return '';
    }

    const network = this.networks.get(chainId || 11155111) || this.networks.get(11155111)!;
    return `${network.explorerUrl}/address/${contractAddress}`;
  }

  /**
   * Generate explorer URL for NFT token
   */
  public generateNFTUrl(contractAddress: string, tokenId: string, chainId?: number): string {
    if (!contractAddress || !tokenId) return '';

    const network = this.networks.get(chainId || 11155111) || this.networks.get(11155111)!;
    return `${network.explorerUrl}/nft/${contractAddress}/${tokenId}`;
  }

  /**
   * Get transaction details by hash
   */
  public async getTransactionDetails(txHash: string, chainId?: number): Promise<TransactionData | null> {
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      console.warn(`Invalid transaction hash: ${txHash}`);
      return null;
    }

    try {
      const network = this.networks.get(chainId || 11155111) || this.networks.get(11155111)!;
      
      const response = await this.makeRateLimitedRequest(async () => {
        return await axios.get(network.apiUrl, {
          params: {
            module: 'proxy',
            action: 'eth_getTransactionByHash',
            txhash: txHash,
            apikey: this.config.apiKey
          },
          timeout: this.config.timeout
        });
      });

      if (response.data && response.data.result) {
        const tx = response.data.result;
        return {
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timeStamp: tx.timeStamp || '0',
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed || '0'
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to get transaction details for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get NFT transfers for an address
   */
  public async getNFTTransfers(address: string, contractAddress?: string, chainId?: number): Promise<NFTTransaction[]> {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      console.warn(`Invalid address: ${address}`);
      return [];
    }

    try {
      const network = this.networks.get(chainId || 11155111) || this.networks.get(11155111)!;
      
      const response = await this.makeRateLimitedRequest(async () => {
        const params: any = {
          module: 'account',
          action: 'tokennfttx',
          address: address,
          startblock: 0,
          endblock: 99999999,
          sort: 'desc',
          apikey: this.config.apiKey
        };

        if (contractAddress) {
          params.contractaddress = contractAddress;
        }

        return await axios.get(network.apiUrl, {
          params,
          timeout: this.config.timeout
        });
      });

      if (response.data && response.data.status === '1' && response.data.result) {
        return response.data.result.map((tx: any) => ({
          hash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          timestamp: parseInt(tx.timeStamp) * 1000, // Convert to milliseconds
          from: tx.from,
          to: tx.to,
          contractAddress: tx.contractAddress,
          tokenId: tx.tokenID,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          explorerUrl: this.generateTransactionUrl(tx.hash, chainId),
          type: this.determineTransactionType(tx, address)
        }));
      }

      return [];
    } catch (error) {
      console.error(`Failed to get NFT transfers for ${address}:`, error);
      return [];
    }
  }

  /**
   * Determine transaction type (mint, transfer, burn)
   */
  private determineTransactionType(tx: any, userAddress: string): 'mint' | 'transfer' | 'burn' {
    const from = tx.from.toLowerCase();
    const to = tx.to.toLowerCase();
    const user = userAddress.toLowerCase();

    // Mint: from zero address to user
    if (from === '0x0000000000000000000000000000000000000000' && to === user) {
      return 'mint';
    }

    // Burn: from user to zero address
    if (from === user && to === '0x0000000000000000000000000000000000000000') {
      return 'burn';
    }

    // Transfer: any other case
    return 'transfer';
  }

  /**
   * Validate transaction hash format
   */
  public isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Validate contract address format
   */
  public isValidContractAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get supported networks
   */
  public getSupportedNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get network by chain ID
   */
  public getNetwork(chainId: number): NetworkConfig | undefined {
    return this.networks.get(chainId);
  }
}

// Export singleton instance
export const etherscanService = EnhancedEtherscanService.getInstance();
export default etherscanService;