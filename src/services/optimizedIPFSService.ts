/**
 * Optimized IPFS Service
 * 
 * Enhanced IPFS gateway management with performance optimization,
 * automatic failover, and progressive loading capabilities.
 */

interface IPFSGateway {
  url: string;
  priority: number;
  latency: number;
  successRate: number;
  lastTested: number;
  isAvailable: boolean;
}

interface ImageLoadOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  progressive?: boolean;
}

interface LoadResult {
  url: string;
  gateway: string;
  loadTime: number;
  cached: boolean;
  retryCount: number;
}

export class OptimizedIPFSService {
  private gateways: IPFSGateway[] = [
    {
      url: 'https://rose-accepted-puma-897.mypinata.cloud/ipfs',
      priority: 1,
      latency: 0,
      successRate: 1.0,
      lastTested: 0,
      isAvailable: true
    },
    {
      url: 'https://gateway.pinata.cloud/ipfs',
      priority: 2,
      latency: 0,
      successRate: 1.0,
      lastTested: 0,
      isAvailable: true
    },
    {
      url: 'https://ipfs.io/ipfs',
      priority: 3,
      latency: 0,
      successRate: 1.0,
      lastTested: 0,
      isAvailable: true
    },
    {
      url: 'https://cloudflare-ipfs.com/ipfs',
      priority: 4,
      latency: 0,
      successRate: 1.0,
      lastTested: 0,
      isAvailable: true
    }
  ];

  private imageCache = new Map<string, { url: string; timestamp: number; loadTime: number }>();
  private gatewayTestCache = new Map<string, { latency: number; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly GATEWAY_TEST_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly TIMEOUT_MS = 3000;

  /**
   * Validate IPFS hash format
   */
  validateIPFSHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') return false;
    
    // Check for test/placeholder hashes
    const testHashes = ['QmTest', 'QmPlaceholder', 'QmExample', 'test', 'placeholder'];
    if (testHashes.includes(hash.toLowerCase())) {
      console.warn(`⚠️ Test IPFS hash detected: ${hash}`);
      return false;
    }
    
    // Valid IPFS hash patterns
    const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/; // CIDv0
    const ipfsHashV1Regex = /^baf[a-z0-9]{56}$/; // CIDv1
    
    return ipfsHashRegex.test(hash) || ipfsHashV1Regex.test(hash);
  }

  /**
   * Extract IPFS hash from various URL formats
   */
  extractIPFSHash(url: string): string | null {
    if (!url) return null;

    // Handle direct hash
    if (this.validateIPFSHash(url)) return url;

    // Extract from various URL formats
    const patterns = [
      // ipfs:// protocol - Qm + 44 characters = 46 total
      /^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44})/,
      /^ipfs:\/\/(baf[a-z0-9]{56})/,
      // Gateway URLs with /ipfs/ path
      /\/ipfs\/(Qm[1-9A-HJ-NP-Za-km-z]{44})/,
      /\/ipfs\/(baf[a-z0-9]{56})/,
      // Direct hash in URL path
      /\/(Qm[1-9A-HJ-NP-Za-km-z]{44})(?:\/|$|\?)/,
      /\/(baf[a-z0-9]{56})(?:\/|$|\?)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && this.validateIPFSHash(match[1])) {
        return match[1];
      }
    }

    console.warn(`⚠️ Could not extract valid IPFS hash from: ${url}`);
    return null;
  }

  /**
   * Test gateway performance
   */
  private async testGateway(gateway: IPFSGateway, testHash: string = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'): Promise<number> {
    const cacheKey = `${gateway.url}_${testHash}`;
    const cached = this.gatewayTestCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.GATEWAY_TEST_TTL) {
      return cached.latency;
    }
    
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      const response = await fetch(`${gateway.url}/${testHash}`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const latency = Date.now() - startTime;
        gateway.latency = latency;
        gateway.isAvailable = true;
        gateway.lastTested = Date.now();
        
        this.gatewayTestCache.set(cacheKey, { latency, timestamp: Date.now() });
        
        console.log(`📊 Gateway ${gateway.url} latency: ${latency}ms`);
        return latency;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ Gateway ${gateway.url} test failed:`, error);
      gateway.isAvailable = false;
      gateway.lastTested = Date.now();
      return Infinity;
    }
  }

  /**
   * Get optimal gateway for IPFS hash
   */
  private async getOptimalGateway(ipfsHash: string): Promise<IPFSGateway> {
    // Test all available gateways in parallel
    const testPromises = this.gateways
      .filter(g => g.isAvailable)
      .map(async (gateway) => ({
        gateway,
        latency: await this.testGateway(gateway, ipfsHash)
      }));
    
    const results = await Promise.allSettled(testPromises);
    
    // Find the fastest available gateway
    const availableGateways = results
      .filter((result): result is PromiseFulfilledResult<{ gateway: IPFSGateway; latency: number }> => 
        result.status === 'fulfilled' && result.value.latency < Infinity
      )
      .sort((a, b) => a.value.latency - b.value.latency);
    
    if (availableGateways.length === 0) {
      console.warn('⚠️ No available IPFS gateways, using default');
      return this.gateways[0];
    }
    
    const optimal = availableGateways[0].value.gateway;
    console.log(`🎯 Selected optimal gateway: ${optimal.url} (${optimal.latency}ms)`);
    
    return optimal;
  }

  /**
   * Build optimized image URL with parameters
   * Based on official Pinata documentation: https://pinata.cloud/blog/how-to-optimize-images-with-ipfs-dedicated-gateways/
   */
  private buildImageURL(gateway: IPFSGateway, ipfsHash: string, options: ImageLoadOptions = {}): string {
    let url = `${gateway.url}/${ipfsHash}`;

    // Add optimization parameters for Pinata gateway (verified from official docs)
    if (gateway.url.includes('pinata')) {
      const params = new URLSearchParams();

      // Official Pinata image optimization parameters
      if (options.width) params.append('img-width', options.width.toString());
      if (options.height) params.append('img-height', options.height.toString());
      if (options.quality && options.quality >= 1 && options.quality <= 100) {
        params.append('img-quality', options.quality.toString());
      }
      if (options.format && ['webp', 'jpg', 'png'].includes(options.format)) {
        params.append('img-format', options.format);
      }

      // Add error fallback (official Pinata feature)
      params.append('onerror', 'redirect');

      // Disable animations for GIFs to reduce bandwidth (official feature)
      if (options.format !== 'gif') {
        params.append('img-anim', 'false');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  }

  /**
   * Load image with progressive enhancement and retry logic
   */
  async loadOptimizedImage(
    ipfsUrl: string,
    options: ImageLoadOptions = {}
  ): Promise<LoadResult> {
    const ipfsHash = this.extractIPFSHash(ipfsUrl);
    
    if (!ipfsHash) {
      throw new Error(`Invalid IPFS URL: ${ipfsUrl}`);
    }
    
    // Check cache first
    const cacheKey = `${ipfsHash}_${JSON.stringify(options)}`;
    const cached = this.imageCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`📋 Using cached image URL for ${ipfsHash}`);
      return {
        url: cached.url,
        gateway: 'cache',
        loadTime: cached.loadTime,
        cached: true,
        retryCount: 0
      };
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();
        
        // Get optimal gateway for this attempt
        const gateway = await this.getOptimalGateway(ipfsHash);
        const imageUrl = this.buildImageURL(gateway, ipfsHash, options);
        
        // Test image availability
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
        
        const response = await fetch(imageUrl, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'force-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const loadTime = Date.now() - startTime;
          
          // Cache successful result
          this.imageCache.set(cacheKey, {
            url: imageUrl,
            timestamp: Date.now(),
            loadTime
          });
          
          // Update gateway success rate
          gateway.successRate = Math.min(1.0, gateway.successRate + 0.1);
          
          console.log(`✅ Loaded optimized image: ${imageUrl} (${loadTime}ms, attempt ${attempt + 1})`);
          
          return {
            url: imageUrl,
            gateway: gateway.url,
            loadTime,
            cached: false,
            retryCount: attempt
          };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Image load attempt ${attempt + 1}/${this.MAX_RETRY_ATTEMPTS} failed:`, lastError.message);
        
        // Exponential backoff for retries
        if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
          const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to load image after ${this.MAX_RETRY_ATTEMPTS} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(ipfsUrls: string[], options: ImageLoadOptions = {}): Promise<void> {
    console.log(`🚀 Preloading ${ipfsUrls.length} images...`);
    
    const preloadPromises = ipfsUrls.map(async (url) => {
      try {
        await this.loadOptimizedImage(url, { ...options, width: 100 }); // Thumbnail size
      } catch (error) {
        console.warn(`⚠️ Preload failed for ${url}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    console.log(`✅ Preloading completed`);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    cacheSize: number;
    cacheHitRate: number;
    gatewayStats: Array<{ url: string; latency: number; successRate: number; isAvailable: boolean }>;
  } {
    const totalRequests = this.imageCache.size;
    const cacheHits = Array.from(this.imageCache.values()).filter(entry => 
      Date.now() - entry.timestamp < this.CACHE_TTL
    ).length;
    
    return {
      cacheSize: this.imageCache.size,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      gatewayStats: this.gateways.map(g => ({
        url: g.url,
        latency: g.latency,
        successRate: g.successRate,
        isAvailable: g.isAvailable
      }))
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    this.imageCache.clear();
    this.gatewayTestCache.clear();
    console.log('🧹 IPFS cache cleared');
  }
}

// Export singleton instance
export const optimizedIPFSService = new OptimizedIPFSService();
