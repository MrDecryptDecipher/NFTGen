const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Comprehensive NFT System Testing Suite
class NFTTestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:7105';
    this.testResults = [];
    this.testUser = {
      sessionId: 'test-session-12345',
      address: '0x56866D43dC757b3F683cF35d300f2Bc0d1A8A1BD'
    };
  }

  // Helper method to make HTTP requests
  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method
    };

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        options.body = data;
        // Don't set Content-Type for FormData - let the browser set it with boundary
        if (headers && Object.keys(headers).length > 0) {
          options.headers = { ...headers };
          delete options.headers['Content-Type'];
        }
      } else {
        options.headers = {
          'Content-Type': 'application/json',
          ...headers
        };
        options.body = JSON.stringify(data);
      }
    } else if (method === 'GET' && headers && Object.keys(headers).length > 0) {
      options.headers = headers;
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      return { success: response.ok, status: response.status, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test 1: API Health and Connectivity
  async testAPIHealth() {
    console.log('🧪 Test 1: API Health and Connectivity');
    
    try {
      const result = await this.makeRequest('GET', '/api/mint/test');
      
      if (result.success && result.data.contractStandard === 'ERC1155') {
        console.log('✅ API health check passed');
        this.testResults.push({ test: 'API Health', status: 'PASS', details: result.data });
        return true;
      } else {
        console.log('❌ API health check failed');
        this.testResults.push({ test: 'API Health', status: 'FAIL', details: result });
        return false;
      }
    } catch (error) {
      console.log('❌ API health check error:', error.message);
      this.testResults.push({ test: 'API Health', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Test 2: Pinata IPFS Service
  async testPinataService() {
    console.log('🧪 Test 2: Pinata IPFS Service');

    try {
      // Test the Pinata service directly using the existing test
      const RealPinataService = require('./services/realPinataService');
      const pinataService = new RealPinataService();

      // Initialize service
      await pinataService.initialize();

      // Test image buffer
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

      // Test file upload
      const fileUpload = await pinataService.uploadFile(testImageBuffer, 'test-comprehensive.png', {
        contentType: 'image/png'
      });

      // Test metadata upload
      const metadataUpload = await pinataService.uploadMetadata({
        name: 'Test Comprehensive NFT',
        description: 'Testing Pinata IPFS integration in comprehensive suite',
        image: fileUpload.imageUrl,
        attributes: [
          { trait_type: 'Test', value: 'Comprehensive' }
        ]
      });

      const result = {
        success: true,
        data: {
          ipfs: {
            imageCID: fileUpload.cid,
            metadataCID: metadataUpload.cid,
            imageUrl: fileUpload.imageUrl,
            metadataUrl: metadataUpload.metadataUrl
          }
        }
      };
      
      if (result.success && result.data.ipfs && result.data.ipfs.imageCID) {
        console.log('✅ Pinata IPFS service test passed');
        console.log('🔍 Image CID:', result.data.ipfs.imageCID);
        console.log('🔍 Metadata CID:', result.data.ipfs.metadataCID);
        this.testResults.push({
          test: 'Pinata IPFS',
          status: 'PASS',
          details: {
            imageCID: result.data.ipfs.imageCID,
            metadataCID: result.data.ipfs.metadataCID,
            transactionHash: result.data.transactionHash
          }
        });
        return result.data;
      } else {
        console.log('❌ Pinata IPFS service test failed');
        console.log('❌ Error details:', JSON.stringify(result, null, 2));
        this.testResults.push({
          test: 'Pinata IPFS',
          status: 'FAIL',
          details: result,
          error: result.data?.error || result.error || 'Unknown error'
        });
        return false;
      }
    } catch (error) {
      console.log('❌ Pinata IPFS service error:', error.message);
      this.testResults.push({ test: 'Pinata IPFS', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Test 3: Blockchain Balance Check
  async testBalanceCheck() {
    console.log('🧪 Test 3: Blockchain Balance Check');
    
    try {
      const result = await this.makeRequest('GET', `/api/mint/balance/${this.testUser.address}`);
      
      if (result.success && result.data.ethBalance) {
        console.log('✅ Balance check passed');
        console.log('💰 ETH Balance:', result.data.ethBalance);
        this.testResults.push({ 
          test: 'Balance Check', 
          status: 'PASS', 
          details: { balance: result.data.ethBalance }
        });
        return true;
      } else {
        console.log('❌ Balance check failed');
        this.testResults.push({ test: 'Balance Check', status: 'FAIL', details: result });
        return false;
      }
    } catch (error) {
      console.log('❌ Balance check error:', error.message);
      this.testResults.push({ test: 'Balance Check', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Test 4: Webhook Service
  async testWebhookService() {
    console.log('🧪 Test 4: Webhook Service');
    
    try {
      const result = await this.makeRequest('GET', '/api/webhooks/status');
      
      if (result.success && result.data.service === 'Alchemy Transaction Monitoring') {
        console.log('✅ Webhook service test passed');
        console.log('🔔 Service:', result.data.service);
        console.log('🔔 Initialized:', result.data.initialized);
        this.testResults.push({ 
          test: 'Webhook Service', 
          status: 'PASS', 
          details: result.data
        });
        return true;
      } else {
        console.log('❌ Webhook service test failed');
        this.testResults.push({ test: 'Webhook Service', status: 'FAIL', details: result });
        return false;
      }
    } catch (error) {
      console.log('❌ Webhook service error:', error.message);
      this.testResults.push({ test: 'Webhook Service', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Test 5: Platform Statistics
  async testPlatformStats() {
    console.log('🧪 Test 5: Platform Statistics');
    
    try {
      const result = await this.makeRequest('GET', '/api/mint/platform-stats');
      
      if (result.success && result.data.statistics) {
        console.log('✅ Platform statistics test passed');
        console.log('📊 Total Users:', result.data.statistics.totalUsers);
        console.log('🎨 Total NFTs Minted:', result.data.statistics.totalNFTsMinted);
        this.testResults.push({ 
          test: 'Platform Statistics', 
          status: 'PASS', 
          details: result.data.statistics
        });
        return true;
      } else {
        console.log('❌ Platform statistics test failed');
        this.testResults.push({ test: 'Platform Statistics', status: 'FAIL', details: result });
        return false;
      }
    } catch (error) {
      console.log('❌ Platform statistics error:', error.message);
      this.testResults.push({ test: 'Platform Statistics', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Test 6: Token Balance Check (if we have a minted token)
  async testTokenBalance(tokenId = '1') {
    console.log('🧪 Test 6: ERC1155 Token Balance Check');
    
    try {
      const result = await this.makeRequest('GET', `/api/mint/token-balance/${this.testUser.address}/${tokenId}`);
      
      if (result.success) {
        console.log('✅ Token balance check passed');
        console.log('🎨 Token Balance:', result.data.balance);
        console.log('✅ Token Exists:', result.data.exists);
        this.testResults.push({ 
          test: 'Token Balance', 
          status: 'PASS', 
          details: { 
            balance: result.data.balance, 
            exists: result.data.exists,
            tokenURI: result.data.tokenURI
          }
        });
        return true;
      } else {
        console.log('❌ Token balance check failed');
        this.testResults.push({ test: 'Token Balance', status: 'FAIL', details: result });
        return false;
      }
    } catch (error) {
      console.log('❌ Token balance check error:', error.message);
      this.testResults.push({ test: 'Token Balance', status: 'ERROR', error: error.message });
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive NFT System Test Suite...\n');
    
    const tests = [
      () => this.testAPIHealth(),
      () => this.testBalanceCheck(),
      () => this.testWebhookService(),
      () => this.testPlatformStats(),
      () => this.testTokenBalance(),
      () => this.testPinataService() // Run this last as it's most resource intensive
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i]();
        if (result) passedTests++;
        console.log(''); // Add spacing between tests
      } catch (error) {
        console.error(`💥 Test ${i + 1} crashed:`, error.message);
        this.testResults.push({ test: `Test ${i + 1}`, status: 'CRASH', error: error.message });
      }
    }

    // Generate test report
    this.generateTestReport(passedTests, totalTests);
    
    return {
      passed: passedTests,
      total: totalTests,
      success: passedTests === totalTests,
      results: this.testResults
    };
  }

  // Generate comprehensive test report
  generateTestReport(passed, total) {
    console.log('📋 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`📊 Tests Passed: ${passed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('');

    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : '💥';
      console.log(`${status} ${index + 1}. ${result.test}: ${result.status}`);
      
      if (result.status === 'PASS' && result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2).substring(0, 100)}...`);
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('');
    console.log('🎯 Test Summary:');
    console.log(`   - API Health: ${this.getTestStatus('API Health')}`);
    console.log(`   - Balance Check: ${this.getTestStatus('Balance Check')}`);
    console.log(`   - Webhook Service: ${this.getTestStatus('Webhook Service')}`);
    console.log(`   - Platform Stats: ${this.getTestStatus('Platform Statistics')}`);
    console.log(`   - Token Balance: ${this.getTestStatus('Token Balance')}`);
    console.log(`   - Pinata IPFS: ${this.getTestStatus('Pinata IPFS')}`);
  }

  getTestStatus(testName) {
    const result = this.testResults.find(r => r.test === testName);
    return result ? result.status : 'NOT RUN';
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    const testSuite = new NFTTestSuite();
    const results = await testSuite.runAllTests();
    
    if (results.success) {
      console.log('\n🎉 All tests passed! NFT system is fully functional.');
      process.exit(0);
    } else {
      console.log(`\n⚠️ ${results.total - results.passed} test(s) failed. Check the report above.`);
      process.exit(1);
    }
  })();
}

module.exports = NFTTestSuite;
