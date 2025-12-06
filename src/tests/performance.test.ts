/**
 * Comprehensive Performance Tests
 * 
 * Tests all performance optimizations including:
 * - Alchemy API caching and timeout
 * - IPFS gateway optimization
 * - Progressive image loading
 * - Error handling and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { optimizedIPFSService } from '../services/optimizedIPFSService';
import { AlchemyNFTService } from '../services/AlchemyNFTService';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optimizedIPFSService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Optimized IPFS Service', () => {
    it('should validate IPFS hashes correctly', () => {
      // Valid hashes
      expect(optimizedIPFSService.validateIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
      expect(optimizedIPFSService.validateIPFSHash('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true);
      
      // Invalid hashes
      expect(optimizedIPFSService.validateIPFSHash('QmTest')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('invalid')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('QmPlaceholder')).toBe(false);
    });

    it('should extract IPFS hash from various URL formats', () => {
      const validHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      // Test various URL formats
      expect(optimizedIPFSService.extractIPFSHash(`ipfs://${validHash}`)).toBe(validHash);
      expect(optimizedIPFSService.extractIPFSHash(`https://ipfs.io/ipfs/${validHash}`)).toBe(validHash);
      expect(optimizedIPFSService.extractIPFSHash(`https://gateway.pinata.cloud/ipfs/${validHash}`)).toBe(validHash);
      expect(optimizedIPFSService.extractIPFSHash(validHash)).toBe(validHash);
      
      // Invalid URLs
      expect(optimizedIPFSService.extractIPFSHash('https://example.com/invalid')).toBe(null);
      expect(optimizedIPFSService.extractIPFSHash('')).toBe(null);
    });

    it('should cache image URLs correctly', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const testUrl = `ipfs://${testHash}`;

      // First load
      const result1 = await optimizedIPFSService.loadOptimizedImage(testUrl);
      expect(result1.cached).toBe(false);

      // Second load should be cached
      const result2 = await optimizedIPFSService.loadOptimizedImage(testUrl);
      expect(result2.cached).toBe(true);
      expect(result2.loadTime).toBeLessThan(result1.loadTime);
    });

    it('should handle gateway failures with retry logic', async () => {
      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const testUrl = `ipfs://${testHash}`;

      // Mock first two calls to fail, third to succeed
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl);
      expect(result.retryCount).toBe(2);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should optimize image URLs with parameters', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const testUrl = `ipfs://${testHash}`;

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl, {
        width: 400,
        height: 400,
        quality: 85,
        format: 'webp'
      });

      // Should include optimization parameters for Pinata gateway
      expect(result.url).toContain('img-width=400');
      expect(result.url).toContain('img-height=400');
      expect(result.url).toContain('img-quality=85');
      expect(result.url).toContain('img-format=webp');
    });

    it('should provide performance statistics', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);

      const stats = optimizedIPFSService.getPerformanceStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.gatewayStats).toHaveLength(4); // 4 default gateways
      expect(stats.gatewayStats[0]).toHaveProperty('url');
      expect(stats.gatewayStats[0]).toHaveProperty('latency');
      expect(stats.gatewayStats[0]).toHaveProperty('successRate');
    });
  });

  describe('Alchemy API Performance', () => {
    let alchemyService: AlchemyNFTService;

    beforeEach(() => {
      alchemyService = AlchemyNFTService.getInstance();
    });

    it('should cache NFT data correctly', async () => {
      const mockNFTData = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Test NFT' },
            tokenId: '1',
            title: 'Test NFT #1',
            description: 'Test description',
            media: [{ gateway: 'https://example.com/image.png' }],
            tokenType: 'ERC721'
          }
        ],
        totalCount: 1,
        pageKey: null
      };

      // Mock Alchemy response
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTData)
        }
      };

      // Replace alchemy instance
      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';

      // First call
      const startTime1 = Date.now();
      const result1 = await alchemyService.getNFTsForOwner(testAddress);
      const duration1 = Date.now() - startTime1;

      // Second call should be faster (cached)
      const startTime2 = Date.now();
      const result2 = await alchemyService.getNFTsForOwner(testAddress);
      const duration2 = Date.now() - startTime2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1);
      expect(mockAlchemy.nft.getNftsForOwner).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should handle API timeouts correctly', async () => {
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 6000)
            )
          )
        }
      };

      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';

      await expect(alchemyService.getNFTsForOwner(testAddress)).rejects.toThrow();
    });

    it('should retry failed requests', async () => {
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Timeout'))
            .mockResolvedValueOnce({
              ownedNfts: [],
              totalCount: 0,
              pageKey: null
            })
        }
      };

      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';
      const result = await alchemyService.getNFTsForOwner(testAddress);

      expect(result.nfts).toHaveLength(0);
      expect(mockAlchemy.nft.getNftsForOwner).toHaveBeenCalledTimes(3);
    });

    it('should measure and log performance metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue({
            ownedNfts: [],
            totalCount: 0,
            pageKey: null
          })
        }
      };

      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';
      await alchemyService.getNFTsForOwner(testAddress);

      // Should log performance metrics
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/📊 Alchemy getNFTsForOwner: \d+ms/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete NFT loading workflow', async () => {
      // Mock successful responses
      const mockNFTResponse = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Test NFT' },
            tokenId: '1',
            title: 'Test NFT #1',
            description: 'Test description',
            media: [{ gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG' }],
            tokenType: 'ERC721'
          }
        ],
        totalCount: 1,
        pageKey: null
      };

      const mockImageResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockImageResponse);

      const alchemyService = AlchemyNFTService.getInstance();
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTResponse)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';

      // Load NFTs
      const nftResult = await alchemyService.getNFTsForOwner(testAddress);
      expect(nftResult.nfts).toHaveLength(1);

      // Load optimized image for first NFT
      const imageUrl = nftResult.nfts[0].image;
      const imageResult = await optimizedIPFSService.loadOptimizedImage(imageUrl);
      
      expect(imageResult.url).toContain('rose-accepted-puma-897.mypinata.cloud');
      expect(imageResult.loadTime).toBeGreaterThan(0);
    });

    it('should handle error scenarios gracefully', async () => {
      // Mock failed responses
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      };

      const alchemyService = AlchemyNFTService.getInstance();
      (alchemyService as any).alchemy = mockAlchemy;

      const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';

      // Should handle Alchemy API errors
      await expect(alchemyService.getNFTsForOwner(testAddress)).rejects.toThrow();

      // Should handle IPFS errors
      (fetch as any).mockRejectedValue(new Error('Network error'));
      
      await expect(
        optimizedIPFSService.loadOptimizedImage('ipfs://QmInvalidHash')
      ).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      // Test image loading performance
      const startTime = Date.now();
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);
      const duration = Date.now() - startTime;

      // Should load within 500ms (excluding network latency in tests)
      expect(duration).toBeLessThan(500);
    });

    it('should demonstrate cache performance improvement', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      // First load (uncached)
      const startTime1 = Date.now();
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);
      const uncachedDuration = Date.now() - startTime1;

      // Second load (cached)
      const startTime2 = Date.now();
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);
      const cachedDuration = Date.now() - startTime2;

      // Cached load should be at least 50% faster
      expect(cachedDuration).toBeLessThan(uncachedDuration * 0.5);
    });
  });
});
