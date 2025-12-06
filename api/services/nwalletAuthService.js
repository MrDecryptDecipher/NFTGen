const axios = require('axios');

class NwalletAuthService {
  constructor() {
    this.nwalletApiUrl = process.env.NWALLET_API_URL || 'http://localhost:6102';
    this.cache = new Map(); // Simple cache for user credentials
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Validate session with Nwallet and get user credentials
  async getUserCredentials(sessionId) {
    try {
      console.log('🔐 Validating session with Nwallet:', sessionId?.substring(0, 16) + '...');

      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      // Check cache first
      const cacheKey = `session:${sessionId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('✅ Using cached credentials for session');
        return cached.data;
      }

      // Get user profile from Nwallet
      const profileResponse = await axios.get(`${this.nwalletApiUrl}/api/nftgen-auth/profile/${sessionId}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NFTGen-API/1.0'
        }
      });

      if (!profileResponse.data.success) {
        throw new Error('Invalid session or user not found');
      }

      const userProfile = profileResponse.data.user;
      console.log('✅ User profile retrieved:', {
        email: userProfile.email,
        ethAddress: userProfile.ethAddress
      });

      // Get user credentials (private keys) from Nwallet
      const credentialsResponse = await axios.get(`${this.nwalletApiUrl}/api/nftgen-auth/credentials/${sessionId}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NFTGen-API/1.0'
        }
      });

      if (!credentialsResponse.data.success) {
        throw new Error('Failed to retrieve user credentials');
      }

      const credentials = credentialsResponse.data.credentials;

      const userCredentials = {
        userId: userProfile.id,
        email: userProfile.email,
        ethAddress: credentials.ethAddress,
        ethPrivateKey: credentials.ethPrivateKey,
        solAddress: credentials.solAddress,
        solPrivateKey: credentials.solPrivateKey,
        mnemonic: credentials.mnemonic,
        profile: userProfile.profile,
        settings: userProfile.settings,
        sessionId: sessionId
      };

      // Cache the credentials
      this.cache.set(cacheKey, {
        data: userCredentials,
        timestamp: Date.now()
      });

      console.log('✅ User credentials retrieved and cached');
      return userCredentials;

    } catch (error) {
      console.error('❌ Error getting user credentials:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Get user by Ethereum address (for backward compatibility)
  async getUserByAddress(ethAddress) {
    try {
      console.log('🔍 Looking up user by address:', ethAddress);

      // Check if we have this user in cache
      for (const [key, cached] of this.cache.entries()) {
        if (cached.data.ethAddress === ethAddress && 
            Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('✅ Found user in cache by address');
          return cached.data;
        }
      }

      // If not in cache, we need a session ID to get credentials
      // This is a limitation - we can't get private keys without a valid session
      throw new Error('User lookup by address requires active session. Please provide sessionId.');

    } catch (error) {
      console.error('❌ Error getting user by address:', error.message);
      throw error;
    }
  }

  // Validate if user has NFTGen enabled
  async checkNFTGenStatus(sessionId) {
    try {
      const userCredentials = await this.getUserCredentials(sessionId);
      
      // Check NFTGen status with Nwallet
      const statusResponse = await axios.get(
        `${this.nwalletApiUrl}/api/nftgen/status/${userCredentials.ethAddress}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NFTGen-API/1.0'
          }
        }
      );

      if (!statusResponse.data.success) {
        return {
          isEnabled: false,
          needsEnabling: true,
          userCredentials
        };
      }

      return {
        isEnabled: statusResponse.data.isEnabled,
        status: statusResponse.data,
        userCredentials
      };

    } catch (error) {
      console.error('❌ Error checking NFTGen status:', error.message);
      throw error;
    }
  }

  // Enable NFTGen for user
  async enableNFTGen(sessionId) {
    try {
      const userCredentials = await this.getUserCredentials(sessionId);
      
      const enableResponse = await axios.post(`${this.nwalletApiUrl}/api/nftgen/enable`, {
        userAddress: userCredentials.ethAddress
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NFTGen-API/1.0'
        }
      });

      if (!enableResponse.data.success) {
        throw new Error('Failed to enable NFTGen');
      }

      console.log('✅ NFTGen enabled for user:', userCredentials.ethAddress);
      return {
        success: true,
        userCredentials,
        nftgenStatus: enableResponse.data
      };

    } catch (error) {
      console.error('❌ Error enabling NFTGen:', error.message);
      throw error;
    }
  }

  // Store NFT in user's collection
  async addNFTToCollection(sessionId, nftData) {
    try {
      const userCredentials = await this.getUserCredentials(sessionId);

      console.log('📝 Adding NFT to user collection:', {
        userAddress: userCredentials.ethAddress,
        nftData: {
          name: nftData.name,
          tokenId: nftData.tokenId,
          transactionHash: nftData.transactionHash
        }
      });

      // Call Nwallet API to store the NFT in user's collection
      const collectionData = {
        userAddress: userCredentials.ethAddress,
        nft: {
          name: nftData.name,
          description: nftData.description,
          tokenId: nftData.tokenId || 'metadata-only',
          contractAddress: nftData.contractAddress || 'N/A',
          transactionHash: nftData.transactionHash || 'N/A',
          imageUrl: nftData.imageUrl,
          metadataUrl: nftData.metadataUrl,
          attributes: nftData.attributes || [],
          createdAt: new Date().toISOString(),
          platform: 'NFTGen',
          network: 'sepolia',
          status: nftData.transactionHash ? 'minted' : 'metadata-only'
        }
      };

      const response = await axios.post(`${this.nwalletApiUrl}/api/nft/activity`, collectionData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NFTGen-API/1.0'
        }
      });

      if (response.data.success) {
        console.log('✅ NFT successfully added to user collection');
        return {
          success: true,
          userAddress: userCredentials.ethAddress,
          nftData,
          collectionResponse: response.data
        };
      } else {
        console.warn('⚠️ NFT collection storage returned non-success response:', response.data);
        return {
          success: true, // Still return success for NFT creation
          userAddress: userCredentials.ethAddress,
          nftData,
          warning: 'Collection storage may have failed'
        };
      }

    } catch (error) {
      console.error('❌ Error adding NFT to collection:', error.message);
      // Don't throw error - NFT creation should still succeed even if collection storage fails
      return {
        success: true,
        userAddress: userCredentials.ethAddress,
        nftData,
        warning: `Collection storage failed: ${error.message}`
      };
    }
  }

  // Clear cache for a session
  clearSessionCache(sessionId) {
    const cacheKey = `session:${sessionId}`;
    this.cache.delete(cacheKey);
    console.log('🧹 Cleared cache for session:', sessionId?.substring(0, 16) + '...');
  }

  // Clear all expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
    }
  }

  // Extract session ID from various request sources
  extractSessionId(req) {
    // Try different sources for session ID
    const sessionId = 
      req.headers['x-nftgen-session'] ||
      req.headers['x-session-id'] ||
      req.headers['authorization']?.replace('Bearer ', '') ||
      req.body.sessionId ||
      req.query.sessionId ||
      req.params.sessionId;

    return sessionId;
  }

  // Middleware for authenticating requests
  async authenticateRequest(req, res, next) {
    try {
      const sessionId = this.extractSessionId(req);
      
      if (!sessionId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Session ID must be provided in headers, body, or query parameters'
        });
      }

      const userCredentials = await this.getUserCredentials(sessionId);
      
      // Attach user credentials to request
      req.user = userCredentials;
      req.sessionId = sessionId;
      
      next();
    } catch (error) {
      console.error('❌ Authentication middleware error:', error.message);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message
      });
    }
  }

  // Get user's NFT collection from Nwallet
  async getUserNFTCollection(sessionId) {
    try {
      const userCredentials = await this.getUserCredentials(sessionId);
      
      const collectionResponse = await axios.get(
        `${this.nwalletApiUrl}/api/nftgen/collection/${userCredentials.ethAddress}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NFTGen-API/1.0'
          }
        }
      );

      return collectionResponse.data;

    } catch (error) {
      console.error('❌ Error getting user NFT collection:', error.message);
      throw error;
    }
  }

  // Get user's generation history from Nwallet
  async getUserGenerationHistory(sessionId) {
    try {
      const userCredentials = await this.getUserCredentials(sessionId);
      
      const historyResponse = await axios.get(
        `${this.nwalletApiUrl}/api/nftgen/history/${userCredentials.ethAddress}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'NFTGen-API/1.0'
          }
        }
      );

      return historyResponse.data;

    } catch (error) {
      console.error('❌ Error getting user generation history:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new NwalletAuthService();
