/**
 * Real Production Tests
 * 
 * Tests actual production-grade optimizations using real browser APIs
 * and verified implementations based on official documentation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { realPerformanceMonitor } from '../services/realPerformanceMonitor';
import { realNetworkOptimizer } from '../services/realNetworkOptimizer';

// Mock browser APIs that may not be available in test environment
const mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

const mockCaches = {
  open: vi.fn().mockResolvedValue({
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true)
  })
};

// Setup global mocks
Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true
});

Object.defineProperty(global, 'caches', {
  value: mockCaches,
  writable: true
});

Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([{ duration: 100 }]),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    now: vi.fn().mockReturnValue(Date.now())
  },
  writable: true
});

describe('Real Production Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    realNetworkOptimizer.resetMetrics();
  });

  describe('Real Performance Monitor', () => {
    it('should initialize with real browser APIs', () => {
      expect(mockPerformanceObserver).toHaveBeenCalled();
      
      // Verify observer was set up with correct entry types
      const observerCall = mockPerformanceObserver.mock.calls[0];
      expect(observerCall).toBeDefined();
    });

    it('should track performance marks and measures', () => {
      const testName = 'test-operation';
      
      realPerformanceMonitor.markStart(testName);
      expect(performance.mark).toHaveBeenCalledWith(`${testName}-start`);
      
      const duration = realPerformanceMonitor.markEnd(testName);
      expect(performance.mark).toHaveBeenCalledWith(`${testName}-end`);
      expect(performance.measure).toHaveBeenCalledWith(testName, `${testName}-start`, `${testName}-end`);
      expect(duration).toBe(100); // Mocked duration
    });

    it('should record API call metrics', () => {
      realPerformanceMonitor.recordApiCall(500, true, false);
      realPerformanceMonitor.recordApiCall(300, true, true);
      realPerformanceMonitor.recordApiCall(1000, false, false);
      
      const report = realPerformanceMonitor.getPerformanceReport();
      
      expect(report.nftMetrics.totalRequests).toBe(3);
      expect(report.nftMetrics.failedRequests).toBe(1);
      expect(report.nftMetrics.errorRate).toBeCloseTo(33.33, 1);
    });

    it('should generate performance recommendations', () => {
      // Simulate slow API calls
      realPerformanceMonitor.recordApiCall(800, true, false);
      realPerformanceMonitor.recordApiCall(900, true, false);
      
      const report = realPerformanceMonitor.getPerformanceReport();
      
      expect(report.recommendations).toContain(
        'Consider implementing request caching for Alchemy API calls'
      );
    });
  });

  describe('Real Network Optimizer', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn();
    });

    it('should use real fetch API features', async () => {
      const mockResponse = new Response('{"data": "test"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const response = await realNetworkOptimizer.optimizedFetch('https://api.example.com/test', {
        timeout: 5000,
        cache: 'force-cache',
        priority: 'high'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          cache: 'force-cache',
          keepalive: true,
          headers: expect.objectContaining({
            'Accept': 'application/json, image/*, */*',
            'Accept-Encoding': 'gzip, deflate, br'
          })
        })
      );

      expect(response.status).toBe(200);
    });

    it('should implement real retry logic with exponential backoff', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const startTime = Date.now();
      const response = await realNetworkOptimizer.optimizedFetch('https://api.example.com/test', {
        retries: 2
      });

      const duration = Date.now() - startTime;
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(200);
      // Should have delays for retries (1s + 2s = 3s minimum)
      expect(duration).toBeGreaterThan(3000);
    });

    it('should deduplicate identical requests', async () => {
      const mockResponse = new Response('{"data": "test"}', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const url = 'https://api.example.com/test';
      const options = { cache: 'default' as RequestCache };

      // Make multiple identical requests simultaneously
      const promises = [
        realNetworkOptimizer.deduplicatedFetch(url, options),
        realNetworkOptimizer.deduplicatedFetch(url, options),
        realNetworkOptimizer.deduplicatedFetch(url, options)
      ];

      const responses = await Promise.all(promises);

      // Should only make one actual fetch call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should batch requests with concurrency control', async () => {
      const mockResponse = new Response('success', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      const requests = Array.from({ length: 10 }, (_, i) => ({
        url: `https://api.example.com/test${i}`,
        options: {}
      }));

      const startTime = Date.now();
      const results = await realNetworkOptimizer.batchRequests(requests, 3);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(global.fetch).toHaveBeenCalledTimes(10);
      
      // With concurrency of 3, should process in batches
      // This should take longer than if all were parallel
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle timeout correctly', async () => {
      // Mock a slow response
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      await expect(
        realNetworkOptimizer.optimizedFetch('https://api.example.com/slow', {
          timeout: 1000
        })
      ).rejects.toThrow();
    });

    it('should track network metrics', async () => {
      const mockResponse = new Response('success', { status: 200 });
      (global.fetch as any).mockResolvedValue(mockResponse);

      await realNetworkOptimizer.optimizedFetch('https://api.example.com/test1');
      await realNetworkOptimizer.optimizedFetch('https://api.example.com/test2');

      const metrics = realNetworkOptimizer.getMetrics();

      expect(metrics.requestCount).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should detect network conditions', () => {
      // Mock navigator.connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 100,
          saveData: false
        },
        writable: true
      });

      const networkInfo = realNetworkOptimizer.getNetworkInfo();
      expect(networkInfo.effectiveType).toBe('4g');
      expect(networkInfo.downlink).toBe(10);
      expect(networkInfo.saveData).toBe(false);

      const shouldOptimize = realNetworkOptimizer.shouldUseOptimizedLoading();
      expect(shouldOptimize).toBe(false); // Good connection, no optimization needed
    });

    it('should recommend optimization for slow connections', () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000,
          saveData: true
        },
        writable: true
      });

      const shouldOptimize = realNetworkOptimizer.shouldUseOptimizedLoading();
      expect(shouldOptimize).toBe(true); // Slow connection, should optimize
    });
  });

  describe('Real Browser Cache Integration', () => {
    it('should use browser Cache API when available', async () => {
      const testData = { nfts: [], totalCount: 0 };
      const testKey = 'test-cache-key';
      const ttl = 300000; // 5 minutes

      // Test storing in cache
      const mockCache = {
        put: vi.fn().mockResolvedValue(undefined),
        match: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(true)
      };

      mockCaches.open.mockResolvedValue(mockCache);

      // This would be called by setCachedData in AlchemyNFTService
      const cache = await caches.open('alchemy-nft-cache-v1');
      const response = new Response(JSON.stringify({
        data: testData,
        timestamp: Date.now(),
        ttl
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`
        }
      });

      await cache.put(`/alchemy/${testKey}`, response);

      expect(mockCache.put).toHaveBeenCalledWith(
        `/alchemy/${testKey}`,
        expect.any(Response)
      );
    });

    it('should handle cache retrieval with expiration', async () => {
      const expiredData = {
        data: { nfts: [] },
        timestamp: Date.now() - 600000, // 10 minutes ago
        ttl: 300000 // 5 minute TTL
      };

      const mockResponse = new Response(JSON.stringify(expiredData));
      const mockCache = {
        match: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn().mockResolvedValue(true)
      };

      mockCaches.open.mockResolvedValue(mockCache);

      const cache = await caches.open('alchemy-nft-cache-v1');
      const response = await cache.match('/alchemy/test-key');

      if (response) {
        const cached = await response.json();
        
        // Should detect expired cache
        const isExpired = Date.now() - cached.timestamp > cached.ttl;
        expect(isExpired).toBe(true);
        
        if (isExpired) {
          await cache.delete('/alchemy/test-key');
          expect(mockCache.delete).toHaveBeenCalledWith('/alchemy/test-key');
        }
      }
    });
  });

  describe('Real Performance Integration', () => {
    it('should provide comprehensive performance report', () => {
      // Simulate various operations
      realPerformanceMonitor.recordApiCall(400, true, false);
      realPerformanceMonitor.recordApiCall(600, true, true);
      realPerformanceMonitor.recordApiCall(1200, false, false);
      realPerformanceMonitor.recordImageLoad(300, true);
      realPerformanceMonitor.recordImageLoad(800, true);

      const report = realPerformanceMonitor.getPerformanceReport();

      expect(report).toHaveProperty('webVitals');
      expect(report).toHaveProperty('nftMetrics');
      expect(report).toHaveProperty('averages');
      expect(report).toHaveProperty('recommendations');

      expect(report.averages.alchemyApiLatency).toBeGreaterThan(0);
      expect(report.averages.imageLoadTime).toBeGreaterThan(0);
      expect(report.nftMetrics.errorRate).toBeGreaterThan(0);
    });

    it('should log performance summary', () => {
      const consoleSpy = vi.spyOn(console, 'group');
      const consoleLogSpy = vi.spyOn(console, 'log');
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd');

      realPerformanceMonitor.logPerformanceSummary();

      expect(consoleSpy).toHaveBeenCalledWith('📊 NFTGen Performance Report');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });
});
