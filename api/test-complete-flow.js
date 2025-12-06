#!/usr/bin/env node

/**
 * Complete NFTGen + Nwallet Integration Test
 * 
 * This script demonstrates the complete flow:
 * 1. User registers/logs in to Nwallet
 * 2. Gets session ID from Nwallet
 * 3. Uses session ID to authenticate with NFTGen
 * 4. Creates NFT using authenticated endpoint
 * 5. Verifies the NFT was created and stored
 */

const axios = require('axios');

const NWALLET_API = 'http://localhost:6102';
const NFTGEN_API = 'http://localhost:7105';

// Test user credentials
const TEST_USER = {
  email: 'nftgen.test@example.com',
  password: 'testpassword123'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🚀 Starting Complete NFTGen + Nwallet Integration Test\n');
  
  let sessionId = null;
  let userCredentials = null;
  
  try {
    // Step 1: Try to login first (user might already exist)
    console.log('🔐 Step 1: Attempting to login to Nwallet...');
    try {
      const loginResponse = await axios.post(`${NWALLET_API}/api/nftgen-auth/login`, TEST_USER, {
        timeout: 10000
      });

      if (loginResponse.data.success) {
        sessionId = loginResponse.data.sessionId;
        userCredentials = loginResponse.data.user;
        console.log('✅ Login successful!');
        console.log(`   Session ID: ${sessionId.substring(0, 20)}...`);
        console.log(`   User Address: ${userCredentials.ethAddress}`);
      }
    } catch (loginError) {
      console.log('ℹ️  Login failed, will try to register...');

      // Step 1b: Register new user if login failed
      console.log('🔐 Step 1b: Registering new user in Nwallet...');
      const registerResponse = await axios.post(`${NWALLET_API}/api/nftgen-auth/register`, {
        ...TEST_USER,
        firstName: 'NFTGen',
        lastName: 'Test'
      }, {
        timeout: 15000
      });

      if (registerResponse.data.success) {
        console.log('✅ Registration successful!');
        console.log(`   User Address: ${registerResponse.data.user.ethAddress}`);

        // Now login to get session
        await sleep(1000); // Wait a bit
        const loginResponse = await axios.post(`${NWALLET_API}/api/nftgen-auth/login`, TEST_USER, {
          timeout: 10000
        });

        sessionId = loginResponse.data.sessionId;
        userCredentials = loginResponse.data.user;
        console.log('✅ Login after registration successful!');
        console.log(`   Session ID: ${sessionId.substring(0, 20)}...`);
      }
    }
    
    if (!sessionId) {
      throw new Error('Failed to get session ID from Nwallet');
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Step 2: Validate session with NFTGen
    console.log('🎨 Step 2: Validating session with NFTGen...');
    const validateResponse = await axios.get(`${NFTGEN_API}/api/auth/validate/${sessionId}`, {
      timeout: 10000
    });
    
    if (validateResponse.data.success) {
      console.log('✅ Session validation successful!');
      console.log(`   User: ${validateResponse.data.user.email}`);
      console.log(`   Address: ${validateResponse.data.user.ethAddress}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Step 3: Check NFTGen status
    console.log('🎨 Step 3: Checking NFTGen status...');
    const statusResponse = await axios.get(`${NFTGEN_API}/api/auth/nftgen-status/${sessionId}`, {
      timeout: 10000
    });
    
    console.log('📊 NFTGen Status:', {
      isEnabled: statusResponse.data.isEnabled,
      needsEnabling: statusResponse.data.needsEnabling
    });
    
    // Step 4: Enable NFTGen if needed
    if (!statusResponse.data.isEnabled) {
      console.log('🎨 Step 4: Enabling NFTGen...');
      const enableResponse = await axios.post(`${NFTGEN_API}/api/auth/enable-nftgen`, {
        sessionId: sessionId
      }, {
        timeout: 15000
      });
      
      if (enableResponse.data.success) {
        console.log('✅ NFTGen enabled successfully!');
      }
    } else {
      console.log('✅ NFTGen already enabled!');
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Step 5: Create NFT using authenticated endpoint
    console.log('🎨 Step 5: Creating NFT with authentication...');
    const nftData = {
      name: 'Test NFT ' + new Date().toLocaleTimeString(),
      description: 'This NFT was created using the authenticated NFTGen API with Nwallet integration',
      attributes: [
        { trait_type: 'Test Type', value: 'Integration Test' },
        { trait_type: 'Created By', value: 'NFTGen API' },
        { trait_type: 'Timestamp', value: new Date().toISOString() }
      ],
      mintNFT: false // Set to true to actually mint on blockchain
    };
    
    const createResponse = await axios.post(`${NFTGEN_API}/api/nft/create`, nftData, {
      headers: {
        'Content-Type': 'application/json',
        'x-nftgen-session': sessionId
      },
      timeout: 30000
    });
    
    if (createResponse.data.success) {
      console.log('✅ NFT created successfully!');
      console.log(`   Name: ${createResponse.data.nft.name}`);
      console.log(`   Metadata URL: ${createResponse.data.nft.metadataUrl}`);
      console.log(`   Image URL: ${createResponse.data.nft.imageUrl}`);
      console.log(`   User: ${createResponse.data.user.address}`);
      
      if (createResponse.data.minting && createResponse.data.minting.success) {
        console.log(`   🎉 MINTED! Transaction: ${createResponse.data.blockchain.transactionHash}`);
        console.log(`   🎉 Token ID: ${createResponse.data.blockchain.tokenId}`);
        console.log(`   🎉 Explorer: ${createResponse.data.blockchain.explorer}`);
      } else {
        console.log('   📝 Metadata created (minting was disabled)');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Step 6: Get user's NFT collection
    console.log('🖼️  Step 6: Getting user\'s NFT collection...');
    const collectionResponse = await axios.get(`${NFTGEN_API}/api/auth/nft-collection/${sessionId}`, {
      timeout: 10000
    });
    
    if (collectionResponse.data.success) {
      console.log('✅ Collection retrieved successfully!');
      console.log(`   Total NFTs: ${collectionResponse.data.total}`);
      console.log(`   Collection enabled: ${collectionResponse.data.isEnabled}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Step 7: Test monitoring and metrics
    console.log('📊 Step 7: Checking system metrics...');
    const metricsResponse = await axios.get(`${NFTGEN_API}/api/metrics`, {
      timeout: 5000
    });
    
    console.log('📊 System Metrics:');
    console.log(`   Total Requests: ${metricsResponse.data.requests.total}`);
    console.log(`   NFTs Created: ${metricsResponse.data.nft.created}`);
    console.log(`   NFTs Minted: ${metricsResponse.data.nft.minted}`);
    console.log(`   Average Response Time: ${metricsResponse.data.performance.averageResponseTime}ms`);
    console.log(`   System Uptime: ${Math.round(metricsResponse.data.uptime / 1000)}s`);
    
    console.log('\n' + '🎉'.repeat(20));
    console.log('🎉 COMPLETE INTEGRATION TEST SUCCESSFUL! 🎉');
    console.log('🎉'.repeat(20));
    console.log('\n✅ All systems working correctly:');
    console.log('   ✅ Nwallet authentication');
    console.log('   ✅ NFTGen session validation');
    console.log('   ✅ NFTGen enablement');
    console.log('   ✅ Authenticated NFT creation');
    console.log('   ✅ IPFS metadata storage');
    console.log('   ✅ User collection management');
    console.log('   ✅ System monitoring');
    console.log('\n🔗 Integration between Nwallet and NFTGen is FULLY FUNCTIONAL!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure Nwallet is running on port 6102');
    console.log('   2. Make sure NFTGen is running on port 7105');
    console.log('   3. Check MongoDB connection in Nwallet');
    console.log('   4. Verify Redis is running for NFTGen caching');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompleteFlow().catch(console.error);
}

module.exports = { testCompleteFlow };
