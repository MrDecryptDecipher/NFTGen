/**
 * Basic Performance Tests
 * 
 * Simple tests to verify the optimized IPFS service and basic functionality
 * without complex dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { optimizedIPFSService } from '../services/optimizedIPFSService';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Basic Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optimizedIPFSService.clearCache();
  });

  describe('IPFS Hash Validation', () => {
    it('should validate correct IPFS hashes', () => {
      // Valid CIDv0 hash
      expect(optimizedIPFSService.validateIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
      
      // Valid CIDv1 hash
      expect(optimizedIPFSService.validateIPFSHash('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true);
    });

    it('should reject invalid IPFS hashes', () => {
      // Test hashes
      expect(optimizedIPFSService.validateIPFSHash('QmTest')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('QmPlaceholder')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('QmExample')).toBe(false);
      
      // Invalid formats
      expect(optimizedIPFSService.validateIPFSHash('invalid-hash')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('')).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash('Qm123')).toBe(false); // Too short
    });

    it('should handle null and undefined inputs', () => {
      expect(optimizedIPFSService.validateIPFSHash(null as any)).toBe(false);
      expect(optimizedIPFSService.validateIPFSHash(undefined as any)).toBe(false);
    });
  });

  describe('IPFS Hash Extraction', () => {
    const validHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

    it('should extract hash from various URL formats', () => {
      // Direct hash
      expect(optimizedIPFSService.extractIPFSHash(validHash)).toBe(validHash);
      
      // IPFS protocol
      expect(optimizedIPFSService.extractIPFSHash(`ipfs://${validHash}`)).toBe(validHash);
      
      // Gateway URLs
      expect(optimizedIPFSService.extractIPFSHash(`https://ipfs.io/ipfs/${validHash}`)).toBe(validHash);
      expect(optimizedIPFSService.extractIPFSHash(`https://gateway.pinata.cloud/ipfs/${validHash}`)).toBe(validHash);
      expect(optimizedIPFSService.extractIPFSHash(`https://rose-accepted-puma-897.mypinata.cloud/ipfs/${validHash}`)).toBe(validHash);
    });

    it('should return null for invalid URLs', () => {
      expect(optimizedIPFSService.extractIPFSHash('https://example.com/invalid')).toBe(null);
      expect(optimizedIPFSService.extractIPFSHash('not-a-url')).toBe(null);
      expect(optimizedIPFSService.extractIPFSHash('')).toBe(null);
      expect(optimizedIPFSService.extractIPFSHash('ipfs://QmTest')).toBe(null); // Invalid test hash
    });
  });

  describe('Image Loading with Caching', () => {
    const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const testUrl = `ipfs://${testHash}`;

    it('should load image successfully', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl);
      
      expect(result.url).toContain(testHash);
      expect(result.cached).toBe(false);
      expect(result.loadTime).toBeGreaterThan(0);
      expect(result.retryCount).toBe(0);
    });

    it('should use cache on second load', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      // First load
      const result1 = await optimizedIPFSService.loadOptimizedImage(testUrl);
      expect(result1.cached).toBe(false);

      // Second load should be cached
      const result2 = await optimizedIPFSService.loadOptimizedImage(testUrl);
      expect(result2.cached).toBe(true);
      expect(result2.loadTime).toBeLessThan(result1.loadTime);
    });

    it('should handle network failures with retry', async () => {
      // Mock first call to fail, second to succeed
      (fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl);
      
      expect(result.retryCount).toBe(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (fetch as any).mockRejectedValue(new Error('Persistent error'));

      await expect(optimizedIPFSService.loadOptimizedImage(testUrl)).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Image Optimization Parameters', () => {
    const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const testUrl = `ipfs://${testHash}`;

    it('should add optimization parameters for Pinata gateway', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl, {
        width: 400,
        height: 300,
        quality: 85,
        format: 'webp'
      });

      // Should use Pinata gateway with optimization parameters
      expect(result.url).toContain('pinata');
      expect(result.url).toContain('img-width=400');
      expect(result.url).toContain('img-height=300');
      expect(result.url).toContain('img-quality=85');
      expect(result.url).toContain('img-format=webp');
    });

    it('should work without optimization parameters', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await optimizedIPFSService.loadOptimizedImage(testUrl);
      
      expect(result.url).toContain(testHash);
      expect(result.loadTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Statistics', () => {
    it('should provide performance statistics', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);

      const stats = optimizedIPFSService.getPerformanceStats();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('gatewayStats');
      
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.gatewayStats).toHaveLength(4); // 4 default gateways
      expect(stats.gatewayStats[0]).toHaveProperty('url');
      expect(stats.gatewayStats[0]).toHaveProperty('latency');
      expect(stats.gatewayStats[0]).toHaveProperty('successRate');
      expect(stats.gatewayStats[0]).toHaveProperty('isAvailable');
    });

    it('should calculate cache hit rate correctly', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      // Load same image twice
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);

      const stats = optimizedIPFSService.getPerformanceStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid IPFS URLs gracefully', async () => {
      await expect(optimizedIPFSService.loadOptimizedImage('invalid-url')).rejects.toThrow('Invalid IPFS URL');
    });

    it('should handle empty URLs', async () => {
      await expect(optimizedIPFSService.loadOptimizedImage('')).rejects.toThrow('Invalid IPFS URL');
    });

    it('should handle test hashes', async () => {
      await expect(optimizedIPFSService.loadOptimizedImage('ipfs://QmTest')).rejects.toThrow('Invalid IPFS URL');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache correctly', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);

      let stats = optimizedIPFSService.getPerformanceStats();
      expect(stats.cacheSize).toBeGreaterThan(0);

      optimizedIPFSService.clearCache();

      stats = optimizedIPFSService.getPerformanceStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for image loading', async () => {
      const mockResponse = { ok: true, status: 200 };
      (fetch as any).mockResolvedValue(mockResponse);

      const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      const startTime = Date.now();
      await optimizedIPFSService.loadOptimizedImage(`ipfs://${testHash}`);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (excluding network latency in tests)
      expect(duration).toBeLessThan(1000);
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

      // Cached load should be significantly faster
      expect(cachedDuration).toBeLessThan(uncachedDuration);
    });
  });
});
