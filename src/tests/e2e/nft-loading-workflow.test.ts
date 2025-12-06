/**
 * End-to-End NFT Loading Workflow Tests
 * 
 * Tests the complete NFT loading workflow from authentication
 * through NFT data retrieval to image optimization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlchemyNFTService } from '../../services/AlchemyNFTService';
import { optimizedIPFSService } from '../../services/optimizedIPFSService';

// Mock external dependencies
global.fetch = vi.fn();

describe('End-to-End NFT Loading Workflow', () => {
  let alchemyService: AlchemyNFTService;
  const testAddress = '0xbc4Fd558Cc896578c71f448afDDc132008491cED';

  beforeEach(() => {
    vi.clearAllMocks();
    alchemyService = AlchemyNFTService.getInstance();
    optimizedIPFSService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete NFT Gallery Loading', () => {
    it('should load NFT gallery with optimized images', async () => {
      // Mock Alchemy API response
      const mockNFTData = {
        ownedNfts: [
          {
            contract: { 
              address: '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
              name: 'Test Collection',
              symbol: 'TEST',
              tokenType: 'ERC1155'
            },
            tokenId: '1',
            title: 'Test NFT #1',
            description: 'A test NFT for performance testing',
            media: [{ 
              gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
              raw: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
            }],
            tokenType: 'ERC1155',
            tokenUri: { raw: 'ipfs://QmMetadataHash' },
            rawMetadata: {
              attributes: [
                { trait_type: 'Color', value: 'Blue' },
                { trait_type: 'Rarity', value: 'Common' }
              ],
              external_url: 'https://example.com'
            },
            timeLastUpdated: '2024-01-01T00:00:00Z',
            acquiredAt: {
              blockNumber: 12345,
              blockTimestamp: '2024-01-01T00:00:00Z'
            }
          },
          {
            contract: { 
              address: '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
              name: 'Test Collection',
              symbol: 'TEST',
              tokenType: 'ERC1155'
            },
            tokenId: '2',
            title: 'Test NFT #2',
            description: 'Another test NFT',
            media: [{ 
              gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmAnotherValidHash',
              raw: 'ipfs://QmAnotherValidHash'
            }],
            tokenType: 'ERC1155',
            tokenUri: { raw: 'ipfs://QmAnotherMetadataHash' },
            rawMetadata: {
              attributes: [
                { trait_type: 'Color', value: 'Red' },
                { trait_type: 'Rarity', value: 'Rare' }
              ]
            },
            timeLastUpdated: '2024-01-01T00:00:00Z'
          }
        ],
        totalCount: 2,
        pageKey: null
      };

      // Mock successful image responses
      const mockImageResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockImageResponse);

      // Mock Alchemy instance
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      // Step 1: Load NFTs from Alchemy
      const startTime = Date.now();
      const nftResult = await alchemyService.getNFTsForOwner(testAddress);
      const alchemyDuration = Date.now() - startTime;

      // Verify NFT data structure
      expect(nftResult.nfts).toHaveLength(2);
      expect(nftResult.totalCount).toBe(2);
      expect(nftResult.nfts[0]).toMatchObject({
        id: '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A-1',
        tokenId: '1',
        name: 'Test NFT #1',
        description: 'A test NFT for performance testing',
        owner: testAddress,
        tokenType: 'ERC1155'
      });

      // Step 2: Load optimized images for each NFT
      const imageLoadPromises = nftResult.nfts.map(async (nft) => {
        const imageStartTime = Date.now();
        const imageResult = await optimizedIPFSService.loadOptimizedImage(nft.image, {
          width: 400,
          height: 400,
          quality: 85,
          format: 'webp'
        });
        const imageDuration = Date.now() - imageStartTime;

        return {
          nftId: nft.id,
          imageResult,
          loadTime: imageDuration
        };
      });

      const imageResults = await Promise.all(imageLoadPromises);

      // Verify image optimization
      imageResults.forEach((result) => {
        expect(result.imageResult.url).toContain('rose-accepted-puma-897.mypinata.cloud');
        expect(result.imageResult.url).toContain('img-width=400');
        expect(result.imageResult.url).toContain('img-format=webp');
        expect(result.loadTime).toBeLessThan(1000); // Should load within 1 second
      });

      // Performance assertions
      expect(alchemyDuration).toBeLessThan(2000); // Alchemy API should respond within 2 seconds
      console.log(`📊 Complete workflow performance:
        - Alchemy API: ${alchemyDuration}ms
        - Image loading: ${imageResults.map(r => r.loadTime).join('ms, ')}ms
        - Total NFTs: ${nftResult.nfts.length}
        - Cache hits: ${imageResults.filter(r => r.imageResult.cached).length}`);
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Mock partial success scenario
      const mockNFTData = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Valid NFT' },
            tokenId: '1',
            title: 'Valid NFT',
            media: [{ gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmValidHash' }],
            tokenType: 'ERC721'
          },
          {
            contract: { address: '0x456', name: 'Invalid NFT' },
            tokenId: '2',
            title: 'Invalid NFT',
            media: [{ gateway: 'ipfs://QmTest' }], // Invalid test hash
            tokenType: 'ERC721'
          }
        ],
        totalCount: 2,
        pageKey: null
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      // Mock image responses - first succeeds, second fails
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Invalid hash'));

      const nftResult = await alchemyService.getNFTsForOwner(testAddress);
      expect(nftResult.nfts).toHaveLength(2);

      // Try to load images
      const imageResults = await Promise.allSettled(
        nftResult.nfts.map(nft => 
          optimizedIPFSService.loadOptimizedImage(nft.image)
        )
      );

      // First should succeed, second should fail
      expect(imageResults[0].status).toBe('fulfilled');
      expect(imageResults[1].status).toBe('rejected');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent NFT loading efficiently', async () => {
      const mockNFTData = {
        ownedNfts: Array.from({ length: 10 }, (_, i) => ({
          contract: { address: '0x123', name: 'Test Collection' },
          tokenId: i.toString(),
          title: `NFT #${i}`,
          media: [{ gateway: `https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmHash${i}` }],
          tokenType: 'ERC721'
        })),
        totalCount: 10,
        pageKey: null
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      // Mock successful image responses
      (fetch as any).mockResolvedValue({ ok: true, status: 200 });

      // Load multiple NFT collections concurrently
      const addresses = [
        '0xAddress1',
        '0xAddress2',
        '0xAddress3'
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        addresses.map(address => alchemyService.getNFTsForOwner(address))
      );
      const totalDuration = Date.now() - startTime;

      // Verify all results
      results.forEach(result => {
        expect(result.nfts).toHaveLength(10);
      });

      // Should complete within reasonable time even with multiple requests
      expect(totalDuration).toBeLessThan(5000);
      console.log(`📊 Concurrent loading performance: ${totalDuration}ms for ${addresses.length} addresses`);
    });

    it('should demonstrate cache effectiveness', async () => {
      const mockNFTData = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Test NFT' },
            tokenId: '1',
            title: 'Cached NFT',
            media: [{ gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmCachedHash' }],
            tokenType: 'ERC721'
          }
        ],
        totalCount: 1,
        pageKey: null
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockNFTData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      (fetch as any).mockResolvedValue({ ok: true, status: 200 });

      // First load (uncached)
      const startTime1 = Date.now();
      const result1 = await alchemyService.getNFTsForOwner(testAddress);
      const duration1 = Date.now() - startTime1;

      // Second load (should be cached)
      const startTime2 = Date.now();
      const result2 = await alchemyService.getNFTsForOwner(testAddress);
      const duration2 = Date.now() - startTime2;

      // Verify cache effectiveness
      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1 * 0.1); // Cached should be 90% faster
      expect(mockAlchemy.nft.getNftsForOwner).toHaveBeenCalledTimes(1); // Only called once

      console.log(`📊 Cache performance: Uncached: ${duration1}ms, Cached: ${duration2}ms`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      const mockNFTData = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Resilient NFT' },
            tokenId: '1',
            title: 'Test NFT',
            media: [{ gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmTestHash' }],
            tokenType: 'ERC721'
          }
        ],
        totalCount: 1,
        pageKey: null
      };

      // Mock Alchemy to fail twice, then succeed
      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn()
            .mockRejectedValueOnce(new Error('Network timeout'))
            .mockRejectedValueOnce(new Error('Service unavailable'))
            .mockResolvedValueOnce(mockNFTData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      // Should eventually succeed despite initial failures
      const result = await alchemyService.getNFTsForOwner(testAddress);
      expect(result.nfts).toHaveLength(1);
      expect(mockAlchemy.nft.getNftsForOwner).toHaveBeenCalledTimes(3);
    });

    it('should handle gateway failures gracefully', async () => {
      // Mock image loading with gateway failures
      (fetch as any)
        .mockRejectedValueOnce(new Error('Gateway 1 failed'))
        .mockRejectedValueOnce(new Error('Gateway 2 failed'))
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Gateway 3 succeeds

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      const result = await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);

      expect(result.url).toContain(testHash);
      expect(result.retryCount).toBe(2); // Should have retried twice
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle empty NFT collections', async () => {
      const mockEmptyData = {
        ownedNfts: [],
        totalCount: 0,
        pageKey: null
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockEmptyData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      const result = await alchemyService.getNFTsForOwner(testAddress);
      expect(result.nfts).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle large NFT collections with pagination', async () => {
      const mockPagedData = {
        ownedNfts: Array.from({ length: 100 }, (_, i) => ({
          contract: { address: '0x123', name: 'Large Collection' },
          tokenId: i.toString(),
          title: `NFT #${i}`,
          media: [{ gateway: `https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmHash${i}` }],
          tokenType: 'ERC721'
        })),
        totalCount: 250,
        pageKey: 'next-page-key'
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockPagedData)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      const result = await alchemyService.getNFTsForOwner(testAddress, { pageSize: 100 });
      
      expect(result.nfts).toHaveLength(100);
      expect(result.totalCount).toBe(250);
      expect(result.pageKey).toBe('next-page-key');
    });

    it('should maintain performance with metadata-heavy NFTs', async () => {
      const mockComplexNFT = {
        ownedNfts: [
          {
            contract: { address: '0x123', name: 'Complex Collection' },
            tokenId: '1',
            title: 'Complex NFT with Rich Metadata',
            description: 'A very detailed NFT with extensive metadata and attributes',
            media: [{ gateway: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmComplexHash' }],
            tokenType: 'ERC721',
            rawMetadata: {
              attributes: Array.from({ length: 50 }, (_, i) => ({
                trait_type: `Trait ${i}`,
                value: `Value ${i}`,
                display_type: i % 3 === 0 ? 'number' : 'string'
              })),
              external_url: 'https://example.com',
              animation_url: 'https://example.com/animation.mp4',
              background_color: '#FF0000'
            }
          }
        ],
        totalCount: 1,
        pageKey: null
      };

      const mockAlchemy = {
        nft: {
          getNftsForOwner: vi.fn().mockResolvedValue(mockComplexNFT)
        }
      };
      (alchemyService as any).alchemy = mockAlchemy;

      const startTime = Date.now();
      const result = await alchemyService.getNFTsForOwner(testAddress);
      const duration = Date.now() - startTime;

      expect(result.nfts[0].metadata.attributes).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should handle complex metadata efficiently
    });
  });
});
