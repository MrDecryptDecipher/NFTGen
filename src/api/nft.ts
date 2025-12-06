import { NFT_API_BASE_URL } from '../config';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import {
  Alchemy,
  Network,
  GetNftsForOwnerOptions,
  NftOrdering,
  OwnedNft,
  AssetTransfersCategory,
  NftTokenType,
  Nft
} from 'alchemy-sdk';
import axios from 'axios';

// Advanced IPFS Gateway Configuration
interface IPFSGatewayConfig {
  name: string;
  baseUrl: string;
  priority: number;
  timeout: number;
  requiresAuth?: boolean;
  headers?: Record<string, string>;
}

// Production IPFS Gateway Configuration with Real Credentials
const IPFS_GATEWAYS: IPFSGatewayConfig[] = [
  {
    name: 'Pinata',
    baseUrl: 'https://gateway.pinata.cloud',
    priority: 1,
    timeout: 8000,
    requiresAuth: false
  },
  {
    name: 'Pinata-Dedicated',
    baseUrl: `https://${import.meta.env.VITE_PINATA_API_KEY}.mypinata.cloud`,
    priority: 2,
    timeout: 10000,
    requiresAuth: false
  },
  {
    name: 'IPFS-IO',
    baseUrl: 'https://ipfs.io',
    priority: 3,
    timeout: 12000,
    requiresAuth: false
  },
  {
    name: 'Cloudflare',
    baseUrl: 'https://cloudflare-ipfs.com',
    priority: 4,
    timeout: 15000,
    requiresAuth: false
  },
  {
    name: 'Dweb',
    baseUrl: 'https://dweb.link',
    priority: 5,
    timeout: 20000,
    requiresAuth: false
  }
];

// Advanced IPFS URL Processing Service
export class IPFSGatewayService {
  private static instance: IPFSGatewayService;
  private gatewayPerformance: Map<string, { successRate: number; avgResponseTime: number; lastTested: number }> = new Map();

  static getInstance(): IPFSGatewayService {
    if (!IPFSGatewayService.instance) {
      IPFSGatewayService.instance = new IPFSGatewayService();
    }
    return IPFSGatewayService.instance;
  }

  /**
   * Extract IPFS hash from various URL formats
   */
  private extractIPFSHash(url: string): string | null {
    if (!url) return null;

    // Handle various IPFS URL formats
    const ipfsPatterns = [
      /ipfs:\/\/([a-zA-Z0-9]+)/,
      /\/ipfs\/([a-zA-Z0-9]+)/,
      /^([a-zA-Z0-9]+)$/
    ];

    for (const pattern of ipfsPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Convert IPFS URL to gateway URL with intelligent gateway selection
   */
  async convertToGatewayURL(ipfsUrl: string, _preferredGateway?: string): Promise<string[]> {
    const hash = this.extractIPFSHash(ipfsUrl);
    if (!hash) {
      return [ipfsUrl]; // Return original if not IPFS
    }

    // Sort gateways by performance and priority
    const sortedGateways = [...IPFS_GATEWAYS].sort((a, b) => {
      const perfA = this.gatewayPerformance.get(a.name);
      const perfB = this.gatewayPerformance.get(b.name);

      if (perfA && perfB) {
        // Sort by success rate first, then by response time
        if (perfA.successRate !== perfB.successRate) {
          return perfB.successRate - perfA.successRate;
        }
        return perfA.avgResponseTime - perfB.avgResponseTime;
      }

      return a.priority - b.priority;
    });

    // Generate URLs for all gateways
    const gatewayUrls = sortedGateways.map(gateway => {
      const path = ipfsUrl.includes('/') ? ipfsUrl.split('/').slice(1).join('/') : '';
      return `${gateway.baseUrl}/ipfs/${hash}${path ? '/' + path : ''}`;
    });

    return gatewayUrls;
  }

  /**
   * Test image URL with timeout and performance tracking
   */
  private async testImageUrl(url: string, gatewayName: string, timeout: number): Promise<{ success: boolean; responseTime: number }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const success = response.ok && response.headers.get('content-type')?.startsWith('image/');

      // Update performance metrics
      this.updateGatewayPerformance(gatewayName, success, responseTime);

      return { success, responseTime };
    } catch (_error) {
      const responseTime = Date.now() - startTime;
      this.updateGatewayPerformance(gatewayName, false, responseTime);
      return { success: false, responseTime };
    }
  }

  /**
   * Update gateway performance metrics
   */
  private updateGatewayPerformance(gatewayName: string, success: boolean, responseTime: number): void {
    const current = this.gatewayPerformance.get(gatewayName) || {
      successRate: 0,
      avgResponseTime: 0,
      lastTested: 0
    };

    // Simple moving average for performance metrics
    const alpha = 0.3; // Weight for new measurements
    current.successRate = current.successRate * (1 - alpha) + (success ? 1 : 0) * alpha;
    current.avgResponseTime = current.avgResponseTime * (1 - alpha) + responseTime * alpha;
    current.lastTested = Date.now();

    this.gatewayPerformance.set(gatewayName, current);
  }

  /**
   * Get the best working image URL from IPFS with intelligent fallback
   */
  async getBestImageUrl(originalUrl: string): Promise<string | null> {
    if (!originalUrl) return null;

    // If it's already a working HTTP URL, test it first
    if (originalUrl.startsWith('http') && !originalUrl.includes('ipfs')) {
      try {
        const response = await fetch(originalUrl, { method: 'HEAD', cache: 'no-cache' });
        if (response.ok) return originalUrl;
      } catch {
        // Continue to IPFS processing
      }
    }

    // Convert to gateway URLs
    const gatewayUrls = await this.convertToGatewayURL(originalUrl);

    // Test URLs in parallel with different timeouts
    const testPromises = gatewayUrls.map(async (url, index) => {
      const gateway = IPFS_GATEWAYS[index];
      if (!gateway) return null;

      const result = await this.testImageUrl(url, gateway.name, gateway.timeout);
      return result.success ? url : null;
    });

    // Wait for first successful response or all to complete
    const results = await Promise.allSettled(testPromises);

    // Return first successful URL
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }

    // If no gateway works, return the first Pinata URL as fallback
    return gatewayUrls[0] || originalUrl;
  }

  /**
   * Get gateway performance statistics
   */
  getGatewayStats(): Record<string, { successRate: number; avgResponseTime: number; totalRequests: number; lastUsed: number }> {
    const stats: Record<string, { successRate: number; avgResponseTime: number; totalRequests: number; lastUsed: number }> = {};
    this.gatewayPerformance.forEach((perf, name) => {
      stats[name] = {
        successRate: Math.round(perf.successRate * 100),
        avgResponseTime: Math.round(perf.avgResponseTime),
        lastTested: new Date(perf.lastTested).toISOString()
      };
    });
    return stats;
  }
}
// Import types from nft.ts
interface WalletNFTActivity {
  hash?: string;
  type?: string;
  tokenId?: string;
  name?: string;
  description?: string;
  image?: string;
  from?: string;
  to?: string;
  price?: string;
  timestamp?: string | number;
  contractAddress?: string;
}

// Define extended types for Alchemy SDK to handle missing properties
// Define attribute type for NFT metadata
interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

// Extended Nft interface to handle additional properties from Alchemy API
interface ExtendedNft extends Nft {
  title?: string;
  rawMetadata?: {
    name?: string;
    description?: string;
    external_url?: string;
    animation_url?: string;
    attributes?: NFTAttribute[];
  };
  media?: Array<{
    gateway: string;
    raw: string;
    format?: string;
    thumbnail?: string;
  }>;
  rarity?: {
    score: number;
    rank: number;
  };
}

// Extended OwnedNft interface to handle additional properties from Alchemy API
interface ExtendedOwnedNft {
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
    openSea?: {
      floorPrice?: number;
      collectionName?: string;
      safelistRequestStatus?: string;
      imageUrl?: string;
      description?: string;
    };
  };
  tokenId: string;
  tokenType: string;
  title?: string;
  description?: string;
  timeLastUpdated: string;
  metadataError?: string;
  media?: Array<{
    gateway: string;
    raw: string;
    format?: string;
    thumbnail?: string;
  }>;
  rarity?: {
    score: number;
    rank: number;
  };
  raw?: {
    metadata?: {
      attributes?: NFTAttribute[];
      external_url?: string;
      animation_url?: string;
      name?: string;
      description?: string;
    };
    tokenUri?: {
      gateway?: string;
      raw?: string;
    };
  };
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
  spamInfo?: {
    isSpam?: boolean;
    classifications?: string[];
  };
  balance?: string;
}

// Define NFT metadata structure
export interface NFTMetadata {
  name: string;
  description: string; // Make description required to match NwalletNFTService.NFTMetadata
  image: string;
  external_url?: string;
  attributes?: NFTAttribute[];
}

export interface MintNFTParams {
  address: string;
  metadataUrl: string;
  metadataStruct: NFTMetadata;
}

export interface MintNFTResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
  tokenId: string;
  id: string;
}

export interface NFTItem {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  contractAddress: string;
  owner: string;
  creator?: string;
  mintDate?: string;
  royalties?: number;
  fractions?: number;
  ipfsUrl: string;
  attributes?: Array<{trait_type: string; value: string | number}>;
  collection?: {
    name: string;
    family?: string;
  };
  rarity?: {
    score?: number;
    rank?: number;
    totalSupply?: number;
  };
  external_url?: string;
  animation_url?: string;
  tokenType?: string;
  media?: Array<{
    gateway: string;
    raw: string;
    format?: string;
    thumbnail?: string;
  }>;
}

export interface NFTActivity {
  id: string;
  type: 'mint' | 'transfer' | 'sale' | 'auction';
  tokenId: string;
  name: string;
  image: string;
  from: string;
  to: string;
  price?: string;
  timestamp: string;
  transactionHash: string;
}

/**
 * Calls the NFTGen backend API to mint a new NFT.
 * @param params Parameters for minting the NFT (recipient address, metadata IPFS URL, metadata object)
 * @returns Response indicating success and transaction hash or error.
 */
export const mintNFT = async (params: MintNFTParams): Promise<MintNFTResponse> => {
  const { address, metadataUrl, metadataStruct } = params;

  console.log("Minting NFT with params:", { address, metadataUrl, metadataStruct });

  try {
    // First, check if we have a direct Nwallet connection
    const { getNwalletProvider } = await import('../providers/NwalletProvider');
    const provider = getNwalletProvider();

    if (provider) {
      console.log("Using Nwallet provider for minting");

      // Import the Nwallet NFT service
      const { NwalletNFTService } = await import('../services/nft/NwalletNFTService');
      const nftService = NwalletNFTService.getInstance();

      // Mint the NFT using Nwallet
      const result = await nftService.mintNFT({
        address,
        metadataUrl,
        metadataStruct
      });

      if (result.success) {
        console.log("Nwallet minting successful:", result);
        toast.success(`NFT Minting initiated! Tx: ${result.transactionHash}`);

        // Save the activity to localStorage for history tracking
        const { handleMintComplete } = await import('../utils/nftActivitySync');
        await handleMintComplete(
          {
            transactionHash: result.transactionHash,
            tokenId: result.tokenId
          },
          metadataUrl,
          {
            name: metadataStruct.name,
            description: metadataStruct.description || '',
            image: metadataStruct.image
          },
          address
        );

        // Ensure tokenId is always a string
        const tokenId = result.tokenId || `token-${Date.now().toString(16)}`;
        return {
          success: true,
          transactionHash: result.transactionHash || '',
          tokenId: tokenId,
          id: tokenId
        };
      } else {
        console.error("Nwallet minting failed:", result.error);
        toast.error(`Minting error: ${result.error}`);
        return {
          success: false,
          error: result.error,
          tokenId: `error-${Date.now().toString(16)}`,
          id: `error-${Date.now().toString(16)}`
        };
      }
    } else {
      console.log("Nwallet provider not available, falling back to backend API");

      // Use the configured API base URL or a default, pointing to the backend mint route
      const backendApiUrl = `${NFT_API_BASE_URL || 'http://3.111.22.56:7102'}/api/nft/mint`;

      console.log(`Sending POST request to: ${backendApiUrl}`);

      const response = await axios.post(backendApiUrl, {
        recipientAddress: address,
        tokenURI: metadataUrl,
        metadata: metadataStruct // Send the full metadata object
      });

      if (response.data.success) {
        console.log("Backend minting successful:", response.data);
        toast.success(`NFT Minting initiated! Tx: ${response.data.transactionHash}`);

        // Ensure we have a unique ID for the NFT to enable linking
        const uniqueId = response.data.id ||
                       response.data.tokenId ||
                       response.data.transactionHash ||
                       `mint-${Date.now().toString(16)}`;

        return {
          success: true,
          transactionHash: response.data.transactionHash,
          tokenId: uniqueId, // Include the unique ID in the response
          id: uniqueId // Also provide as id for maximum compatibility
        };
      } else {
        console.error("Backend minting failed:", response.data.error);
        toast.error(`Minting failed: ${response.data.error}`);
        const message = response.data.error || 'API minting failed';
        return {
          success: false,
          error: message,
          tokenId: `error-${Date.now().toString(16)}`,
          id: `error-${Date.now().toString(16)}`
        };
      }
    }
  } catch (error) {
    console.error("Error minting NFT:", error);
    const errorObj = error as Error;
    const responseError = error as { response?: { data?: { error?: string } } };
    const message = responseError.response?.data?.error || errorObj.message || "Unknown error minting NFT";
    toast.error(`Minting error: ${message}`);

    const errorId = `error-${Date.now().toString(16)}`;
    return {
      success: false,
      error: message,
      tokenId: errorId,
      id: errorId
    };
  }
};

// Initialize IPFS Gateway Service
const ipfsService = IPFSGatewayService.getInstance();

// Initialize Alchemy SDK configuration for NFT operations
// Production configuration synchronized with Nwallet
const alchemyConfig = {
  apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA, // Using Sepolia as recommended in alchemyapireferences.md line 390
  maxRetries: 5,
  requestTimeout: 30000
};

console.log("Initializing Alchemy SDK for NFT fetching with key:", alchemyConfig.apiKey ? '***PRODUCTION***' : 'MISSING!', "Network:", alchemyConfig.network);

// Validate production API key
if (!alchemyConfig.apiKey) {
  console.error("CRITICAL: Production Alchemy API Key is missing! Check VITE_ALCHEMY_API_KEY in .env");
  toast.error("NFT Gallery Error: Missing production API configuration");
}

// Create an Alchemy instance following the pattern in nftalchemyref.md lines 89-97
const alchemy = new Alchemy(alchemyConfig);

// Configure axios for direct NFT API requests as a fallback
// Based on documentation from nftalchemyref.md lines 410-429
const axiosInstance = axios.create({
  baseURL: `https://eth-sepolia.g.alchemy.com/nft/v3/${alchemyConfig.apiKey}`,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

/**
 * Fetches NFTs owned by a specific address, optionally filtering by contract.
 * Implements all available options from the Alchemy NFT API documentation.
 * Based on documentation from nftalchemyref.md lines 550-743
 */
export const fetchNFTsForOwner = async (
  ownerAddress: string,
  contractAddress?: string,
  pageKey?: string,
  additionalOptions?: Partial<GetNftsForOwnerOptions>
): Promise<{ nfts: OwnedNft[]; pageKey?: string }> => {
  if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
    console.error("fetchNFTsForOwner: Invalid owner address provided");
    return { nfts: [] };
  }

  // Validate API Key presence
  if (!alchemyConfig.apiKey) {
    console.error("fetchNFTsForOwner: Alchemy API Key is MISSING in environment variables (VITE_ALCHEMY_API_KEY)! Cannot fetch NFTs.");
    toast.error("NFT Gallery Error: Missing API Key configuration. Check console and .env file.");
    return { nfts: [] };
  }

  console.log(`Fetching NFTs for owner: ${ownerAddress}${contractAddress ? ` on contract ${contractAddress}` : ''}${pageKey ? ` with pageKey ${pageKey}` : ''}`);

  // Set default options based on documentation from nftalchemyref.md lines 550-743
  const options: GetNftsForOwnerOptions = {
    orderBy: NftOrdering.TRANSFERTIME, // Sort by most recent transfers first
    pageSize: 100, // Increased page size for better performance
    omitMetadata: false, // Include metadata for better display
    tokenUriTimeoutInMs: 15000 // 15 seconds timeout as recommended in documentation
    // Note: refreshCache is not part of GetNftsForOwnerOptions type but is used in the API call
  };

  // Note: These options are applied directly in the API call below

  // Apply additional options
  if (pageKey) {
    options.pageKey = pageKey;
  }

  if (contractAddress) {
    options.contractAddresses = [contractAddress];
  }

  // Merge with any additional options provided
  if (additionalOptions) {
    Object.assign(options, additionalOptions);
  }

  try {
    console.log("Using options for NFT fetch:", options);

    // Use the Alchemy SDK with proper error handling
    // Based on nftalchemyref.md lines 550-743
    try {
      // Use the recommended method from the Alchemy documentation
      const response = await alchemy.nft.getNftsForOwner(ownerAddress, options);

      console.log(`Found ${response.ownedNfts.length} NFTs for owner using Alchemy SDK`);

      // Process the NFTs to ensure all required fields are present
      const processedNfts = response.ownedNfts.map(nft => {
        // Ensure the NFT has all required fields
        return {
          ...nft,
          // Add any missing fields with default values if needed
          tokenType: nft.tokenType || 'ERC721',
          contract: {
            ...nft.contract,
            // Ensure contract has all required fields
            name: nft.contract.name || 'Unknown Collection',
            symbol: nft.contract.symbol || 'UNKNOWN',
            totalSupply: nft.contract.totalSupply || '0'
          }
        };
      });

      return {
        nfts: processedNfts,
        pageKey: response.pageKey
      };
    } catch (sdkError) {
      console.warn("Alchemy SDK error, attempting retry with different options:", sdkError);

      // Retry with different options
      try {
        // Try with simpler options
        const retryOptions: GetNftsForOwnerOptions = {
          pageSize: 20,
          omitMetadata: false
        };

        if (contractAddress) {
          retryOptions.contractAddresses = [contractAddress];
        }

        const retryResponse = await alchemy.nft.getNftsForOwner(ownerAddress, retryOptions);

        console.log(`Retry successful. Found ${retryResponse.ownedNfts.length} NFTs for owner`);

        return {
          nfts: retryResponse.ownedNfts,
          pageKey: retryResponse.pageKey
        };
      } catch (retryError) {
        console.warn("Retry failed, falling back to direct API call:", retryError);

        // Fall back to direct API call if SDK fails
        // Based on nftalchemyref.md lines 410-429
        try {
          const response = await axiosInstance.get(`/getNFTsForOwner`, {
            params: {
              owner: ownerAddress,
              pageSize: options.pageSize,
              orderBy: options.orderBy,
              withMetadata: !options.omitMetadata,
              tokenUriTimeoutInMs: options.tokenUriTimeoutInMs,
              refreshCache: false,
              ...(options.contractAddresses && { contractAddresses: options.contractAddresses.join(',') }),
              ...(options.pageKey && { pageKey: options.pageKey })
            }
          });

          if (response.data && response.data.ownedNfts) {
            console.log(`Found ${response.data.ownedNfts.length} NFTs for owner using direct API call`);
            return {
              nfts: response.data.ownedNfts,
              pageKey: response.data.pageKey
            };
          } else {
            console.warn("Direct API call returned unexpected data format:", response.data);
            return { nfts: [] };
          }
        } catch (apiError) {
          console.error("All NFT fetching methods failed:", apiError);
          toast.error("Failed to fetch NFTs. Please try again later.");
          return { nfts: [] };
        }
      }
    }
  } catch (error) {
    console.error("Error fetching NFTs:", error);

    // Implement proper error handling based on documentation
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;

      if (statusCode === 401) {
        toast.error("Alchemy Authentication Failed. Please verify your API key.");
      } else if (statusCode === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (statusCode === 500) {
        toast.error("Alchemy server error. Please try again later.");
      } else if (statusCode === 504) {
        toast.error("Request timeout. The operation took too long to complete.");
      } else {
        toast.error(`Failed to fetch NFTs: ${error.message}`);
      }
    } else {
      toast.error("Failed to fetch NFTs. Check console for details.");
    }

    return { nfts: [] };
  }
};

// Add other potential NFT API functions here if needed (e.g., fetchNFTMetadata, fetchNFTDetails)

export const getUserNFTs = async (address: string): Promise<NFTItem[]> => {
  // Ensure the function always starts by defining an empty array
  let mappedNfts: NFTItem[] = [];
  try {
    console.log('Fetching user NFTs for address:', address);

    // Use Alchemy SDK for real data following the documentation
    // Based on nftalchemyref.md lines 550-743
    try {
      console.log('Using Alchemy SDK to fetch NFTs');

      // Configure options based on Alchemy documentation
      const options: GetNftsForOwnerOptions = {
        pageSize: 100, // Get up to 100 NFTs at once
        orderBy: NftOrdering.TRANSFERTIME, // Sort by most recent transfers
        omitMetadata: false, // Include full metadata
        tokenUriTimeoutInMs: 15000 // 15 seconds timeout as recommended
      };

      // Make the API call using the Alchemy SDK
      const nftsForOwner = await alchemy.nft.getNftsForOwner(address, options);

      console.log('Alchemy returned NFTs:', nftsForOwner);

      // Check if ownedNfts exists and has length before mapping
      if (nftsForOwner.ownedNfts && nftsForOwner.ownedNfts.length > 0) {
        // Process NFTs with advanced IPFS gateway resolution
        mappedNfts = await Promise.all(nftsForOwner.ownedNfts.map(async (nft: OwnedNft, index) => {
          // Advanced image URL resolution with IPFS gateway fallback
          let imageUrl = nft.image?.cachedUrl ||
                        nft.image?.originalUrl ||
                        nft.image?.pngUrl ||
                        nft.image?.thumbnailUrl ||
                        nft.raw?.metadata?.image ||
                        '';

          // If no direct image URL, try to extract from metadata
          if (!imageUrl && nft.raw?.metadata) {
            imageUrl = nft.raw.metadata.image ||
                      nft.raw.metadata.animation_url ||
                      '';
          }

          // Use advanced IPFS gateway service for optimal image loading
          if (imageUrl) {
            try {
              const optimizedUrl = await ipfsService.getBestImageUrl(imageUrl);
              if (optimizedUrl) {
                imageUrl = optimizedUrl;
                console.log(`Optimized image URL for NFT ${nft.tokenId}: ${imageUrl}`);
              }
            } catch (error) {
              console.warn(`Failed to optimize image URL for NFT ${nft.tokenId}:`, error);
              // Keep original URL as fallback
            }
          }

          // Extract token URI from the NFT data
          // Cast to ExtendedOwnedNft to access additional properties
          const extendedNft = nft as unknown as ExtendedOwnedNft;
          const tokenUriGateway = extendedNft.tokenUri?.gateway ||
                                 extendedNft.tokenUri?.raw ||
                                 nft.tokenUri || // Fallback to standard property
                                 '';

          // Extract name and description with fallbacks
          const nftName = extendedNft.title ||
                         nft.name ||
                         extendedNft.raw?.metadata?.name ||
                         `NFT #${nft.tokenId || index}`;

          const nftDescription = nft.description ||
                                extendedNft.raw?.metadata?.description ||
                                'No description available';

          // Attempt to parse attributes from raw metadata if needed, handle potential errors
          let royalties = 0;
          let fractions = 1;
          try {
            // Parse attributes following Alchemy documentation
            if (nft.raw?.metadata?.attributes && Array.isArray(nft.raw.metadata.attributes)) {
              // Look for royalty attributes
              const royaltyAttr = nft.raw.metadata.attributes.find(
                (attr: NFTAttribute) =>
                  attr.trait_type?.toLowerCase() === 'royalty' ||
                  attr.trait_type?.toLowerCase() === 'royalties'
              );

              if (royaltyAttr) {
                royalties = Number(royaltyAttr.value) || 0;
              }

              // Look for fraction attributes
              const fractionAttr = nft.raw.metadata.attributes.find(
                (attr: NFTAttribute) =>
                  attr.trait_type?.toLowerCase() === 'fractions'
              );

              if (fractionAttr) {
                fractions = Number(fractionAttr.value) || 1;
              }
            }
          } catch (attrError) {
            console.warn(`Could not parse attributes for NFT ${nft.tokenId}:`, attrError);
          }

          // Create a complete NFT item with all available data
          return {
            id: `nft-${nft.tokenId || index}`,
            tokenId: nft.tokenId || `unknown-${index}`,
            name: nftName,
            description: nftDescription,
            image: imageUrl,
            contractAddress: nft.contract.address,
            owner: address,
            // Creator info might not be directly available, use owner as fallback
            creator: address,
            // Mint date requires specific event fetching, using placeholder
            mintDate: nft.timeLastUpdated || new Date().toISOString(),
            royalties: royalties,
            fractions: fractions,
            ipfsUrl: tokenUriGateway,
            // Enhanced metadata
            collection: nft.contract?.name ? {
              name: nft.contract.name,
              family: nft.contract.symbol || undefined
            } : undefined,
            tokenType: nft.tokenType || undefined,
            // Media information if available
            media: extendedNft.media?.map(m => ({
              gateway: m.gateway || '',
              raw: m.raw || '',
              format: m.format || undefined,
              thumbnail: m.thumbnail || undefined
            })) || [],
            // Rarity information if available
            rarity: extendedNft.rarity ? {
              score: extendedNft.rarity.score,
              rank: extendedNft.rarity.rank,
              totalSupply: nft.contract?.totalSupply ? Number(nft.contract.totalSupply) : undefined
            } : undefined,
            // Additional metadata
            external_url: nft.raw?.metadata?.external_url,
            animation_url: nft.raw?.metadata?.animation_url
          };
        }));

        // If we got NFTs from Alchemy, return them immediately
        return mappedNfts;
      } else {
        console.log('No NFTs found via Alchemy SDK, trying backend API');
      }
    } catch (alchemyError) {
      console.error('Alchemy SDK error fetching NFTs:', alchemyError);
      console.log('Falling back to backend API');
    }

    // If Alchemy fails or returns no NFTs, try our backend API
    try {
      console.log('Fetching NFTs from backend API');
      const backendApiUrl = `${NFT_API_BASE_URL || 'http://3.111.22.56:7102'}/api/nft/gallery?address=${address}`;
      console.log(`Sending GET request to: ${backendApiUrl}`);

      const response = await axios.get(backendApiUrl);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('Backend API returned NFTs:', response.data);
        mappedNfts = response.data;
        return mappedNfts;
      } else {
        console.log('No NFTs found in backend API, checking for minted NFTs in history');
      }
    } catch (backendError) {
      console.error('Error fetching NFTs from backend:', backendError);
      console.log('Checking for minted NFTs in history');
    }

    // If we still have no NFTs, check if we have any minted NFTs in the history
    // This ensures that at least the NFT shown in the history appears in the gallery
    try {
      // Get real history data first
      let historyData: NFTActivity[] = [];
      try {
        const apiBaseUrl = NFT_API_BASE_URL || 'http://3.111.22.56:7102';
        const historyResponse = await fetch(`${apiBaseUrl}/api/nft/history?address=${address}`);
        if (historyResponse.ok) {
          historyData = await historyResponse.json();
        }
      } catch (historyError) {
        console.error('Error fetching real history:', historyError);
      }

      // If no real history, return empty array
      if (!historyData || !Array.isArray(historyData) || historyData.length === 0) {
        historyData = [];
        console.log('No NFT history found from any source');
      }

      const mintedNFTs = Array.isArray(historyData) ? historyData.filter(activity => activity.type === 'mint') : [];

      if (mintedNFTs.length > 0) {
        console.log('Using minted NFTs from history as fallback');
        mappedNfts = mintedNFTs.map(activity => ({
          id: activity.id,
          tokenId: activity.tokenId,
          name: activity.name,
          description: 'Your minted NFT',
          image: activity.image,
          contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
          owner: address,
          creator: address,
          mintDate: activity.timestamp,
          royalties: 2.5,
          fractions: 1,
          ipfsUrl: activity.image
        }));
      }
    } catch (mockError) {
      console.error('Error creating fallback NFTs from history:', mockError);
    }

  } catch (error) {
    console.error('Overall error fetching user NFTs:', error);
    toast.error('Failed to load NFTs');
  }

  // Always return the mappedNfts array (which is [] if errors occurred or no NFTs found)
  return mappedNfts;
};

/**
 * Fetches NFT activity history for a specific address
 * Implements comprehensive NFT activity tracking based on Alchemy NFT API documentation
 * Based on documentation from nftalchemyref.md
 *
 * @param address The wallet address to fetch history for
 * @returns Array of NFT activities
 */
export const getUserNFTHistory = async (address: string): Promise<NFTActivity[]> => {
  try {
    console.log('Fetching NFT history for address:', address);

    // First try to get on-chain data from Alchemy using the enhanced method
    try {
      console.log('Fetching on-chain NFT activities from Alchemy...');

      // Use the enhanced fetchNFTTransferEvents function that follows Alchemy documentation
      const transferEvents = await fetchNFTTransferEvents(address);

      if (transferEvents && transferEvents.length > 0) {
        console.log(`Found ${transferEvents.length} NFT transfer events from Alchemy`);

        // Convert transfer events to NFT activities with enhanced metadata
        // Explicitly type the array as NFTActivity[]
        const onChainActivities: NFTActivity[] = await Promise.all(
          transferEvents.map(async (event) => {
            // For each transfer, try to get the NFT metadata to enhance the activity
            let name = 'Unknown NFT';
            let image = '/placeholder-nft.png';
            let description = '';

            try {
              if (event.contractAddress && event.tokenId) {
                // Use the Alchemy SDK to get NFT metadata with proper options
                // Based on nftalchemyref.md documentation
                const metadata = await alchemy.nft.getNftMetadata(
                  event.contractAddress,
                  event.tokenId,
                  {
                    tokenType: 'ERC721' as NftTokenType,
                    refreshCache: false,
                    tokenUriTimeoutInMs: 15000 // 15 seconds timeout as recommended
                  }
                ) as unknown as ExtendedNft; // Cast to our extended type

                if (metadata) {
                  name = metadata.title ||
                         metadata.rawMetadata?.name ||
                         metadata.name ||
                         'Unknown NFT';

                  description = metadata.description ||
                                metadata.rawMetadata?.description ||
                                '';

                  // Use Alchemy's CDN URLs for images when available
                  image = metadata.image?.cachedUrl ||
                          metadata.image?.thumbnailUrl ||
                          metadata.image?.pngUrl ||
                          (metadata.media && metadata.media[0]?.gateway) ||
                          '/placeholder-nft.png';
                }
              }
            } catch (metadataError) {
              console.warn('Error fetching NFT metadata for activity:', metadataError);
            }

            // Determine the activity type based on the from address
            // Only use 'mint' or 'transfer' for on-chain activities to match the expected type
            const type: 'mint' | 'transfer' =
              event.fromAddress === '0x0000000000000000000000000000000000000000'
                ? 'mint'
                : 'transfer';

            // Create a properly typed NFTActivity object
            return {
              id: `${event.hash}-${event.tokenId || ''}`,
              type: type,
              tokenId: event.tokenId || '',
              name: name,
              description: description || '',
              image: image,
              from: event.fromAddress,
              to: event.toAddress,
              price: event.value ? `${event.value}` : undefined,
              timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
              transactionHash: event.hash,
              contractAddress: event.contractAddress
            };
          })
        );

        // Check localStorage for any additional activities that might not be on-chain yet
        try {
          const { loadNFTActivitiesFromLocalStorage } = await import('../utils/nftActivitySync');
          const walletActivities: WalletNFTActivity[] = loadNFTActivitiesFromLocalStorage(address);

          if (walletActivities && walletActivities.length > 0) {
            console.log(`Found ${walletActivities.length} NFT activities in localStorage`);

            // Convert wallet activities to our NFTActivity format with proper type handling
            const localActivities = walletActivities.map(walletActivity => {
              // Ensure the activity type is one of the allowed values
              let activityType: 'mint' | 'transfer' | 'sale' | 'auction';

              // Map the activity type safely
              switch (walletActivity.type) {
                case 'mint':
                  activityType = 'mint';
                  break;
                case 'transfer':
                  activityType = 'transfer';
                  break;
                case 'sale':
                case 'buy':
                case 'sell':
                  activityType = 'sale';
                  break;
                case 'auction':
                  activityType = 'auction';
                  break;
                default:
                  // Default to transfer for unknown types
                  activityType = 'transfer';
              }

              return {
                id: walletActivity.hash || `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: activityType,
                tokenId: walletActivity.tokenId || '',
                name: walletActivity.name || 'Unknown NFT',
                description: walletActivity.description || '',
                image: walletActivity.image || '/placeholder-nft.png',
                from: walletActivity.from || '0x0000000000000000000000000000000000000000',
                to: walletActivity.to || address,
                price: walletActivity.price,
                timestamp: walletActivity.timestamp ? new Date(walletActivity.timestamp).toISOString() : new Date().toISOString(),
                transactionHash: walletActivity.hash || '',
                contractAddress: walletActivity.contractAddress || ''
              };
            });

            // Create a set of transaction hashes from on-chain activities for deduplication
            const onChainTxHashes = new Set(onChainActivities.map(activity => activity.transactionHash));

            // Add local activities that aren't already in our on-chain activities
            localActivities.forEach(activity => {
              if (!onChainTxHashes.has(activity.transactionHash)) {
                // Create a properly typed NFTActivity object
                const typedActivity: NFTActivity = {
                  id: activity.id || `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  type: (activity.type as 'mint' | 'transfer' | 'sale' | 'auction') || 'transfer',
                  tokenId: activity.tokenId || '',
                  name: activity.name || 'Unknown NFT',
                  image: activity.image || '/placeholder-nft.png',
                  description: activity.description,
                  from: activity.from || '0x0000000000000000000000000000000000000000',
                  to: activity.to || address,
                  price: activity.price,
                  timestamp: activity.timestamp ? new Date(activity.timestamp).toISOString() : new Date().toISOString(),
                  transactionHash: activity.transactionHash || '',
                  contractAddress: activity.contractAddress || ''
                };
                onChainActivities.push(typedActivity);
              }
            });
          }
        } catch (localStorageError) {
          console.error('Error checking localStorage for NFT activities:', localStorageError);
          // Continue with just the on-chain activities
        }

        // Sort by timestamp descending (newest first)
        onChainActivities.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        return onChainActivities;
      } else {
        console.log('No on-chain NFT activities found, checking backend API...');
      }
    } catch (alchemyError) {
      console.error('Error fetching on-chain NFT activities:', alchemyError);
      console.log('Falling back to backend API...');
    }

    // If Alchemy fails, try our backend API
    const apiBaseUrl = NFT_API_BASE_URL || 'http://3.111.22.56:7102';

    try {
      console.log('Fetching NFT history from backend API...');
      const response = await fetch(`${apiBaseUrl}/api/nft/history?address=${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Received NFT history data from backend:', data);

        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (backendError) {
      console.error('Error fetching history from backend:', backendError);
    }

    // If all real data sources fail, return an empty array
    console.log('No NFT activities found from any source');
    return [];
  } catch (error) {
    console.error('Overall error fetching NFT history:', error);
    toast.error('Failed to load NFT history');
    return [];
  }
};

/**
 * Interface for NFT transfer events
 * Based on Alchemy API documentation
 */
interface NFTTransferEvent {
  hash: string;
  fromAddress: string;
  toAddress: string;
  tokenId: string;
  contractAddress: string;
  value?: string;
  timestamp: number;
  blockNumber: number;
  category: string;
}

/**
 * Fetches NFT transfer events for a specific address
 * Implements comprehensive NFT transfer tracking based on Alchemy NFT API documentation
 * Based on documentation from nftalchemyref.md
 *
 * @param address The wallet address to fetch transfers for
 * @returns Array of NFT transfer events
 */
export const fetchNFTTransferEvents = async (address: string): Promise<NFTTransferEvent[]> => {
  try {
    console.log('Fetching NFT transfers from Alchemy for address:', address);

    // Validate address
    if (!address || !ethers.isAddress(address)) {
      console.error('Invalid address provided for NFT transfer events');
      return [];
    }

    // Fetch transfers TO the address
    const toTransfers = await alchemy.core.getAssetTransfers({
      fromBlock: "0x0", // From the beginning of the chain
      toAddress: address as `0x${string}`,
      excludeZeroValue: false, // Include zero value transfers for NFTs
      category: [
        AssetTransfersCategory.ERC721,
        AssetTransfersCategory.ERC1155
      ],
      maxCount: 100,
      withMetadata: true // Include metadata for better information
    });

    // Fetch transfers FROM the address
    const fromTransfers = await alchemy.core.getAssetTransfers({
      fromBlock: "0x0", // From the beginning of the chain
      fromAddress: address as `0x${string}`,
      excludeZeroValue: false, // Include zero value transfers for NFTs
      category: [
        AssetTransfersCategory.ERC721,
        AssetTransfersCategory.ERC1155
      ],
      maxCount: 100,
      withMetadata: true // Include metadata for better information
    });

    console.log(`Found ${toTransfers.transfers.length} transfers TO and ${fromTransfers.transfers.length} transfers FROM the address`);

    // Combine and normalize the transfers
    const allTransfers: NFTTransferEvent[] = [
      ...toTransfers.transfers.map(transfer => ({
        hash: transfer.hash,
        fromAddress: transfer.from,
        toAddress: transfer.to || address,
        tokenId: transfer.tokenId || '',
        contractAddress: transfer.rawContract?.address || '',
        value: transfer.value?.toString(),
        timestamp: transfer.metadata?.blockTimestamp
          ? new Date(transfer.metadata.blockTimestamp).getTime()
          : parseInt(transfer.blockNum, 16) * 1000,
        blockNumber: parseInt(transfer.blockNum, 16),
        category: transfer.category
      })),
      ...fromTransfers.transfers.map(transfer => ({
        hash: transfer.hash,
        fromAddress: transfer.from,
        toAddress: transfer.to || '',
        tokenId: transfer.tokenId || '',
        contractAddress: transfer.rawContract?.address || '',
        value: transfer.value?.toString(),
        timestamp: transfer.metadata?.blockTimestamp
          ? new Date(transfer.metadata.blockTimestamp).getTime()
          : parseInt(transfer.blockNum, 16) * 1000,
        blockNumber: parseInt(transfer.blockNum, 16),
        category: transfer.category
      }))
    ];

    // Remove duplicates based on transaction hash and token ID
    const uniqueTransfers = Array.from(
      new Map(
        allTransfers.map(transfer => [
          `${transfer.hash}-${transfer.tokenId}`,
          transfer
        ])
      ).values()
    );

    // Sort by timestamp descending (newest first)
    uniqueTransfers.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`Found ${uniqueTransfers.length} unique NFT transfers after deduplication`);

    return uniqueTransfers;
  } catch (error) {
    console.error('Error fetching NFT transfer events:', error);
    return [];
  }
};

/**
 * Update the NFTActivity interface to include contractAddress
 */
export interface NFTActivity {
  id: string;
  type: 'mint' | 'transfer' | 'sale' | 'auction';
  tokenId: string;
  name: string;
  image: string;
  description?: string;
  from: string;
  to: string;
  price?: string;
  timestamp: string;
  transactionHash: string;
  contractAddress?: string;
}

// This function has been replaced by inline type handling in the code

// No more mock history generation - we only use real data from Alchemy API