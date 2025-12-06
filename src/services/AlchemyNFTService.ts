/**
 * Pure Alchemy NFT Service
 * 
 * This service implements NFT data retrieval using ONLY Alchemy API patterns
 * as documented in nftalchemyref.md. No mock data, no IPFS uploads, no fallbacks.
 * 
 * Alchemy provides NFT data retrieval only - not NFT creation or IPFS storage.
 * This service operates as a read-only NFT viewer using real blockchain data.
 */

import { Alchemy, Network, NftTokenType } from 'alchemy-sdk';
import type { NFT } from '../types';
import { realPerformanceMonitor } from './realPerformanceMonitor';
import { realNetworkOptimizer } from './realNetworkOptimizer';

// Enhanced Alchemy configuration with performance optimizations
const ALCHEMY_CONFIG = {
  apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || import.meta.env.ALCHEMY_API_KEY || 'demo',
  network: Network.ETH_SEPOLIA, // Using Sepolia testnet as per project requirements
  maxRetries: 2, // Reduced from 3 for faster failure detection
  requestTimeout: 5000, // Reduced from 15000 for faster response
  connectionTimeout: 3000, // New: Connection timeout
  retryDelay: 1000 // New: Delay between retries
};

// Enhanced performance monitoring interfaces
interface AlchemyPerformanceMetrics {
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  retryCount?: number;
  errorType?: string;
  responseSize?: number;
}

interface OptimizedCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

// Production-grade response cache using browser Cache API when available
const responseCache = new Map<string, OptimizedCacheEntry>();
const performanceMetrics: AlchemyPerformanceMetrics[] = [];

// Real-world performance targets based on Web Vitals
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - standard for API responses
const AGGRESSIVE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for NFT data (rarely changes)
const MAX_RESPONSE_TIME = 700; // 700ms target (based on user experience research)
const TIMEOUT_MS = 10000; // 10 second timeout (Alchemy can be slow)
const MAX_CACHE_SIZE = 100; // Maximum cache entries to prevent memory bloat
const MAX_METRICS_HISTORY = 1000; // Maximum performance metrics to keep

// Browser Cache API support check
const SUPPORTS_CACHE_API = 'caches' in window;

// Enhanced performance monitoring and cache management functions
function getCacheKey(method: string, params: any): string {
  return `${method}_${JSON.stringify(params)}`;
}

function isValidCacheEntry(entry: OptimizedCacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

function recordPerformanceMetric(metric: AlchemyPerformanceMetrics): void {
  performanceMetrics.push(metric);

  // Keep only recent metrics to prevent memory bloat
  if (performanceMetrics.length > MAX_METRICS_HISTORY) {
    performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS_HISTORY);
  }
}

function evictLRUCacheEntries(): void {
  if (responseCache.size <= MAX_CACHE_SIZE) return;

  // Sort by last accessed time and remove oldest entries
  const entries = Array.from(responseCache.entries())
    .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  toRemove.forEach(([key]) => responseCache.delete(key));

  console.log(`🧹 Evicted ${toRemove.length} LRU cache entries`);
}

function getCachedData(cacheKey: string): any | null {
  const entry = responseCache.get(cacheKey);
  if (!entry || !isValidCacheEntry(entry)) {
    if (entry) responseCache.delete(cacheKey);
    return null;
  }

  // Update access statistics
  entry.accessCount++;
  entry.lastAccessed = Date.now();

  return entry.data;
}

function setCachedData(cacheKey: string, data: any, ttl: number): void {
  const size = JSON.stringify(data).length;

  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
    accessCount: 1,
    lastAccessed: Date.now(),
    size
  });

  evictLRUCacheEntries();

  // Also store in browser Cache API if available (for persistence across sessions)
  if (SUPPORTS_CACHE_API) {
    storeBrowserCache(cacheKey, data, ttl).catch(console.warn);
  }
}

// Real browser Cache API implementation
async function storeBrowserCache(cacheKey: string, data: any, ttl: number): Promise<void> {
  try {
    const cache = await caches.open('alchemy-nft-cache-v1');
    const response = new Response(JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`
      }
    });

    await cache.put(`/alchemy/${cacheKey}`, response);
  } catch (error) {
    console.warn('Failed to store in browser cache:', error);
  }
}

async function getBrowserCache(cacheKey: string): Promise<any | null> {
  try {
    const cache = await caches.open('alchemy-nft-cache-v1');
    const response = await cache.match(`/alchemy/${cacheKey}`);

    if (response) {
      const cached = await response.json();

      // Check if cache is still valid
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      } else {
        // Remove expired cache
        await cache.delete(`/alchemy/${cacheKey}`);
      }
    }
  } catch (error) {
    console.warn('Failed to retrieve from browser cache:', error);
  }

  return null;
}

// Enhanced timeout and retry wrapper
async function executeWithTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  method: string,
  maxRetries: number = ALCHEMY_CONFIG.maxRetries,
  timeout: number = TIMEOUT_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });

      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);

      const duration = Date.now() - startTime;

      // Record successful metric
      recordPerformanceMetric({
        method,
        startTime,
        endTime: Date.now(),
        duration,
        success: true,
        retryCount: attempt,
        responseSize: JSON.stringify(result).length
      });

      // Log performance warning if needed
      if (duration > MAX_RESPONSE_TIME) {
        console.warn(`⚠️ Alchemy ${method} took ${duration}ms, exceeding ${MAX_RESPONSE_TIME}ms target`);
      } else {
        console.log(`📊 Alchemy ${method}: ${duration}ms`);
      }

      return result;

    } catch (error) {
      lastError = error as Error;
      const duration = Date.now() - startTime;

      // Record failed metric
      recordPerformanceMetric({
        method,
        startTime,
        endTime: Date.now(),
        duration,
        success: false,
        retryCount: attempt,
        errorType: lastError.message
      });

      console.warn(`⚠️ Alchemy ${method} attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff delay
        const delay = ALCHEMY_CONFIG.retryDelay * Math.pow(2, attempt);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Alchemy ${method} failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}

async function withPerformanceMonitoring<T>(
  method: string,
  operation: () => Promise<T>,
  cacheKey?: string
): Promise<T> {
  const startTime = Date.now();
  let cacheHit = false;

  try {
    // Check cache first
    if (cacheKey && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey)!;
      if (isValidCacheEntry(cached)) {
        cacheHit = true;
        const endTime = Date.now();
        recordPerformanceMetric({
          method,
          startTime,
          endTime,
          duration: endTime - startTime,
          success: true,
          cacheHit: true
        });
        return cached.data;
      } else {
        responseCache.delete(cacheKey);
      }
    }

    // Execute operation with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    const result = await Promise.race([operation(), timeoutPromise]);
    const endTime = Date.now();

    // Cache successful results with longer TTL for NFT data
    if (cacheKey) {
      const ttl = method.includes('NFT') ? AGGRESSIVE_CACHE_TTL : CACHE_TTL;
      responseCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: ttl
      });
      console.log(`📋 Cached ${method} result for ${ttl/1000/60} minutes`);
    }

    recordPerformanceMetric({
      method,
      startTime,
      endTime,
      duration: endTime - startTime,
      success: true,
      cacheHit
    });

    return result;
  } catch (error) {
    const endTime = Date.now();
    recordPerformanceMetric({
      method,
      startTime,
      endTime,
      duration: endTime - startTime,
      success: false,
      cacheHit
    });
    throw error;
  }
}

// Initialize Alchemy SDK instance
let alchemyInstance: Alchemy;

try {
  alchemyInstance = new Alchemy(ALCHEMY_CONFIG);
  console.log('✅ Alchemy NFT Service initialized with Sepolia network and performance monitoring');
} catch (error) {
  console.error('❌ Failed to initialize Alchemy SDK:', error);
  throw new Error('Alchemy SDK initialization failed');
}

export class AlchemyNFTService {
  private alchemy: Alchemy;

  constructor() {
    this.alchemy = alchemyInstance;
  }

  /**
   * Get all NFTs owned by a specific address
   * Enhanced with optimized caching, timeout, and retry logic
   */
  async getNFTsForOwner(
    ownerAddress: string,
    options: {
      pageSize?: number;
      pageKey?: string;
      withMetadata?: boolean;
      excludeFilters?: string[];
      includeFilters?: string[];
    } = {}
  ): Promise<{
    nfts: NFT[];
    totalCount: number;
    pageKey?: string;
  }> {
    const cacheKey = getCacheKey('getNFTsForOwner', { ownerAddress, options });

    // Check optimized cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`📋 Using cached NFT data for ${ownerAddress}`);
      return cachedData;
    }

    return executeWithTimeoutAndRetry(
      async () => {
        // Start real performance monitoring
        realPerformanceMonitor.markStart(`alchemy-getNFTsForOwner-${ownerAddress}`);

        console.log(`🔍 Fetching NFTs for owner: ${ownerAddress}`);

        const response = await this.alchemy.nft.getNftsForOwner(ownerAddress, {
          pageSize: options.pageSize || 100,
          pageKey: options.pageKey,
          omitMetadata: !(options.withMetadata ?? true),
          excludeFilters: options.excludeFilters as any,
          includeFilters: options.includeFilters as any,
        });

        // End performance monitoring
        const duration = realPerformanceMonitor.markEnd(`alchemy-getNFTsForOwner-${ownerAddress}`);
        realPerformanceMonitor.recordApiCall(duration, true, false);

      const nfts: NFT[] = response.ownedNfts.map(nft => ({
        id: `${nft.contract.address}-${nft.tokenId}`,
        tokenId: nft.tokenId,
        contractAddress: nft.contract.address,
        name: nft.title || nft.name || 'Unnamed NFT',
        description: nft.description || '',
        image: nft.media?.[0]?.gateway || nft.media?.[0]?.raw || '',
        tokenURI: nft.tokenUri?.raw || '',
        owner: ownerAddress,
        tokenType: nft.tokenType as 'ERC721' | 'ERC1155',
        metadata: {
          attributes: nft.rawMetadata?.attributes || [],
          collection: nft.contract.name ? {
            name: nft.contract.name,
            symbol: nft.contract.symbol
          } : undefined,
          external_url: nft.rawMetadata?.external_url
        },
        contract: {
          address: nft.contract.address,
          name: nft.contract.name || 'Unknown Contract',
          symbol: nft.contract.symbol || '',
          tokenType: nft.contract.tokenType || 'ERC721'
        },
        timeLastUpdated: nft.timeLastUpdated,
        acquiredAt: nft.acquiredAt ? {
          blockNumber: nft.acquiredAt.blockNumber,
          blockTimestamp: nft.acquiredAt.blockTimestamp
        } : undefined
      }));

        const result = {
          nfts,
          totalCount: response.totalCount,
          pageKey: response.pageKey
        };

        console.log(`✅ Retrieved ${nfts.length} NFTs from Alchemy`);

        if (nfts.length === 0) {
          console.log(`ℹ️  No NFTs found for address ${ownerAddress} on Sepolia testnet - this is normal for new addresses`);
        }

        // Cache the result with optimized TTL
        setCachedData(cacheKey, result, AGGRESSIVE_CACHE_TTL);

        return result;
      },
      'getNFTsForOwner'
    );
  }

  /**
   * Get metadata for a specific NFT
   * Following getNFTMetadata pattern from documentation
   */
  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    options: {
      tokenType?: NftTokenType;
      refreshCache?: boolean;
      tokenUriTimeoutInMs?: number;
    } = {}
  ): Promise<NFT | null> {
    try {
      console.log(`🔍 Fetching NFT metadata: ${contractAddress}/${tokenId}`);

      const response = await this.alchemy.nft.getNftMetadata(
        contractAddress,
        tokenId,
        {
          tokenType: options.tokenType || 'ERC721',
          refreshCache: options.refreshCache || false,
          tokenUriTimeoutInMs: options.tokenUriTimeoutInMs || 15000
        }
      );

      if (!response) {
        console.log(`❌ No metadata found for NFT: ${contractAddress}/${tokenId}`);
        return null;
      }

      const nft: NFT = {
        id: `${contractAddress}-${tokenId}`,
        tokenId: response.tokenId,
        contractAddress: response.contract.address,
        name: response.title || response.name || 'Unnamed NFT',
        description: response.description || '',
        image: response.media?.[0]?.gateway || response.media?.[0]?.raw || '',
        tokenURI: response.tokenUri?.raw || '',
        owner: '', // Owner not included in metadata response
        tokenType: response.tokenType as 'ERC721' | 'ERC1155',
        metadata: {
          attributes: response.rawMetadata?.attributes || [],
          collection: response.contract.name ? {
            name: response.contract.name,
            symbol: response.contract.symbol
          } : undefined,
          external_url: response.rawMetadata?.external_url
        },
        contract: {
          address: response.contract.address,
          name: response.contract.name || 'Unknown Contract',
          symbol: response.contract.symbol || '',
          tokenType: response.contract.tokenType || 'ERC721'
        },
        timeLastUpdated: response.timeLastUpdated
      };

      console.log(`✅ Retrieved NFT metadata from Alchemy: ${nft.name}`);
      return nft;

    } catch (error) {
      console.error('❌ Error fetching NFT metadata:', error);
      throw new Error(`Failed to fetch NFT metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all NFTs for a specific contract
   * Following getNFTsForContract pattern from documentation
   */
  async getNFTsForContract(
    contractAddress: string,
    options: {
      withMetadata?: boolean;
      startToken?: string;
      limit?: number;
    } = {}
  ): Promise<{
    nfts: NFT[];
    pageKey?: string;
  }> {
    try {
      console.log(`🔍 Fetching NFTs for contract: ${contractAddress}`);

      const response = await this.alchemy.nft.getNftsForContract(contractAddress, {
        omitMetadata: !(options.withMetadata ?? true),
        startToken: options.startToken,
        limit: options.limit || 100
      });

      const nfts: NFT[] = response.nfts.map(nft => ({
        id: `${nft.contract.address}-${nft.tokenId}`,
        tokenId: nft.tokenId,
        contractAddress: nft.contract.address,
        name: nft.title || nft.name || 'Unnamed NFT',
        description: nft.description || '',
        image: nft.media?.[0]?.gateway || nft.media?.[0]?.raw || '',
        tokenURI: nft.tokenUri?.raw || '',
        owner: '', // Owner not included in contract response
        tokenType: nft.tokenType as 'ERC721' | 'ERC1155',
        metadata: {
          attributes: nft.rawMetadata?.attributes || [],
          collection: nft.contract.name ? {
            name: nft.contract.name,
            symbol: nft.contract.symbol
          } : undefined,
          external_url: nft.rawMetadata?.external_url
        },
        contract: {
          address: nft.contract.address,
          name: nft.contract.name || 'Unknown Contract',
          symbol: nft.contract.symbol || '',
          tokenType: nft.contract.tokenType || 'ERC721'
        },
        timeLastUpdated: nft.timeLastUpdated
      }));

      console.log(`✅ Retrieved ${nfts.length} NFTs for contract from Alchemy`);

      return {
        nfts,
        pageKey: response.pageKey
      };

    } catch (error) {
      console.error('❌ Error fetching NFTs for contract:', error);
      throw new Error(`Failed to fetch contract NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get owners of a specific NFT
   * Following getOwnersForNFT pattern from documentation
   */
  async getOwnersForNFT(
    contractAddress: string,
    tokenId: string
  ): Promise<string[]> {
    try {
      console.log(`🔍 Fetching owners for NFT: ${contractAddress}/${tokenId}`);

      const response = await this.alchemy.nft.getOwnersForNft(contractAddress, tokenId);

      console.log(`✅ Retrieved ${response.owners.length} owners from Alchemy`);
      return response.owners;

    } catch (error) {
      console.error('❌ Error fetching NFT owners:', error);
      throw new Error(`Failed to fetch NFT owners: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an address holds any NFT from a specific contract
   * Following isHolderOfContract pattern from documentation
   */
  async isHolderOfContract(
    walletAddress: string,
    contractAddress: string
  ): Promise<boolean> {
    try {
      console.log(`🔍 Checking if ${walletAddress} holds NFTs from ${contractAddress}`);

      const response = await this.alchemy.nft.verifyNftOwnership(walletAddress, contractAddress);

      console.log(`✅ Holder check result: ${response}`);
      return response;

    } catch (error) {
      console.error('❌ Error checking NFT holder status:', error);
      throw new Error(`Failed to check holder status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * DISABLED: NFT Creation/Minting
   * Alchemy does not provide NFT creation or IPFS upload services.
   * This method is disabled to enforce read-only blockchain data usage.
   */
  async createNFT(): Promise<never> {
    throw new Error(
      'NFT creation is not supported by Alchemy API. ' +
      'Alchemy provides NFT data retrieval only, not NFT creation or IPFS storage. ' +
      'NFTGen now operates as a read-only NFT viewer using real blockchain data.'
    );
  }

  /**
   * DISABLED: IPFS Upload
   * Alchemy does not provide IPFS upload services.
   * This method is disabled to enforce Alchemy-only data usage.
   */
  async uploadToIPFS(): Promise<never> {
    throw new Error(
      'IPFS upload is not supported by Alchemy API. ' +
      'Alchemy provides NFT data retrieval only, not IPFS storage services. ' +
      'Use external IPFS services like Pinata or NFT.Storage for uploads.'
    );
  }

  /**
   * Get performance statistics for Alchemy API calls
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    cacheHitRate: number;
    methodStats: Record<string, { count: number; avgTime: number; successRate: number }>;
  } {
    if (performanceMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
        cacheHitRate: 0,
        methodStats: {}
      };
    }

    const successful = performanceMetrics.filter(m => m.success);
    const cached = performanceMetrics.filter(m => m.cacheHit);
    const avgTime = successful.reduce((sum, m) => sum + m.duration, 0) / successful.length;
    const successRate = (successful.length / performanceMetrics.length) * 100;
    const cacheHitRate = (cached.length / performanceMetrics.length) * 100;

    // Method-specific statistics
    const methodStats: Record<string, { count: number; avgTime: number; successRate: number }> = {};
    const methodGroups = performanceMetrics.reduce((groups, metric) => {
      if (!groups[metric.method]) groups[metric.method] = [];
      groups[metric.method].push(metric);
      return groups;
    }, {} as Record<string, AlchemyPerformanceMetrics[]>);

    Object.entries(methodGroups).forEach(([method, metrics]) => {
      const successfulMetrics = metrics.filter(m => m.success);
      methodStats[method] = {
        count: metrics.length,
        avgTime: successfulMetrics.length > 0
          ? Math.round(successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length)
          : 0,
        successRate: Math.round((successfulMetrics.length / metrics.length) * 100 * 100) / 100
      };
    });

    return {
      averageResponseTime: Math.round(avgTime),
      successRate: Math.round(successRate * 100) / 100,
      totalRequests: performanceMetrics.length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      methodStats
    };
  }

  /**
   * Clear performance metrics and cache
   */
  clearCache(): void {
    responseCache.clear();
    performanceMetrics.length = 0;
    console.log('🧹 Alchemy cache and metrics cleared');
  }
}

// Export singleton instance
export const alchemyNFTService = new AlchemyNFTService();
export default alchemyNFTService;
