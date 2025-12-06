const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default TTL
    this.init();
  }

  async init() {
    try {
      // Initialize Redis client with fallback to in-memory cache if Redis is not available
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        lazyConnect: true
      });

      // Handle Redis connection events
      this.client.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.warn('⚠️ Redis cache error, falling back to in-memory cache:', err.message);
        this.isConnected = false;
        this.initInMemoryCache();
      });

      this.client.on('end', () => {
        console.log('📴 Redis cache disconnected');
        this.isConnected = false;
      });

      // Try to connect to Redis
      await this.client.connect();
      
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache:', error.message);
      this.initInMemoryCache();
    }
  }

  initInMemoryCache() {
    // Fallback to in-memory cache if Redis is not available
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
    console.log('💾 Using in-memory cache as fallback');
  }

  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Use in-memory cache
        return this.memoryCache?.get(key) || null;
      }
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
      } else {
        // Use in-memory cache
        if (this.memoryCache) {
          this.memoryCache.set(key, value);
          
          // Set expiration timer
          if (this.cacheTimers.has(key)) {
            clearTimeout(this.cacheTimers.get(key));
          }
          
          const timer = setTimeout(() => {
            this.memoryCache.delete(key);
            this.cacheTimers.delete(key);
          }, ttl * 1000);
          
          this.cacheTimers.set(key, timer);
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        // Use in-memory cache
        if (this.memoryCache) {
          this.memoryCache.delete(key);
          if (this.cacheTimers.has(key)) {
            clearTimeout(this.cacheTimers.get(key));
            this.cacheTimers.delete(key);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (this.isConnected && this.client) {
        return await this.client.exists(key) === 1;
      } else {
        return this.memoryCache?.has(key) || false;
      }
    } catch (error) {
      console.error('❌ Cache exists error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushDb();
      } else {
        if (this.memoryCache) {
          this.memoryCache.clear();
          this.cacheTimers.forEach(timer => clearTimeout(timer));
          this.cacheTimers.clear();
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Cache flush error:', error);
      return false;
    }
  }

  // Helper methods for common caching patterns

  async cacheNFT(nft) {
    const key = `nft:${nft._id || nft.tokenId}`;
    return await this.set(key, nft, 600); // Cache NFTs for 10 minutes
  }

  async getCachedNFT(id) {
    const key = `nft:${id}`;
    return await this.get(key);
  }

  async cacheUserNFTs(userId, nfts) {
    const key = `user:${userId}:nfts`;
    return await this.set(key, nfts, 300); // Cache user NFTs for 5 minutes
  }

  async getCachedUserNFTs(userId) {
    const key = `user:${userId}:nfts`;
    return await this.get(key);
  }

  async cacheActivity(activity) {
    const key = `activity:${activity._id}`;
    return await this.set(key, activity, 1800); // Cache activity for 30 minutes
  }

  async getCachedActivity(id) {
    const key = `activity:${id}`;
    return await this.get(key);
  }

  async cacheUserActivity(userId, activities) {
    const key = `user:${userId}:activity`;
    return await this.set(key, activities, 300); // Cache user activity for 5 minutes
  }

  async getCachedUserActivity(userId) {
    const key = `user:${userId}:activity`;
    return await this.get(key);
  }

  async cacheTransactionStatus(txHash, status) {
    const key = `tx:${txHash}:status`;
    return await this.set(key, status, 60); // Cache transaction status for 1 minute
  }

  async getCachedTransactionStatus(txHash) {
    const key = `tx:${txHash}:status`;
    return await this.get(key);
  }

  async invalidateUserCache(userId) {
    // Invalidate all user-related cache entries
    await this.del(`user:${userId}:nfts`);
    await this.del(`user:${userId}:activity`);
    await this.del(`user:${userId}:profile`);
  }

  async invalidateNFTCache(nftId) {
    await this.del(`nft:${nftId}`);
  }

  // Get cache statistics
  getStats() {
    if (this.isConnected) {
      return {
        type: 'redis',
        connected: true,
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      };
    } else {
      return {
        type: 'memory',
        connected: false,
        entries: this.memoryCache?.size || 0,
        timers: this.cacheTimers?.size || 0
      };
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.disconnect();
      }
      if (this.cacheTimers) {
        this.cacheTimers.forEach(timer => clearTimeout(timer));
        this.cacheTimers.clear();
      }
      if (this.memoryCache) {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('❌ Cache disconnect error:', error);
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
