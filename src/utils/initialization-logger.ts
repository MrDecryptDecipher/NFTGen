/**
 * Initialization Logger
 * 
 * Comprehensive logging system to track initialization cycles and identify duplicate patterns
 * Helps debug performance issues and initialization bottlenecks
 */

interface InitializationEvent {
  timestamp: number;
  component: string;
  event: string;
  details?: any;
  duration?: number;
  stackTrace?: string;
}

interface InitializationMetrics {
  totalEvents: number;
  duplicateEvents: number;
  averageInitTime: number;
  slowestInit: InitializationEvent | null;
  fastestInit: InitializationEvent | null;
  componentCounts: Record<string, number>;
}

class InitializationLogger {
  private events: InitializationEvent[] = [];
  private startTimes: Map<string, number> = new Map();
  private isEnabled: boolean;
  private maxEvents: number = 1000; // Prevent memory leaks

  constructor() {
    this.isEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_INIT_LOGGING === 'true';
    
    if (this.isEnabled) {
      console.log('🔍 Initialization Logger enabled');
      this.logEvent('InitializationLogger', 'enabled', { 
        environment: import.meta.env.MODE,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Log an initialization event
   */
  logEvent(component: string, event: string, details?: any): void {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const stackTrace = this.isEnabled && import.meta.env.DEV ? new Error().stack : undefined;

    const initEvent: InitializationEvent = {
      timestamp,
      component,
      event,
      details,
      stackTrace
    };

    // Add to events array
    this.events.push(initEvent);

    // Prevent memory leaks by limiting stored events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console with appropriate styling
    const emoji = this.getEventEmoji(event);
    const color = this.getEventColor(event);
    
    console.log(
      `%c${emoji} [${component}] ${event}`,
      `color: ${color}; font-weight: bold;`,
      details || ''
    );

    // Check for duplicate events
    this.checkForDuplicates(component, event);
  }

  /**
   * Start timing an initialization process
   */
  startTiming(component: string, process: string): void {
    if (!this.isEnabled) return;

    const key = `${component}:${process}`;
    this.startTimes.set(key, Date.now());
    this.logEvent(component, `${process}_start`);
  }

  /**
   * End timing an initialization process
   */
  endTiming(component: string, process: string, details?: any): void {
    if (!this.isEnabled) return;

    const key = `${component}:${process}`;
    const startTime = this.startTimes.get(key);
    
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(key);
      
      this.logEvent(component, `${process}_complete`, {
        ...details,
        duration: `${duration}ms`
      });

      // Store duration in the event
      const lastEvent = this.events[this.events.length - 1];
      if (lastEvent) {
        lastEvent.duration = duration;
      }

      // Warn about slow initialization
      if (duration > 1000) {
        console.warn(`⚠️ Slow initialization detected: ${component}:${process} took ${duration}ms`);
      }
    }
  }

  /**
   * Get initialization metrics
   */
  getMetrics(): InitializationMetrics {
    const componentCounts: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    let slowestInit: InitializationEvent | null = null;
    let fastestInit: InitializationEvent | null = null;

    // Count events by component and calculate metrics
    this.events.forEach(event => {
      componentCounts[event.component] = (componentCounts[event.component] || 0) + 1;
      
      if (event.duration !== undefined) {
        totalDuration += event.duration;
        durationCount++;
        
        if (!slowestInit || event.duration > slowestInit.duration!) {
          slowestInit = event;
        }
        
        if (!fastestInit || event.duration < fastestInit.duration!) {
          fastestInit = event;
        }
      }
    });

    // Detect duplicates
    const duplicateEvents = this.detectDuplicates();

    return {
      totalEvents: this.events.length,
      duplicateEvents,
      averageInitTime: durationCount > 0 ? totalDuration / durationCount : 0,
      slowestInit,
      fastestInit,
      componentCounts
    };
  }

  /**
   * Print initialization report
   */
  printReport(): void {
    if (!this.isEnabled) return;

    const metrics = this.getMetrics();
    
    console.group('📊 Initialization Report');
    console.log('Total Events:', metrics.totalEvents);
    console.log('Duplicate Events:', metrics.duplicateEvents);
    console.log('Average Init Time:', `${metrics.averageInitTime.toFixed(2)}ms`);
    
    if (metrics.slowestInit) {
      console.log('Slowest Init:', `${metrics.slowestInit.component}:${metrics.slowestInit.event} (${metrics.slowestInit.duration}ms)`);
    }
    
    if (metrics.fastestInit) {
      console.log('Fastest Init:', `${metrics.fastestInit.component}:${metrics.fastestInit.event} (${metrics.fastestInit.duration}ms)`);
    }
    
    console.log('Component Counts:', metrics.componentCounts);
    console.groupEnd();
  }

  /**
   * Get event emoji based on event type
   */
  private getEventEmoji(event: string): string {
    if (event.includes('start')) return '🚀';
    if (event.includes('complete') || event.includes('success')) return '✅';
    if (event.includes('error') || event.includes('fail')) return '❌';
    if (event.includes('warning') || event.includes('warn')) return '⚠️';
    if (event.includes('duplicate')) return '🔄';
    return '🔧';
  }

  /**
   * Get event color based on event type
   */
  private getEventColor(event: string): string {
    if (event.includes('start')) return '#3498db';
    if (event.includes('complete') || event.includes('success')) return '#2ecc71';
    if (event.includes('error') || event.includes('fail')) return '#e74c3c';
    if (event.includes('warning') || event.includes('warn')) return '#f39c12';
    if (event.includes('duplicate')) return '#9b59b6';
    return '#34495e';
  }

  /**
   * Check for duplicate events
   */
  private checkForDuplicates(component: string, event: string): void {
    const recentEvents = this.events.slice(-10); // Check last 10 events
    const duplicates = recentEvents.filter(e => 
      e.component === component && 
      e.event === event && 
      e.timestamp !== this.events[this.events.length - 1].timestamp
    );

    if (duplicates.length > 0) {
      console.warn(`🔄 Duplicate initialization detected: ${component}:${event} (${duplicates.length + 1} times)`);
    }
  }

  /**
   * Detect all duplicate events
   */
  private detectDuplicates(): number {
    const eventKeys = new Set<string>();
    let duplicates = 0;

    this.events.forEach(event => {
      const key = `${event.component}:${event.event}`;
      if (eventKeys.has(key)) {
        duplicates++;
      } else {
        eventKeys.add(key);
      }
    });

    return duplicates;
  }

  /**
   * Clear all logged events
   */
  clear(): void {
    this.events = [];
    this.startTimes.clear();
    console.log('🧹 Initialization logger cleared');
  }

  /**
   * Export events for analysis
   */
  exportEvents(): InitializationEvent[] {
    return [...this.events];
  }
}

// Export singleton instance
export const initLogger = new InitializationLogger();
export default initLogger;
