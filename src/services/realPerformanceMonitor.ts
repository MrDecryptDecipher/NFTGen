/**
 * Real Performance Monitor
 * 
 * Production-grade performance monitoring using native Web Performance APIs
 * Based on official W3C Performance API specification and Web Vitals
 */

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface WebVitalsMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
}

interface NFTLoadMetrics {
  alchemyApiLatency: number[];
  imageLoadTimes: number[];
  cacheHitRate: number;
  errorRate: number;
  totalRequests: number;
  failedRequests: number;
}

export class RealPerformanceMonitor {
  private metrics: NFTLoadMetrics = {
    alchemyApiLatency: [],
    imageLoadTimes: [],
    cacheHitRate: 0,
    errorRate: 0,
    totalRequests: 0,
    failedRequests: 0
  };

  private webVitals: WebVitalsMetrics = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializePerformanceObserver();
    this.initializeWebVitalsTracking();
  }

  /**
   * Initialize Performance Observer for real-time monitoring
   * Based on: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
   */
  private initializePerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.processPerformanceEntry(entry);
          });
        });

        // Observe navigation, resource, and measure entries
        this.observer.observe({ 
          entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
        });

        console.log('✅ Real Performance Observer initialized');
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }

  /**
   * Initialize Web Vitals tracking
   * Based on: https://web.dev/vitals/
   */
  private initializeWebVitalsTracking(): void {
    // Track Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.webVitals.LCP = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP tracking not supported:', error);
      }

      // Track First Contentful Paint (FCP)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.webVitals.FCP = entry.startTime;
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP tracking not supported:', error);
      }
    }
  }

  /**
   * Process performance entries from the observer
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Track resource loading times (images, API calls)
    if (entry.entryType === 'resource') {
      const resourceName = entry.name;
      
      // Track Alchemy API calls
      if (resourceName.includes('alchemy.com') || resourceName.includes('eth-sepolia')) {
        this.metrics.alchemyApiLatency.push(entry.duration);
        this.metrics.totalRequests++;
        
        // Log slow API calls
        if (entry.duration > 700) {
          console.warn(`⚠️ Slow Alchemy API call: ${entry.duration.toFixed(0)}ms - ${resourceName}`);
        }
      }
      
      // Track IPFS image loading
      if (resourceName.includes('ipfs') || resourceName.includes('pinata')) {
        this.metrics.imageLoadTimes.push(entry.duration);
        
        // Log slow image loads
        if (entry.duration > 500) {
          console.warn(`⚠️ Slow image load: ${entry.duration.toFixed(0)}ms - ${resourceName}`);
        }
      }
    }

    // Track custom measurements
    if (entry.entryType === 'measure') {
      if (entry.name.startsWith('nft-load-')) {
        console.log(`📊 NFT Load Performance: ${entry.name} - ${entry.duration.toFixed(0)}ms`);
      }
    }
  }

  /**
   * Mark the start of a performance measurement
   */
  markStart(name: string): void {
    if ('performance' in window && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark the end of a performance measurement and calculate duration
   */
  markEnd(name: string): number {
    if ('performance' in window && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      // Get the measurement
      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        
        // Clean up marks
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
        
        return duration;
      }
    }
    return 0;
  }

  /**
   * Record API call performance
   */
  recordApiCall(duration: number, success: boolean, cached: boolean = false): void {
    this.metrics.totalRequests++;
    
    if (!success) {
      this.metrics.failedRequests++;
    }
    
    if (!cached) {
      this.metrics.alchemyApiLatency.push(duration);
    }
    
    // Update error rate
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
    
    // Update cache hit rate (simplified calculation)
    if (cached) {
      this.metrics.cacheHitRate = Math.min(100, this.metrics.cacheHitRate + 1);
    }
  }

  /**
   * Record image load performance
   */
  recordImageLoad(duration: number, success: boolean): void {
    if (success) {
      this.metrics.imageLoadTimes.push(duration);
    }
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    webVitals: WebVitalsMetrics;
    nftMetrics: NFTLoadMetrics;
    averages: {
      alchemyApiLatency: number;
      imageLoadTime: number;
    };
    recommendations: string[];
  } {
    const avgAlchemyLatency = this.metrics.alchemyApiLatency.length > 0
      ? this.metrics.alchemyApiLatency.reduce((a, b) => a + b, 0) / this.metrics.alchemyApiLatency.length
      : 0;

    const avgImageLoadTime = this.metrics.imageLoadTimes.length > 0
      ? this.metrics.imageLoadTimes.reduce((a, b) => a + b, 0) / this.metrics.imageLoadTimes.length
      : 0;

    const recommendations: string[] = [];

    // Generate recommendations based on real metrics
    if (avgAlchemyLatency > 700) {
      recommendations.push('Consider implementing request caching for Alchemy API calls');
    }
    
    if (avgImageLoadTime > 500) {
      recommendations.push('Implement progressive image loading and optimize image sizes');
    }
    
    if (this.metrics.errorRate > 5) {
      recommendations.push('Implement better error handling and retry logic');
    }
    
    if (this.webVitals.LCP && this.webVitals.LCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - consider lazy loading');
    }

    return {
      webVitals: this.webVitals,
      nftMetrics: this.metrics,
      averages: {
        alchemyApiLatency: Math.round(avgAlchemyLatency),
        imageLoadTime: Math.round(avgImageLoadTime)
      },
      recommendations
    };
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    const report = this.getPerformanceReport();
    
    console.group('📊 NFTGen Performance Report');
    console.log('Web Vitals:', report.webVitals);
    console.log('Average Alchemy API Latency:', `${report.averages.alchemyApiLatency}ms`);
    console.log('Average Image Load Time:', `${report.averages.imageLoadTime}ms`);
    console.log('Cache Hit Rate:', `${report.nftMetrics.cacheHitRate.toFixed(1)}%`);
    console.log('Error Rate:', `${report.nftMetrics.errorRate.toFixed(1)}%`);
    
    if (report.recommendations.length > 0) {
      console.log('Recommendations:', report.recommendations);
    }
    
    console.groupEnd();
  }

  /**
   * Clean up observers
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton instance
export const realPerformanceMonitor = new RealPerformanceMonitor();

// Auto-log performance summary every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    realPerformanceMonitor.logPerformanceSummary();
  }, 300000); // 5 minutes instead of 30 seconds
}
