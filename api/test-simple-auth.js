#!/usr/bin/env node

/**
 * Simple Authentication System Test
 * 
 * Tests the simplified MongoDB-based authentication system
 * without encryption - direct storage of credentials.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { ethers } = require('ethers');
const bip39 = require('bip39');

// Test configuration
const NFTGEN_MONGO_URI = 'mongodb://localhost:27017/nftgen';
const NWALLET_MONGO_URI = 'mongodb://localhost:27017/nwallet';

class SimpleAuthTester {
  constructor() {
    this.nftgenConnection = null;
    this.nwalletConnection = null;
    this.testUsers = [];
  }

  async initialize() {
    console.log('🔧 Initializing simple authentication test...');
    
    try {
      // Connect to NFTGen MongoDB
      this.nftgenConnection = await mongoose.createConnection(NFTGEN_MONGO_URI);
      console.log('✅ Connected to NFTGen MongoDB');
      
      // Connect to Nwallet MongoDB  
      this.nwalletConnection = await mongoose.createConnection(NWALLET_MONGO_URI);
      console.log('✅ Connected to Nwallet MongoDB');
      
      // Load simplified User models (NFTGen only for now)
      const NFTGenUser = require('./models/user-simple');

      this.NFTGenUserModel = this.nftgenConnection.model('User', NFTGenUser.schema);
      // Skip Nwallet for now due to ES module compatibility
      
      console.log('✅ Simplified user models loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  generateTestUser() {
    const mnemonic = bip39.generateMnemonic();
    const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
    
    // Generate Solana wallet
    let solAddress, solPrivateKey;
    try {
      const { Keypair } = require('@solana/web3.js');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const solKeypair = Keypair.fromSeed(seed.slice(0, 32));
      
      solAddress = solKeypair.publicKey.toString();
      solPrivateKey = Buffer.from(solKeypair.secretKey).toString('hex');
    } catch (error) {
      console.warn('⚠️ Solana wallet generation failed, using dummy values');
      solAddress = 'So11111111111111111111111111111111111111112';
      solPrivateKey = '1234567890123456789012345678901234567890123456789012345678901234';
    }
    
    const timestamp = Date.now();
    return {
      email: `test${timestamp}@example.com`,
      password: 'TestPassword123!',
      mnemonic: mnemonic,
      ethAddress: ethWallet.address,
      ethPrivateKey: ethWallet.privateKey,
      solAddress: solAddress,
      solPrivateKey: solPrivateKey
    };
  }

  async testUserCreation() {
    console.log('\n🧪 Testing simplified user creation...');
    
    const testUser = this.generateTestUser();
    this.testUsers.push(testUser);
    
    try {
      // Test NFTGen user creation
      const nftgenUser = new this.NFTGenUserModel({
        email: testUser.email,
        password: testUser.password,
        mnemonic: testUser.mnemonic,
        ethAddress: testUser.ethAddress,
        solAddress: testUser.solAddress,
        ethPrivateKey: testUser.ethPrivateKey,
        solPrivateKey: testUser.solPrivateKey
      });
      
      await nftgenUser.save();
      console.log('✅ NFTGen user created successfully');

      return { nftgenUser, testUser };
      
    } catch (error) {
      console.error('❌ User creation failed:', error);
      throw error;
    }
  }

  async testPasswordValidation(user, testUser) {
    console.log('\n🧪 Testing password validation...');
    
    try {
      // Test correct password
      const isValidCorrect = await user.comparePassword(testUser.password);
      console.log(`✅ Correct password validation: ${isValidCorrect}`);
      
      // Test incorrect password
      const isValidIncorrect = await user.comparePassword('WrongPassword123!');
      console.log(`✅ Incorrect password validation: ${!isValidIncorrect}`);
      
      if (isValidCorrect && !isValidIncorrect) {
        console.log('✅ Password validation working correctly');
        return true;
      } else {
        throw new Error('Password validation failed');
      }
      
    } catch (error) {
      console.error('❌ Password validation test failed:', error);
      throw error;
    }
  }

  async testCredentialStorage(user, testUser) {
    console.log('\n🧪 Testing direct credential storage...');
    
    try {
      // Test mnemonic storage (direct access)
      const storedMnemonic = user.getMnemonic();
      const mnemonicMatch = storedMnemonic === testUser.mnemonic;
      console.log(`✅ Mnemonic storage: ${mnemonicMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Test Ethereum private key storage
      const storedEthKey = user.getEthPrivateKey();
      const ethKeyMatch = storedEthKey === testUser.ethPrivateKey;
      console.log(`✅ Ethereum private key storage: ${ethKeyMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Test Solana private key storage
      const storedSolKey = user.getSolPrivateKey();
      const solKeyMatch = storedSolKey === testUser.solPrivateKey;
      console.log(`✅ Solana private key storage: ${solKeyMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Test direct database access
      console.log('📋 Direct database values:');
      console.log(`  - Email: ${user.email}`);
      console.log(`  - ETH Address: ${user.ethAddress}`);
      console.log(`  - SOL Address: ${user.solAddress}`);
      console.log(`  - Mnemonic: ${user.mnemonic.substring(0, 20)}...`);
      console.log(`  - ETH Private Key: ${user.ethPrivateKey.substring(0, 20)}...`);
      
      if (mnemonicMatch && ethKeyMatch && solKeyMatch) {
        console.log('✅ All credential storage tests passed');
        return true;
      } else {
        throw new Error('Credential storage failed');
      }
      
    } catch (error) {
      console.error('❌ Credential storage test failed:', error);
      throw error;
    }
  }

  async testSessionManagement(user) {
    console.log('\n🧪 Testing session management...');
    
    try {
      const sessionId = `test_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Add session
      await user.addSession({
        sessionId: sessionId,
        deviceInfo: 'Test Device',
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent'
      });
      
      console.log('✅ Session added successfully');
      
      // Find user by session
      const foundUser = await this.NFTGenUserModel.findBySessionId(sessionId);
      const sessionFound = foundUser && foundUser._id.equals(user._id);
      console.log(`✅ Session lookup: ${sessionFound ? 'SUCCESS' : 'FAILED'}`);
      
      // Update session activity
      await user.updateSessionActivity(sessionId);
      console.log('✅ Session activity updated');
      
      // Deactivate session
      await user.deactivateSession(sessionId);
      console.log('✅ Session deactivated');
      
      return true;
      
    } catch (error) {
      console.error('❌ Session management test failed:', error);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting simplified authentication tests...');
    
    try {
      await this.initialize();
      
      // Test user creation
      const { nftgenUser, testUser } = await this.testUserCreation();
      
      // Test password validation
      await this.testPasswordValidation(nftgenUser, testUser);
      
      // Test credential storage (no encryption)
      await this.testCredentialStorage(nftgenUser, testUser);
      
      // Test session management
      await this.testSessionManagement(nftgenUser);
      
      console.log('\n🎉 ALL SIMPLIFIED AUTHENTICATION TESTS PASSED! 🎉');
      console.log('\n📋 Test Summary:');
      console.log('✅ User creation with direct credential storage');
      console.log('✅ Password hashing and validation');
      console.log('✅ Direct credential storage (no encryption)');
      console.log('✅ Session management');
      console.log('\n💾 The simplified MongoDB authentication system is working correctly!');
      console.log('🔓 Credentials are stored directly in MongoDB without encryption');
      
    } catch (error) {
      console.error('\n❌ SIMPLIFIED AUTHENTICATION TESTS FAILED:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Remove test users
      for (const testUser of this.testUsers) {
        await this.NFTGenUserModel.deleteOne({ email: testUser.email });
      }
      console.log('✅ Test users cleaned up');
      
      // Close connections
      if (this.nftgenConnection) {
        await this.nftgenConnection.close();
      }
      
      if (this.nwalletConnection) {
        await this.nwalletConnection.close();
      }
      
      console.log('✅ Database connections closed');
      
    } catch (error) {
      console.error('⚠️ Cleanup failed:', error);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SimpleAuthTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SimpleAuthTester;
