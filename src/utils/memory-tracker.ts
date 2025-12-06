/**
 * Memory Usage Tracker and Leak Detection for NFTGen
 * 
 * Tracks memory usage patterns, detects potential leaks,
 * and provides real-time monitoring for the NFTGen application
 */

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

interface MemoryLeak {
  detected: number;
  growth: number;
  duration: number;
  snapshots: MemorySnapshot[];
}

class MemoryTracker {
  private snapshots: MemorySnapshot[] = [];
  private leaks: MemoryLeak[] = [];
  private isTracking = false;
  private trackingInterval: NodeJS.Timeout | null = null;
  private baselineSnapshot: MemorySnapshot | null = null;
  
  // Configuration
  private readonly maxSnapshots = 200;
  private readonly trackingIntervalMs = 10000; // 10 seconds
  private readonly leakThreshold = 50 * 1024 * 1024; // 50MB
  private readonly leakDetectionWindow = 5; // 5 snapshots
  
  constructor() {
    this.initialize();
  }

  /**
   * Initialize memory tracking
   */
  private initialize(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      console.log('🧠 Browser memory tracking available');
    } else {
      console.log('🧠 Memory tracking initialized (limited browser support)');
    }
  }

  /**
   * Start memory tracking
   */
  startTracking(): void {
    if (this.isTracking) {
      console.warn('⚠️ Memory tracking already running');
      return;
    }

    this.isTracking = true;
    this.baselineSnapshot = this.takeSnapshot();
    
    console.log('🧠 Starting NFTGen memory tracking...');
    
    // Take initial snapshot
    this.recordSnapshot();
    
    // Start periodic tracking
    this.trackingInterval = setInterval(() => {
      this.recordSnapshot();
      this.detectLeaks();
    }, this.trackingIntervalMs);
    
    console.log('✅ Memory tracking started');
  }

  /**
   * Stop memory tracking
   */
  stopTracking(): void {
    if (!this.isTracking) {
      console.warn('⚠️ Memory tracking not running');
      return;
    }

    this.isTracking = false;
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    console.log('🛑 Memory tracking stopped');
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): MemorySnapshot {
    const timestamp = Date.now();
    
    // Try to get browser memory info
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        timestamp,
        heapUsed: memory.usedJSHeapSize || 0,
        heapTotal: memory.totalJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
        rss: memory.totalJSHeapSize || 0
      };
    }
    
    // Fallback for environments without performance.memory
    return {
      timestamp,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      rss: 0
    };
  }

  /**
   * Record a memory snapshot
   */
  private recordSnapshot(): void {
    const snapshot = this.takeSnapshot();
    this.snapshots.push(snapshot);
    
    // Limit snapshots to prevent memory issues
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    // Log memory usage
    if (snapshot.heapUsed > 0) {
      console.log(`🧠 Memory: ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)}MB heap, ${(snapshot.heapTotal / 1024 / 1024).toFixed(2)}MB total`);
    }
  }

  /**
   * Detect memory leaks
   */
  private detectLeaks(): void {
    if (this.snapshots.length < this.leakDetectionWindow) {
      return;
    }

    const recentSnapshots = this.snapshots.slice(-this.leakDetectionWindow);
    const firstSnapshot = recentSnapshots[0];
    const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];
    
    const growth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
    const duration = lastSnapshot.timestamp - firstSnapshot.timestamp;
    
    // Check if growth exceeds threshold
    if (growth > this.leakThreshold) {
      const leak: MemoryLeak = {
        detected: Date.now(),
        growth,
        duration,
        snapshots: [...recentSnapshots]
      };
      
      this.leaks.push(leak);
      
      console.warn(`⚠️ Potential memory leak detected!`);
      console.warn(`📈 Growth: +${(growth / 1024 / 1024).toFixed(2)}MB over ${(duration / 1000).toFixed(1)}s`);
      
      // Emit custom event for monitoring
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('memoryLeak', {
          detail: leak
        }));
      }
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): MemorySnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get memory usage trend
   */
  getUsageTrend(minutes: number = 5): MemorySnapshot[] {
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    return this.snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  /**
   * Get detected leaks
   */
  getDetectedLeaks(): MemoryLeak[] {
    return [...this.leaks];
  }

  /**
   * Get memory statistics
   */
  getStatistics(): {
    current: MemorySnapshot | null;
    baseline: MemorySnapshot | null;
    growth: number;
    averageUsage: number;
    peakUsage: number;
    leakCount: number;
    isTracking: boolean;
  } {
    const current = this.getCurrentUsage();
    const baseline = this.baselineSnapshot;
    
    let growth = 0;
    if (current && baseline) {
      growth = current.heapUsed - baseline.heapUsed;
    }
    
    const averageUsage = this.snapshots.length > 0 
      ? this.snapshots.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0) / this.snapshots.length
      : 0;
    
    const peakUsage = this.snapshots.length > 0
      ? Math.max(...this.snapshots.map(snapshot => snapshot.heapUsed))
      : 0;
    
    return {
      current,
      baseline,
      growth,
      averageUsage,
      peakUsage,
      leakCount: this.leaks.length,
      isTracking: this.isTracking
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      console.log('🗑️ Forcing garbage collection...');
      (window as any).gc();
    } else {
      console.log('🗑️ Garbage collection not available in this environment');
    }
  }

  /**
   * Clear tracking data
   */
  clearData(): void {
    this.snapshots = [];
    this.leaks = [];
    this.baselineSnapshot = null;
    console.log('🧹 Memory tracking data cleared');
  }

  /**
   * Export tracking data for analysis
   */
  exportData(): {
    snapshots: MemorySnapshot[];
    leaks: MemoryLeak[];
    statistics: ReturnType<typeof this.getStatistics>;
  } {
    return {
      snapshots: [...this.snapshots],
      leaks: [...this.leaks],
      statistics: this.getStatistics()
    };
  }

  /**
   * Get memory usage summary
   */
  getSummary(): string {
    const stats = this.getStatistics();
    const current = stats.current;
    
    if (!current) {
      return 'Memory tracking not available';
    }
    
    const currentMB = (current.heapUsed / 1024 / 1024).toFixed(2);
    const growthMB = (stats.growth / 1024 / 1024).toFixed(2);
    const peakMB = (stats.peakUsage / 1024 / 1024).toFixed(2);
    
    return `Memory: ${currentMB}MB current, ${growthMB}MB growth, ${peakMB}MB peak, ${stats.leakCount} leaks detected`;
  }
}

// Export singleton instance
export const memoryTracker = new MemoryTracker();
export default memoryTracker;
