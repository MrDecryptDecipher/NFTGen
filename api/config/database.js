const mongoose = require('mongoose');

class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.connectionOptions = {
      // Connection pool settings for performance
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timing out
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      
      // Performance optimizations
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // Monitoring and logging
      monitorCommands: process.env.NODE_ENV === 'development',
      
      // Compression
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
      
      // Read preferences for performance
      readPreference: 'primaryPreferred',
      
      // Write concern for consistency vs performance balance
      writeConcern: {
        w: 'majority',
        j: true, // Wait for journal acknowledgment
        wtimeout: 5000 // Timeout after 5 seconds
      }
    };
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('📊 Database already connected');
        return;
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nftgen';
      
      console.log('🔌 Connecting to MongoDB with optimized settings...');
      
      await mongoose.connect(mongoUri, this.connectionOptions);
      
      this.isConnected = true;
      console.log('✅ MongoDB connected successfully with connection pooling');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Log connection pool stats periodically in development
      if (process.env.NODE_ENV === 'development') {
        this.startPoolMonitoring();
      }
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  setupEventListeners() {
    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('📊 Mongoose connected to MongoDB');
    });

    db.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    db.on('disconnected', () => {
      console.log('📴 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    db.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Connection pool events
    db.on('fullsetup', () => {
      console.log('🏊 MongoDB connection pool fully set up');
    });

    db.on('all', () => {
      console.log('🌐 MongoDB connection to all servers established');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  startPoolMonitoring() {
    // Log connection pool statistics every 30 seconds in development
    setInterval(() => {
      const stats = this.getConnectionStats();
      if (stats.totalConnections > 0) {
        console.log('🏊 Connection Pool Stats:', {
          total: stats.totalConnections,
          available: stats.availableConnections,
          checked_out: stats.checkedOutConnections,
          min_pool_size: this.connectionOptions.minPoolSize,
          max_pool_size: this.connectionOptions.maxPoolSize
        });
      }
    }, 30000);
  }

  getConnectionStats() {
    const db = mongoose.connection;
    if (!db || !db.db) {
      return {
        totalConnections: 0,
        availableConnections: 0,
        checkedOutConnections: 0
      };
    }

    try {
      // Get connection pool stats from the native driver
      const client = db.getClient();
      const topology = client.topology;
      
      if (topology && topology.s && topology.s.server) {
        const pool = topology.s.server.s.pool;
        return {
          totalConnections: pool ? pool.totalConnectionCount : 0,
          availableConnections: pool ? pool.availableConnectionCount : 0,
          checkedOutConnections: pool ? pool.checkedOutConnectionCount : 0
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not get connection pool stats:', error.message);
    }

    return {
      totalConnections: 0,
      availableConnections: 0,
      checkedOutConnections: 0
    };
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        console.log('🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('✅ MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', healthy: false };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      const stats = this.getConnectionStats();
      
      return {
        status: 'connected',
        healthy: true,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        connectionStats: stats,
        poolConfig: {
          maxPoolSize: this.connectionOptions.maxPoolSize,
          minPoolSize: this.connectionOptions.minPoolSize,
          maxIdleTimeMS: this.connectionOptions.maxIdleTimeMS
        }
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }

  // Performance optimization methods
  async createIndexes() {
    try {
      console.log('🔍 Creating database indexes for performance...');
      
      // Get all models and ensure indexes
      const models = mongoose.models;
      const indexPromises = [];

      for (const modelName in models) {
        const model = models[modelName];
        indexPromises.push(
          model.createIndexes().then(() => {
            console.log(`✅ Indexes created for ${modelName}`);
          }).catch(error => {
            console.error(`❌ Error creating indexes for ${modelName}:`, error);
          })
        );
      }

      await Promise.all(indexPromises);
      console.log('✅ All database indexes created successfully');
      
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }

  // Get database performance metrics
  async getPerformanceMetrics() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();
      
      // Get server status
      const serverStatus = await admin.serverStatus();
      
      // Get database stats
      const dbStats = await db.stats();
      
      return {
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated
        },
        memory: {
          resident: serverStatus.mem.resident,
          virtual: serverStatus.mem.virtual,
          mapped: serverStatus.mem.mapped
        },
        operations: {
          insert: serverStatus.opcounters.insert,
          query: serverStatus.opcounters.query,
          update: serverStatus.opcounters.update,
          delete: serverStatus.opcounters.delete
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize
        },
        poolStats: this.getConnectionStats()
      };
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseConfig();
