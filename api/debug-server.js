require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import performance optimizations
const databaseConfig = require('./config/database');
const cacheService = require('./services/cacheService');
const monitoringService = require('./services/monitoringService');
const userExperienceService = require('./services/userExperienceService');
const queueService = require('./services/queueService');
const nwalletAuthService = require('./services/nwalletAuthService');

console.log('🔧 Starting ADVANCED DEBUG NFTGen API Server...');
console.log('📊 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET'
});

const app = express();

// Monitoring middleware (must be first)
app.use(monitoringService.requestMonitor());

// Advanced request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`🔍 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔍 Query:`, JSON.stringify(req.query, null, 2));

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 [${timestamp}] Response Status: ${res.statusCode}`);
    console.log(`📤 Response Data:`, typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));
    return originalSend.call(this, data);
  };

  next();
});

// CORS configuration with extensive logging
app.use(cors({
  origin: function(origin, callback) {
    console.log(`🌐 CORS Origin Check: ${origin}`);
    const allowedOrigins = [
      'http://localhost:7103',
      'http://3.111.22.56:7103',
      'http://localhost:7102',
      'http://3.111.22.56:7102',
      'http://localhost:7101',
      'http://3.111.22.56:7101',
      'http://localhost:6101',
      'http://3.111.22.56:6101',
      'http://localhost:6103',
      'http://3.111.22.56:6103',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Origin ${origin} allowed`);
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origin ${origin} blocked`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies with logging
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    console.log(`📥 JSON Body Size: ${buf.length} bytes`);
  }
}));

// Initialize optimized database connection with connection pooling
async function initializeDatabase() {
  try {
    await databaseConfig.connect();
    await databaseConfig.createIndexes();
    console.log('📦 ✅ Database initialized with performance optimizations');
  } catch (error) {
    console.error('📦 ❌ Database initialization error:', error.message);
    console.log('⚠️ Continuing without MongoDB - authentication features will be limited');
  }
}

// Initialize database
initializeDatabase();

// Enhanced health check endpoint with performance metrics
app.get('/health', async (req, res) => {
  console.log('🏥 Health check endpoint called');

  try {
    const dbHealth = await databaseConfig.healthCheck();
    const cacheStats = cacheService.getStats();

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      cache: cacheStats,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log('🏥 Health data:', JSON.stringify(healthData, null, 2));

    res.status(200).json(healthData);
    console.log('🏥 ✅ Health response sent successfully');
  } catch (error) {
    console.error('🏥 ❌ Error in health check:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
app.get('/api/performance', async (req, res) => {
  try {
    console.log('📊 Performance metrics requested');

    const dbMetrics = await databaseConfig.getPerformanceMetrics();
    const cacheStats = cacheService.getStats();

    const performanceData = {
      timestamp: new Date().toISOString(),
      database: dbMetrics,
      cache: cacheStats,
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    res.json(performanceData);
  } catch (error) {
    console.error('📊 Performance metrics error:', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
});

// Monitoring and metrics endpoints
app.get('/api/metrics', (req, res) => {
  try {
    console.log('📊 Metrics endpoint requested');
    const metrics = monitoringService.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('📊 Metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

app.get('/api/health-check', async (req, res) => {
  try {
    console.log('🏥 Comprehensive health check requested');
    const healthData = await monitoringService.performHealthCheck();

    const statusCode = healthData.status === 'healthy' ? 200 :
                      healthData.status === 'error' ? 500 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('🏥 Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/metrics/reset', (req, res) => {
  try {
    console.log('🔄 Metrics reset requested');
    monitoringService.resetMetrics();
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔄 Metrics reset error:', error);
    res.status(500).json({
      error: 'Failed to reset metrics',
      message: error.message
    });
  }
});

// Nwallet Authentication Integration Endpoints

// Validate session and get user info
app.get('/api/auth/validate/:sessionId', async (req, res) => {
  try {
    console.log('🔐 Session validation endpoint called');
    const { sessionId } = req.params;

    const userCredentials = await nwalletAuthService.getUserCredentials(sessionId);

    res.json({
      success: true,
      user: {
        userId: userCredentials.userId,
        email: userCredentials.email,
        ethAddress: userCredentials.ethAddress,
        solAddress: userCredentials.solAddress,
        profile: userCredentials.profile,
        settings: userCredentials.settings
      },
      sessionId: sessionId
    });
  } catch (error) {
    console.error('🔐 Session validation error:', error);
    res.status(401).json({
      success: false,
      error: 'Session validation failed',
      message: error.message
    });
  }
});

// Check NFTGen status for authenticated user
app.get('/api/auth/nftgen-status/:sessionId', async (req, res) => {
  try {
    console.log('🎨 NFTGen status check endpoint called');
    const { sessionId } = req.params;

    const statusResult = await nwalletAuthService.checkNFTGenStatus(sessionId);

    res.json({
      success: true,
      ...statusResult
    });
  } catch (error) {
    console.error('🎨 NFTGen status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check NFTGen status',
      message: error.message
    });
  }
});

// Enable NFTGen for authenticated user
app.post('/api/auth/enable-nftgen', async (req, res) => {
  try {
    console.log('🎨 Enable NFTGen endpoint called');
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    const enableResult = await nwalletAuthService.enableNFTGen(sessionId);

    res.json({
      success: true,
      message: 'NFTGen enabled successfully',
      ...enableResult
    });
  } catch (error) {
    console.error('🎨 Enable NFTGen error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable NFTGen',
      message: error.message
    });
  }
});

// Get user's NFT collection
app.get('/api/auth/nft-collection/:sessionId', async (req, res) => {
  try {
    console.log('🖼️ Get NFT collection endpoint called');
    const { sessionId } = req.params;

    const collection = await nwalletAuthService.getUserNFTCollection(sessionId);

    res.json(collection);
  } catch (error) {
    console.error('🖼️ Get NFT collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFT collection',
      message: error.message
    });
  }
});

// User Experience Enhancement Endpoints

// Draft Management
app.post('/api/ux/drafts', async (req, res) => {
  try {
    console.log('💾 Save draft endpoint called');
    const { userId, draftData } = req.body;

    if (!userId || !draftData) {
      return res.status(400).json({
        success: false,
        error: 'userId and draftData are required'
      });
    }

    const result = await userExperienceService.saveDraft(userId, draftData);

    if (result.success) {
      // Track user action
      await userExperienceService.trackUserAction(userId, 'draft_saved', { draftId: result.draftId });
    }

    res.json(result);
  } catch (error) {
    console.error('💾 Error saving draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save draft',
      message: error.message
    });
  }
});

app.get('/api/ux/drafts/:userId', async (req, res) => {
  try {
    console.log('📋 Get user drafts endpoint called');
    const { userId } = req.params;

    const result = await userExperienceService.getUserDrafts(userId);

    if (result.success) {
      await userExperienceService.trackUserAction(userId, 'drafts_viewed');
    }

    res.json(result);
  } catch (error) {
    console.error('📋 Error getting drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get drafts',
      message: error.message
    });
  }
});

app.put('/api/ux/drafts/:draftId', async (req, res) => {
  try {
    console.log('📝 Update draft endpoint called');
    const { draftId } = req.params;
    const { draftData, userId } = req.body;

    const result = await userExperienceService.updateDraft(draftId, draftData);

    if (result.success && userId) {
      await userExperienceService.trackUserAction(userId, 'draft_updated', { draftId });
    }

    res.json(result);
  } catch (error) {
    console.error('📝 Error updating draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update draft',
      message: error.message
    });
  }
});

app.delete('/api/ux/drafts/:draftId', async (req, res) => {
  try {
    console.log('🗑️ Delete draft endpoint called');
    const { draftId } = req.params;
    const { userId } = req.body;

    const result = await userExperienceService.deleteDraft(draftId, userId);

    if (result.success && userId) {
      await userExperienceService.trackUserAction(userId, 'draft_deleted', { draftId });
    }

    res.json(result);
  } catch (error) {
    console.error('🗑️ Error deleting draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete draft',
      message: error.message
    });
  }
});

// Progress Persistence
app.post('/api/ux/progress', async (req, res) => {
  try {
    console.log('📊 Save progress endpoint called');
    const { sessionId, progressData } = req.body;

    if (!sessionId || !progressData) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and progressData are required'
      });
    }

    const result = await userExperienceService.saveProgress(sessionId, progressData);
    res.json(result);
  } catch (error) {
    console.error('📊 Error saving progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save progress',
      message: error.message
    });
  }
});

app.get('/api/ux/progress/:sessionId', async (req, res) => {
  try {
    console.log('📊 Get progress endpoint called');
    const { sessionId } = req.params;

    const result = await userExperienceService.getProgress(sessionId);
    res.json(result);
  } catch (error) {
    console.error('📊 Error getting progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progress',
      message: error.message
    });
  }
});

// NFT Preview Generation
app.post('/api/ux/preview', async (req, res) => {
  try {
    console.log('🖼️ Generate preview endpoint called');
    const { previewData, userId } = req.body;

    if (!previewData) {
      return res.status(400).json({
        success: false,
        error: 'previewData is required'
      });
    }

    const result = await userExperienceService.generatePreview(previewData);

    if (result.success && userId) {
      await userExperienceService.trackUserAction(userId, 'preview_generated', { previewId: result.preview.id });
    }

    res.json(result);
  } catch (error) {
    console.error('🖼️ Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

app.get('/api/ux/preview/:previewId', async (req, res) => {
  try {
    console.log('🖼️ Get preview endpoint called');
    const { previewId } = req.params;

    const result = await userExperienceService.getPreview(previewId);
    res.json(result);
  } catch (error) {
    console.error('🖼️ Error getting preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preview',
      message: error.message
    });
  }
});

// Session Management
app.post('/api/ux/session', async (req, res) => {
  try {
    console.log('🔐 Create session endpoint called');
    const { userId, deviceInfo } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await userExperienceService.createSession(userId, deviceInfo);

    if (result.success) {
      await userExperienceService.trackUserAction(userId, 'session_created', { sessionId: result.sessionId });
    }

    res.json(result);
  } catch (error) {
    console.error('🔐 Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      message: error.message
    });
  }
});

// User Analytics
app.get('/api/ux/analytics/:userId', async (req, res) => {
  try {
    console.log('📈 Get user analytics endpoint called');
    const { userId } = req.params;

    const result = await userExperienceService.getUserAnalytics(userId);
    res.json(result);
  } catch (error) {
    console.error('📈 Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

// Scalability and Queue Management Endpoints

// Add job to queue
app.post('/api/queue/:queueName', async (req, res) => {
  try {
    console.log('📋 Add job to queue endpoint called');
    const { queueName } = req.params;
    const { jobData, options } = req.body;

    if (!jobData) {
      return res.status(400).json({
        success: false,
        error: 'jobData is required'
      });
    }

    const result = await queueService.addJob(queueName, jobData, options);
    res.json(result);
  } catch (error) {
    console.error('📋 Error adding job to queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add job to queue',
      message: error.message
    });
  }
});

// Get queue statistics
app.get('/api/queue/stats', (req, res) => {
  try {
    console.log('📊 Queue stats endpoint called');
    const stats = queueService.getQueueStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('📊 Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue stats',
      message: error.message
    });
  }
});

// Get specific job status
app.get('/api/queue/job/:jobId', async (req, res) => {
  try {
    console.log('🔍 Get job status endpoint called');
    const { jobId } = req.params;

    const result = await queueService.getJob(jobId);
    res.json(result);
  } catch (error) {
    console.error('🔍 Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

// Process heavy NFT operation through queue
app.post('/api/queue/nft-process', async (req, res) => {
  try {
    console.log('🎨 Queue NFT processing endpoint called');
    const { nftData, userId } = req.body;

    if (!nftData) {
      return res.status(400).json({
        success: false,
        error: 'nftData is required'
      });
    }

    // Add to high-priority NFT processing queue
    const result = await queueService.addJob('nft-processing', {
      ...nftData,
      userId,
      requestedAt: new Date().toISOString()
    }, {
      priority: 'high'
    });

    if (result.success && userId) {
      await userExperienceService.trackUserAction(userId, 'nft_queued', { jobId: result.jobId });
    }

    res.json(result);
  } catch (error) {
    console.error('🎨 Error queueing NFT processing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue NFT processing',
      message: error.message
    });
  }
});

// Authenticated NFT Creation Endpoint (Recommended)
app.post('/api/nft/create', async (req, res) => {
  console.log('🎨 Authenticated NFT creation endpoint called');

  try {
    // Extract session ID from request
    const sessionId = nwalletAuthService.extractSessionId(req);

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Session ID must be provided in x-nftgen-session header'
      });
    }

    // Get authenticated user credentials
    const userCredentials = await nwalletAuthService.getUserCredentials(sessionId);
    console.log('✅ Authenticated user:', userCredentials.ethAddress);

    // Check if NFTGen is enabled
    const nftgenStatus = await nwalletAuthService.checkNFTGenStatus(sessionId);
    if (!nftgenStatus.isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'NFTGen not enabled',
        message: 'Please enable NFTGen in your Nwallet account first',
        needsEnabling: true,
        userAddress: userCredentials.ethAddress
      });
    }

    const { name, description, image, attributes, mintNFT = false } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }

    // Record NFT creation activity
    monitoringService.recordNFTActivity('created', {
      name,
      description,
      userAddress: userCredentials.ethAddress,
      sessionId: sessionId.substring(0, 16) + '...'
    });

    // Step 1: Upload image to IPFS if provided
    let imageResult = null;
    if (image) {
      console.log('📤 Step 1: Uploading image to REAL Pinata...');
      imageResult = await realPinataService.uploadImage(image);
      console.log('✅ Image uploaded to REAL Pinata:', imageResult.cid);
    }

    // Step 2: Create and upload NFT metadata
    console.log('📤 Step 2: Creating NFT metadata...');
    const metadataImageUrl = imageResult ? imageResult.imageUrl : `https://via.placeholder.com/400x400?text=${encodeURIComponent(name)}`;

    const metadata = {
      name,
      description,
      image: metadataImageUrl,
      attributes: attributes || [],
      external_url: `https://nftgen.nija.app/nft/${Date.now()}`,
      created_at: new Date().toISOString(),
      created_by: 'NFTGen Platform',
      creator: userCredentials.ethAddress,
      platform: 'NFTGen - Nija Ecosystem'
    };

    console.log('📤 Step 3: Uploading metadata to REAL Pinata...');
    const metadataResult = await realPinataService.uploadMetadata(metadata);
    console.log('✅ Metadata uploaded to REAL Pinata:', metadataResult.cid);

    let mintResult = null;

    // Step 3: Mint NFT if requested
    if (mintNFT) {
      console.log('🎨 Step 4: Minting NFT on Ethereum Sepolia...');

      try {
        mintResult = await alchemyNFTService.mintNFT(
          userCredentials.ethAddress,
          metadataResult.metadataUrl,
          userCredentials.ethPrivateKey
        );
        console.log('✅ NFT minted successfully:', mintResult.transactionHash);

        // Record successful minting
        monitoringService.recordNFTActivity('minted', {
          transactionHash: mintResult.transactionHash,
          tokenId: mintResult.tokenId,
          userAddress: userCredentials.ethAddress,
          sessionId: sessionId.substring(0, 16) + '...'
        });

        // Add NFT to user's collection in Nwallet
        try {
          await nwalletAuthService.addNFTToCollection(sessionId, {
            name,
            description,
            tokenId: mintResult.tokenId,
            contractAddress: mintResult.contractAddress,
            transactionHash: mintResult.transactionHash,
            imageUrl: metadataImageUrl,
            metadataUrl: metadataResult.metadataUrl,
            attributes: attributes || []
          });
        } catch (collectionError) {
          console.warn('⚠️ Failed to add NFT to collection:', collectionError.message);
        }

      } catch (mintError) {
        console.error('⚠️ NFT minting failed:', mintError.message);

        // Record failed minting
        monitoringService.recordNFTActivity('failed', {
          error: mintError.message,
          userAddress: userCredentials.ethAddress,
          stage: 'minting',
          sessionId: sessionId.substring(0, 16) + '...'
        });

        mintResult = {
          success: false,
          error: 'Minting failed',
          message: mintError.message
        };
      }
    }

    // Prepare response
    const actualImageUrl = imageResult ? imageResult.imageUrl : metadataImageUrl;

    const response = {
      success: true,
      message: 'NFT creation completed successfully',
      user: {
        address: userCredentials.ethAddress,
        email: userCredentials.email
      },
      nft: {
        name,
        description,
        imageUrl: actualImageUrl,
        imageCID: imageResult ? imageResult.cid : null,
        metadataUrl: metadataResult.metadataUrl,
        metadataCID: metadataResult.cid,
        metadata
      },
      minting: mintResult,
      blockchain: mintResult && mintResult.success ? {
        contractAddress: mintResult.contractAddress,
        tokenId: mintResult.tokenId,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        network: 'Ethereum Sepolia',
        explorer: `https://sepolia.etherscan.io/tx/${mintResult.transactionHash}`
      } : null,
      services: {
        ipfs: imageResult?.service || 'Pinata',
        metadata: metadataResult?.service || 'Pinata'
      },
      timestamp: new Date().toISOString()
    };

    console.log('📤 ✅ Authenticated NFT creation completed successfully');
    res.status(200).json(response);

  } catch (error) {
    console.error('📤 ❌ Authenticated NFT creation failed:', error);

    // Record failed NFT creation
    const sessionId = nwalletAuthService.extractSessionId(req);
    monitoringService.recordNFTActivity('failed', {
      error: error.message,
      stage: 'creation',
      sessionId: sessionId?.substring(0, 16) + '...'
    });

    res.status(500).json({
      success: false,
      error: 'NFT creation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint with debugging
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint called');
  
  const rootData = {
    message: 'NFTGen API Server - Advanced Debug Version',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health - Health check',
      'GET / - This endpoint',
      'GET /api/web3storage/credentials - Web3Storage credentials',
      'POST /api/web3storage/upload - Web3Storage upload',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login'
    ],
    debug: {
      port: process.env.PORT || 7105,
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime()
    }
  };
  
  console.log('🏠 Root data prepared');
  
  try {
    res.status(200).json(rootData);
    console.log('🏠 ✅ Root response sent successfully');
  } catch (error) {
    console.error('🏠 ❌ Error sending root response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import REAL Services
const RealPinataService = require('./services/realPinataService');
const AlchemyNFTService = require('./services/alchemyNFTService');

const realPinataService = new RealPinataService();
const alchemyNFTService = new AlchemyNFTService();

// REAL Pinata credentials endpoint
app.get('/api/web3storage/credentials', async (req, res) => {
  console.log('🌐 REAL Pinata credentials endpoint called');
  
  try {
    const accountInfo = await realPinataService.getAccountInfo();
    
    const credentials = {
      success: true,
      service: 'REAL Pinata IPFS',
      accountInfo: accountInfo.account,
      timestamp: new Date().toISOString()
    };
    
    console.log('🌐 REAL Pinata credentials prepared:', credentials);
    
    res.status(200).json(credentials);
    console.log('🌐 ✅ REAL Pinata credentials response sent successfully');
  } catch (error) {
    console.error('🌐 ❌ Error getting REAL Pinata credentials:', error);
    
    // Fallback response
    res.status(500).json({
      success: false,
      error: 'Failed to get REAL Pinata credentials',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Complete REAL NFT Creation endpoint (REAL Web3.Storage + Alchemy) with Nwallet Authentication
app.post('/api/web3storage/upload', async (req, res) => {
  console.log('📤 Complete REAL NFT Creation endpoint called');
  console.log('📤 Request body keys:', Object.keys(req.body || {}));

  try {
    // Extract session ID from request
    const sessionId = nwalletAuthService.extractSessionId(req);

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Session ID must be provided in headers (x-nftgen-session) or body'
      });
    }

    // Get authenticated user credentials
    let userCredentials;
    try {
      userCredentials = await nwalletAuthService.getUserCredentials(sessionId);
      console.log('✅ User authenticated:', userCredentials.ethAddress);
    } catch (authError) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: authError.message
      });
    }

    // Check if NFTGen is enabled for this user
    try {
      const nftgenStatus = await nwalletAuthService.checkNFTGenStatus(sessionId);
      if (!nftgenStatus.isEnabled) {
        return res.status(403).json({
          success: false,
          error: 'NFTGen not enabled',
          message: 'Please enable NFTGen in your Nwallet account first',
          needsEnabling: true
        });
      }
    } catch (statusError) {
      console.warn('⚠️ Could not check NFTGen status, proceeding anyway:', statusError.message);
    }

    const { name, description, image, attributes, mintNFT = false } = req.body;

    // Use authenticated user's credentials
    const userAddress = userCredentials.ethAddress;
    const userPrivateKey = userCredentials.ethPrivateKey;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }
    
    let imageResult = null;
    
    // Step 1: Upload image to REAL Pinata if provided
    if (image) {
      console.log('📤 Step 1: Uploading image to REAL Pinata...');
      
      // Handle base64 image data
      let imageBuffer;
      if (image.startsWith('data:')) {
        const base64Data = image.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        imageBuffer = Buffer.from(image, 'base64');
      }
      
      const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      imageResult = await realPinataService.uploadFile(imageBuffer, fileName, {
        contentType: 'image/png'
      });

      console.log('✅ Image uploaded to REAL Pinata:', imageResult.cid);
      console.log('🔍 REAL FIX DEBUG: imageResult =', JSON.stringify(imageResult, null, 2));
    }
    
    // Record NFT creation activity
    monitoringService.recordNFTActivity('created', { name, description, userAddress });

    // For heavy operations, consider using queue processing
    if (req.body.useQueue) {
      console.log('🔄 Using queue for heavy NFT processing...');
      const queueResult = await queueService.addJob('nft-processing', {
        name, description, image, attributes, userAddress, userPrivateKey, mintNFT
      }, { priority: 'high' });

      return res.status(202).json({
        success: true,
        message: 'NFT creation queued for processing',
        jobId: queueResult.jobId,
        status: 'queued',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Create and upload NFT metadata to REAL Pinata
    console.log('📤 Step 2: Creating NFT metadata...');
    console.log('🔍 REAL FIX DEBUG: imageResult exists?', !!imageResult);
    console.log('🔍 REAL FIX DEBUG: imageResult.imageUrl =', imageResult?.imageUrl);

    const metadataImageUrl = imageResult ? imageResult.imageUrl : `https://via.placeholder.com/400x400?text=${encodeURIComponent(name)}`;
    console.log('🔍 REAL FIX DEBUG: Using image URL =', metadataImageUrl);

    const metadata = {
      name,
      description,
      image: metadataImageUrl,
      attributes: attributes || [],
      external_url: `https://nftgen.nija.app/nft/${Date.now()}`,
      created_at: new Date().toISOString(),
      created_by: 'NFTGen Platform',
      platform: 'NFTGen - Nija Ecosystem'
    };
    
    console.log('📤 Step 3: Uploading metadata to REAL Pinata...');
    const metadataResult = await realPinataService.uploadMetadata(metadata);
    console.log('✅ Metadata uploaded to REAL Pinata:', metadataResult.cid);
    
    let mintResult = null;
    
    // Step 3: Mint NFT on Ethereum Sepolia if requested
    if (mintNFT && userAddress && userPrivateKey) {
      console.log('🎨 Step 4: Minting NFT on Ethereum Sepolia with REAL Alchemy...');
      
      try {
        mintResult = await alchemyNFTService.mintNFT(
          userAddress,
          metadataResult.metadataUrl,
          userPrivateKey
        );
        console.log('✅ NFT minted successfully with REAL Alchemy:', mintResult.transactionHash);

        // Record successful minting
        monitoringService.recordNFTActivity('minted', {
          transactionHash: mintResult.transactionHash,
          tokenId: mintResult.tokenId,
          userAddress
        });
      } catch (mintError) {
        console.error('⚠️ NFT minting failed, but metadata uploaded successfully:', mintError.message);

        // Record failed minting
        monitoringService.recordNFTActivity('failed', {
          error: mintError.message,
          userAddress,
          stage: 'minting'
        });

        mintResult = {
          success: false,
          error: 'Minting failed',
          message: mintError.message
        };
      }
    }
    
    // REAL FIX: Extract actual image URL from metadata if needed
    let actualImageUrl = imageResult ? imageResult.imageUrl : metadata.image;

    // If we have a metadata URL, fetch it to get the real image URL
    if (metadataResult && metadataResult.metadataUrl) {
      try {
        console.log('🔍 REAL FIX: Fetching metadata to extract actual image URL...');
        const axios = require('axios');
        const metadataResponse = await axios.get(metadataResult.metadataUrl, { timeout: 5000 });

        if (metadataResponse.data && metadataResponse.data.image) {
          actualImageUrl = metadataResponse.data.image;
          console.log('✅ REAL FIX: Extracted actual image URL:', actualImageUrl);
        }
      } catch (metadataError) {
        console.warn('⚠️ REAL FIX: Failed to fetch metadata:', metadataError.message);
        // Keep original URL as fallback
      }
    }

    const uploadResult = {
      success: true,
      service: 'REAL Pinata + REAL Alchemy',
      imageUrl: actualImageUrl, // Use extracted actual image URL
      imageCID: imageResult ? imageResult.cid : null,
      metadataUrl: metadataResult.metadataUrl,
      metadataCID: metadataResult.cid,
      metadata,
      mintResult,
      nftDetails: mintResult && mintResult.success ? {
        contractAddress: mintResult.contractAddress,
        tokenId: mintResult.tokenId,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        network: 'Ethereum Sepolia',
        explorer: `https://sepolia.etherscan.io/tx/${mintResult.transactionHash}`
      } : null,
      ipfsService: imageResult?.service || 'Unknown',
      metadataService: metadataResult?.service || 'Unknown',
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 Complete REAL NFT creation result prepared:', {
      ...uploadResult,
      userPrivateKey: '[REDACTED]' // Don't log private keys
    });
    
    res.status(200).json(uploadResult);
    console.log('📤 ✅ Complete REAL NFT creation response sent successfully');
    
  } catch (error) {
    console.error('📤 ❌ REAL NFT creation failed:', error);

    // Record failed NFT creation
    const sessionId = nwalletAuthService.extractSessionId(req);
    let userAddress = 'unknown';

    try {
      if (sessionId) {
        const userCredentials = await nwalletAuthService.getUserCredentials(sessionId);
        userAddress = userCredentials.ethAddress;
      }
    } catch (authError) {
      console.warn('⚠️ Could not get user address for error logging:', authError.message);
    }

    monitoringService.recordNFTActivity('failed', {
      error: error.message,
      stage: 'creation',
      userAddress: userAddress,
      sessionId: sessionId?.substring(0, 16) + '...'
    });

    res.status(500).json({
      success: false,
      error: 'REAL NFT creation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// NFT-specific endpoints
app.get('/api/nft/metadata/:contractAddress/:tokenId', async (req, res) => {
  console.log('🔍 NFT metadata endpoint called');
  const { contractAddress, tokenId } = req.params;
  
  try {
    const metadata = await alchemyNFTService.getNFTMetadata(contractAddress, tokenId);
    
    console.log('🔍 ✅ NFT metadata retrieved successfully');
    res.status(200).json(metadata);
  } catch (error) {
    console.error('🔍 ❌ Failed to get NFT metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFT metadata',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/nft/owner/:address', async (req, res) => {
  console.log('🔍 NFTs for owner endpoint called');
  const { address } = req.params;
  
  try {
    const nfts = await alchemyNFTService.getNFTsForOwner(address);
    
    console.log('🔍 ✅ NFTs for owner retrieved successfully');
    res.status(200).json(nfts);
  } catch (error) {
    console.error('🔍 ❌ Failed to get NFTs for owner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFTs for owner',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/nft/transaction/:hash', async (req, res) => {
  console.log('🔍 Transaction status endpoint called');
  const { hash } = req.params;
  
  try {
    const status = await alchemyNFTService.getTransactionStatus(hash);
    
    console.log('🔍 ✅ Transaction status retrieved successfully');
    res.status(200).json(status);
  } catch (error) {
    console.error('🔍 ❌ Failed to get transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/nft/gas-estimate', async (req, res) => {
  console.log('⛽ Gas estimate endpoint called');
  
  try {
    const gasEstimate = await alchemyNFTService.estimateGasFee();
    
    console.log('⛽ ✅ Gas estimate retrieved successfully');
    res.status(200).json(gasEstimate);
  } catch (error) {
    console.error('⛽ ❌ Failed to get gas estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gas estimate',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Import and add authentication routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('🔐 Authentication routes loaded successfully');
} catch (error) {
  console.error('🔐 ❌ Failed to load authentication routes:', error.message);
  
  // Add basic auth endpoints as fallback
  app.post('/api/auth/register', (req, res) => {
    console.log('🔐 Registration endpoint called (fallback)');
    res.status(503).json({
      success: false,
      error: 'Authentication service temporarily unavailable',
      fallback: true
    });
  });
  
  app.post('/api/auth/login', (req, res) => {
    console.log('🔐 Login endpoint called (fallback)');
    res.status(503).json({
      success: false,
      error: 'Authentication service temporarily unavailable',
      fallback: true
    });
  });
}

// Import and add enhanced ERC1155 minting routes
try {
  const mintingRoutes = require('./routes/realMinting');
  app.use('/api/mint', mintingRoutes);
  console.log('🎨 Enhanced ERC1155 minting routes loaded successfully');
} catch (error) {
  console.error('🎨 ❌ Failed to load enhanced minting routes:', error.message);

  // Add basic minting endpoint as fallback
  app.get('/api/mint/test', (req, res) => {
    console.log('🎨 Minting test endpoint called (fallback)');
    res.json({
      success: true,
      message: 'Enhanced ERC1155 minting service temporarily unavailable',
      contractStandard: 'ERC1155',
      timestamp: new Date().toISOString()
    });
  });
}

// Import and add Alchemy webhook service
const AlchemyWebhookService = require('./services/alchemyWebhookService');
const webhookService = new AlchemyWebhookService();

// Alchemy webhook endpoints
app.post('/api/webhooks/alchemy', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🔔 Alchemy webhook received');
    console.log('🔔 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔 Body:', req.body.toString());

    // Parse the webhook payload
    const notification = JSON.parse(req.body.toString());

    // Handle the notification
    webhookService.handleWebhookNotification(notification);

    // Respond to Alchemy
    res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ Error processing Alchemy webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook status endpoint
app.get('/api/webhooks/status', async (req, res) => {
  try {
    const status = await webhookService.getWebhookStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ Error getting webhook status:', error);
    res.status(500).json({ error: 'Failed to get webhook status' });
  }
});

// Transaction monitoring endpoint
app.post('/api/webhooks/monitor-transaction', async (req, res) => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash is required' });
    }

    console.log('🔍 Setting up transaction monitoring for:', transactionHash);

    const result = await webhookService.monitorTransaction(transactionHash, (notification) => {
      console.log('📡 Transaction update:', notification);
      // In a real application, you might emit this to WebSocket clients
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Error setting up transaction monitoring:', error);
    res.status(500).json({ error: 'Failed to set up transaction monitoring' });
  }
});

// Additional webhook endpoints for comprehensive transaction monitoring

// Address activity webhook
app.post('/api/webhooks/alchemy/address-activity', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🏠 Address activity webhook received');
    const notification = JSON.parse(req.body.toString());

    if (notification.event) {
      webhookService.handleAddressActivity(notification.event);
    }

    res.status(200).json({
      success: true,
      message: 'Address activity webhook processed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error processing address activity webhook:', error);
    res.status(500).json({ error: 'Failed to process address activity webhook' });
  }
});

// Mined transaction webhook
app.post('/api/webhooks/alchemy/mined-transaction', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('⛏️ Mined transaction webhook received');
    const notification = JSON.parse(req.body.toString());

    if (notification.event) {
      webhookService.handleMinedTransaction(notification.event);
    }

    res.status(200).json({
      success: true,
      message: 'Mined transaction webhook processed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error processing mined transaction webhook:', error);
    res.status(500).json({ error: 'Failed to process mined transaction webhook' });
  }
});

// Dropped transaction webhook
app.post('/api/webhooks/alchemy/dropped-transaction', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    console.log('🗑️ Dropped transaction webhook received');
    const notification = JSON.parse(req.body.toString());

    if (notification.event) {
      webhookService.handleDroppedTransaction(notification.event);
    }

    res.status(200).json({
      success: true,
      message: 'Dropped transaction webhook processed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error processing dropped transaction webhook:', error);
    res.status(500).json({ error: 'Failed to process dropped transaction webhook' });
  }
});

// Test webhook endpoint for development
app.post('/api/webhooks/test', (req, res) => {
  try {
    console.log('🧪 Test webhook received:', req.body);

    res.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error processing test webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process test webhook',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Express Error Handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❓ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// Start server with advanced debugging
const PORT = process.env.PORT || 7105;
const HOST = process.env.HOST || '0.0.0.0';

console.log(`🚀 Starting server on ${HOST}:${PORT}...`);

// REAL FIX: Add endpoint to fix existing NFT image URLs in database
app.get('/api/fix-nft-images', async (req, res) => {
  try {
    console.log('🔧 REAL FIX: Starting to fix NFT image URLs in database...');

    // Get all activities from database
    const activities = await Activity.find({});
    console.log(`📊 Found ${activities.length} activities to check`);

    let fixedCount = 0;
    const axios = require('axios');

    for (const activity of activities) {
      if (activity.image && (activity.image.includes('gateway.pinata.cloud') || activity.image.includes('ipfs'))) {
        try {
          console.log(`🔍 Checking activity ${activity._id} with image: ${activity.image}`);

          // Fetch metadata to get real image URL
          const metadataResponse = await axios.get(activity.image, { timeout: 5000 });

          if (metadataResponse.data && metadataResponse.data.image && metadataResponse.data.image !== activity.image) {
            const oldImageUrl = activity.image;
            const newImageUrl = metadataResponse.data.image;

            // Update the activity with the real image URL
            await Activity.updateOne(
              { _id: activity._id },
              {
                image: newImageUrl,
                metadataUrl: oldImageUrl // Store original as metadata URL
              }
            );

            console.log(`✅ Fixed activity ${activity._id}:`);
            console.log(`   Old: ${oldImageUrl}`);
            console.log(`   New: ${newImageUrl}`);
            fixedCount++;
          }
        } catch (metadataError) {
          console.warn(`⚠️ Failed to fetch metadata for activity ${activity._id}:`, metadataError.message);
        }
      }
    }

    console.log(`🎉 REAL FIX COMPLETE: Fixed ${fixedCount} NFT image URLs`);
    res.json({
      success: true,
      message: `Fixed ${fixedCount} NFT image URLs`,
      totalChecked: activities.length,
      fixedCount
    });

  } catch (error) {
    console.error('❌ Error fixing NFT images:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 ✅ Advanced Debug Server ready at http://${HOST}:${PORT}`);
  console.log(`🚀 ✅ Health check: http://${HOST}:${PORT}/health`);
  console.log(`🚀 ✅ Web3Storage endpoints: http://${HOST}:${PORT}/api/web3storage/*`);
  console.log(`🚀 ✅ REAL FIX endpoint: http://${HOST}:${PORT}/api/fix-nft-images`);
  console.log(`🚀 ✅ Server process PID: ${process.pid}`);
});

server.on('error', (err) => {
  console.error('💥 Server Error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please free up the port and restart the server.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
  }
});

server.on('connection', (socket) => {
  console.log('🔌 New connection established from:', socket.remoteAddress);
});

server.on('close', () => {
  console.log('🔌 Server closed');
});

// Process event handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Advanced debug server setup completed');
console.log('📊 Server configuration:', {
  port: PORT,
  host: HOST,
  nodeEnv: process.env.NODE_ENV,
  pid: process.pid
});
