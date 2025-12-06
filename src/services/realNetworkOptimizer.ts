/**
 * Real Network Optimizer
 * 
 * Production-grade network optimization using modern Fetch API features
 * Based on official MDN documentation and browser performance best practices
 */

interface RequestConfig {
  timeout?: number;
  retries?: number;
  cache?: RequestCache;
  priority?: 'high' | 'low' | 'auto';
  signal?: AbortSignal;
}

interface NetworkMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  cacheHitCount: number;
}

export class RealNetworkOptimizer {
  private metrics: NetworkMetrics = {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    averageLatency: 0,
    cacheHitCount: 0
  };

  private latencies: number[] = [];
  private requestQueue: Map<string, Promise<any>> = new Map();

  /**
   * Optimized fetch with real browser features
   * Based on: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   */
  async optimizedFetch(url: string, options: RequestInit & RequestConfig = {}): Promise<Response> {
    const {
      timeout = 10000,
      retries = 2,
      cache = 'default',
      priority = 'auto',
      ...fetchOptions
    } = options;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine signals if provided
    const signal = options.signal 
      ? this.combineAbortSignals([controller.signal, options.signal])
      : controller.signal;

    const startTime = performance.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.metrics.requestCount++;

        // Use modern fetch features
        const response = await fetch(url, {
          ...fetchOptions,
          signal,
          cache,
          // Use priority hint if supported
          ...(('priority' in Request.prototype) && { priority }),
          // Enable keepalive for better connection reuse
          keepalive: true,
          // Set appropriate headers
          headers: {
            'Accept': 'application/json, image/*, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': cache === 'force-cache' ? 'max-age=3600' : 'no-cache',
            ...fetchOptions.headers
          }
        });

        clearTimeout(timeoutId);

        // Record metrics
        const latency = performance.now() - startTime;
        this.recordLatency(latency);

        if (response.ok) {
          this.metrics.successCount++;
          
          // Check if response came from cache
          if (response.headers.get('cf-cache-status') === 'HIT' || 
              response.headers.get('x-cache') === 'HIT') {
            this.metrics.cacheHitCount++;
          }

          return response;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        lastError = error as Error;
        this.metrics.failureCount++;

        // Don't retry on abort or certain errors
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        // Exponential backoff for retries
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await this.delay(delay);
          console.warn(`Retry ${attempt + 1}/${retries} for ${url} after ${delay}ms`);
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Request deduplication - prevent duplicate requests
   */
  async deduplicatedFetch(url: string, options: RequestInit & RequestConfig = {}): Promise<Response> {
    const key = `${url}:${JSON.stringify(options)}`;
    
    // Return existing promise if request is already in flight
    if (this.requestQueue.has(key)) {
      console.log(`🔄 Deduplicating request: ${url}`);
      return this.requestQueue.get(key)!;
    }

    // Create new request
    const requestPromise = this.optimizedFetch(url, options);
    this.requestQueue.set(key, requestPromise);

    try {
      const response = await requestPromise;
      return response;
    } finally {
      // Clean up after request completes
      this.requestQueue.delete(key);
    }
  }

  /**
   * Batch multiple requests with concurrency control
   */
  async batchRequests<T>(
    requests: Array<{ url: string; options?: RequestInit & RequestConfig }>,
    maxConcurrency: number = 6
  ): Promise<Array<Response | Error>> {
    const results: Array<Response | Error> = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async ({ url, options }) => {
        try {
          return await this.deduplicatedFetch(url, options);
        } catch (error) {
          return error as Error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Preload critical resources
   */
  preloadResource(url: string, type: 'image' | 'fetch' = 'fetch'): void {
    if ('HTMLLinkElement' in window) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      if (type === 'image') {
        link.as = 'image';
      } else {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
      console.log(`🚀 Preloading resource: ${url}`);
    }
  }

  /**
   * Prefetch resources for future use
   */
  prefetchResource(url: string): void {
    if ('HTMLLinkElement' in window) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
      console.log(`📦 Prefetching resource: ${url}`);
    }
  }

  /**
   * Check network connection quality
   * Based on: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
   */
  getNetworkInfo(): {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } {
    const nav = navigator as any;
    
    if ('connection' in nav) {
      const connection = nav.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return {};
  }

  /**
   * Adaptive loading based on network conditions
   */
  shouldUseOptimizedLoading(): boolean {
    const networkInfo = this.getNetworkInfo();
    
    // Use optimized loading for slow connections or data saver mode
    if (networkInfo.saveData) return true;
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') return true;
    if (networkInfo.downlink && networkInfo.downlink < 1.5) return true;
    
    return false;
  }

  /**
   * Combine multiple abort signals
   */
  private combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', () => controller.abort());
      }
    });
    
    return controller.signal;
  }

  /**
   * Record latency for metrics
   */
  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    
    // Keep only last 100 measurements
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
    
    // Update average
    this.metrics.averageLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get network performance metrics
   */
  getMetrics(): NetworkMetrics & {
    successRate: number;
    cacheHitRate: number;
    networkInfo: ReturnType<typeof this.getNetworkInfo>;
  } {
    const successRate = this.metrics.requestCount > 0 
      ? (this.metrics.successCount / this.metrics.requestCount) * 100 
      : 0;
      
    const cacheHitRate = this.metrics.requestCount > 0
      ? (this.metrics.cacheHitCount / this.metrics.requestCount) * 100
      : 0;

    return {
      ...this.metrics,
      successRate,
      cacheHitRate,
      networkInfo: this.getNetworkInfo()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageLatency: 0,
      cacheHitCount: 0
    };
    this.latencies = [];
  }
}

// Export singleton instance
export const realNetworkOptimizer = new RealNetworkOptimizer();
