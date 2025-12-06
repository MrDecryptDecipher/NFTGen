const fs = require('fs').promises;
const path = require('path');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        byMethod: new Map()
      },
      nft: {
        created: 0,
        minted: 0,
        failed: 0,
        totalValue: 0
      },
      performance: {
        averageResponseTime: 0,
        slowestEndpoint: null,
        fastestEndpoint: null,
        responseTimeHistory: []
      },
      errors: {
        total: 0,
        byType: new Map(),
        recent: []
      },
      system: {
        startTime: Date.now(),
        lastHealthCheck: null,
        alerts: []
      }
    };

    this.thresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      memoryUsage: 0.8, // 80%
      diskUsage: 0.9 // 90%
    };

    this.logFile = path.join(__dirname, '../logs/monitoring.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Could not create log directory:', error.message);
    }
  }

  // Request monitoring middleware
  requestMonitor() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      this.metrics.requests.total++;
      
      // Track by endpoint
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      this.metrics.requests.byEndpoint.set(
        endpoint,
        (this.metrics.requests.byEndpoint.get(endpoint) || 0) + 1
      );
      
      // Track by method
      this.metrics.requests.byMethod.set(
        req.method,
        (this.metrics.requests.byMethod.get(req.method) || 0) + 1
      );

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        
        // Track response time
        this.updateResponseTime(endpoint, responseTime);
        
        // Track success/failure
        if (res.statusCode >= 200 && res.statusCode < 400) {
          this.metrics.requests.successful++;
        } else {
          this.metrics.requests.failed++;
          this.recordError('HTTP_ERROR', `${res.statusCode} ${endpoint}`, req);
        }
        
        // Log slow requests
        if (responseTime > this.thresholds.responseTime) {
          this.recordAlert('SLOW_REQUEST', `${endpoint} took ${responseTime}ms`);
        }
        
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  updateResponseTime(endpoint, responseTime) {
    // Update average response time
    const history = this.metrics.performance.responseTimeHistory;
    history.push(responseTime);
    
    // Keep only last 1000 requests
    if (history.length > 1000) {
      history.shift();
    }
    
    this.metrics.performance.averageResponseTime = 
      history.reduce((sum, time) => sum + time, 0) / history.length;
    
    // Update slowest/fastest endpoints
    if (!this.metrics.performance.slowestEndpoint || 
        responseTime > this.metrics.performance.slowestEndpoint.time) {
      this.metrics.performance.slowestEndpoint = { endpoint, time: responseTime };
    }
    
    if (!this.metrics.performance.fastestEndpoint || 
        responseTime < this.metrics.performance.fastestEndpoint.time) {
      this.metrics.performance.fastestEndpoint = { endpoint, time: responseTime };
    }
  }

  recordError(type, message, context = null) {
    this.metrics.errors.total++;
    
    // Track by type
    this.metrics.errors.byType.set(
      type,
      (this.metrics.errors.byType.get(type) || 0) + 1
    );
    
    // Add to recent errors (keep last 100)
    const error = {
      type,
      message,
      timestamp: new Date().toISOString(),
      context: context ? {
        url: context.url,
        method: context.method,
        userAgent: context.get?.('user-agent'),
        ip: context.ip
      } : null
    };
    
    this.metrics.errors.recent.unshift(error);
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.pop();
    }
    
    // Log error
    this.logEvent('ERROR', error);
    
    // Check error rate threshold
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > this.thresholds.errorRate) {
      this.recordAlert('HIGH_ERROR_RATE', `Error rate: ${(errorRate * 100).toFixed(2)}%`);
    }
  }

  recordAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };
    
    this.metrics.system.alerts.unshift(alert);
    
    // Keep only last 50 alerts
    if (this.metrics.system.alerts.length > 50) {
      this.metrics.system.alerts.pop();
    }
    
    console.warn(`🚨 ALERT [${alert.severity}]: ${type} - ${message}`);
    this.logEvent('ALERT', alert);
  }

  getAlertSeverity(type) {
    const severityMap = {
      'SLOW_REQUEST': 'WARNING',
      'HIGH_ERROR_RATE': 'CRITICAL',
      'HIGH_MEMORY_USAGE': 'WARNING',
      'HIGH_DISK_USAGE': 'CRITICAL',
      'DATABASE_ERROR': 'CRITICAL',
      'CACHE_ERROR': 'WARNING'
    };
    
    return severityMap[type] || 'INFO';
  }

  recordNFTActivity(type, data = {}) {
    switch (type) {
      case 'created':
        this.metrics.nft.created++;
        break;
      case 'minted':
        this.metrics.nft.minted++;
        if (data.value) {
          this.metrics.nft.totalValue += parseFloat(data.value);
        }
        break;
      case 'failed':
        this.metrics.nft.failed++;
        this.recordError('NFT_ERROR', data.error || 'NFT operation failed');
        break;
    }
    
    this.logEvent('NFT_ACTIVITY', { type, ...data });
  }

  async performHealthCheck() {
    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {}
      };

      // Memory check
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
      healthData.checks.memory = {
        status: memUsagePercent < this.thresholds.memoryUsage ? 'healthy' : 'warning',
        usage: memUsagePercent,
        details: memUsage
      };

      if (memUsagePercent > this.thresholds.memoryUsage) {
        this.recordAlert('HIGH_MEMORY_USAGE', `Memory usage: ${(memUsagePercent * 100).toFixed(2)}%`);
      }

      // Disk check (if possible)
      try {
        const stats = await fs.stat(process.cwd());
        healthData.checks.disk = {
          status: 'healthy',
          details: 'Disk accessible'
        };
      } catch (error) {
        healthData.checks.disk = {
          status: 'error',
          error: error.message
        };
      }

      // Error rate check
      const errorRate = this.metrics.requests.total > 0 ? 
        this.metrics.requests.failed / this.metrics.requests.total : 0;
      healthData.checks.errorRate = {
        status: errorRate < this.thresholds.errorRate ? 'healthy' : 'critical',
        rate: errorRate,
        threshold: this.thresholds.errorRate
      };

      // Response time check
      healthData.checks.responseTime = {
        status: this.metrics.performance.averageResponseTime < this.thresholds.responseTime ? 'healthy' : 'warning',
        average: this.metrics.performance.averageResponseTime,
        threshold: this.thresholds.responseTime
      };

      this.metrics.system.lastHealthCheck = healthData.timestamp;
      
      return healthData;
    } catch (error) {
      this.recordError('HEALTH_CHECK_ERROR', error.message);
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message
      };
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.system.startTime,
      errorRate: this.metrics.requests.total > 0 ? 
        this.metrics.requests.failed / this.metrics.requests.total : 0,
      requestsPerMinute: this.calculateRequestsPerMinute(),
      topEndpoints: this.getTopEndpoints(),
      recentAlerts: this.metrics.system.alerts.slice(0, 10)
    };
  }

  calculateRequestsPerMinute() {
    const uptimeMinutes = (Date.now() - this.metrics.system.startTime) / (1000 * 60);
    return uptimeMinutes > 0 ? this.metrics.requests.total / uptimeMinutes : 0;
  }

  getTopEndpoints() {
    return Array.from(this.metrics.requests.byEndpoint.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  async logEvent(type, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        data
      };
      
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('⚠️ Failed to write to log file:', error.message);
    }
  }

  resetMetrics() {
    // Reset counters but keep configuration
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      byEndpoint: new Map(),
      byMethod: new Map()
    };
    
    this.metrics.nft = {
      created: 0,
      minted: 0,
      failed: 0,
      totalValue: 0
    };
    
    this.metrics.performance.responseTimeHistory = [];
    this.metrics.errors.recent = [];
    this.metrics.system.alerts = [];
    this.metrics.system.startTime = Date.now();
  }
}

// Export singleton instance
module.exports = new MonitoringService();
