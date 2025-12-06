#!/usr/bin/env node

/**
 * Authentication System Test Script
 * 
 * Tests the complete MongoDB-based authentication system
 * for both NFTGen and Nwallet projects.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { ethers } = require('ethers');
const bip39 = require('bip39');

// Test configuration
const NFTGEN_MONGO_URI = 'mongodb://localhost:27017/nftgen';
const NWALLET_MONGO_URI = 'mongodb://localhost:27017/nwallet';

class AuthenticationTester {
  constructor() {
    this.nftgenConnection = null;
    this.nwalletConnection = null;
    this.testUsers = [];
  }

  async initialize() {
    console.log('🔧 Initializing authentication test...');
    
    try {
      // Connect to NFTGen MongoDB
      this.nftgenConnection = await mongoose.createConnection(NFTGEN_MONGO_URI);
      console.log('✅ Connected to NFTGen MongoDB');
      
      // Connect to Nwallet MongoDB  
      this.nwalletConnection = await mongoose.createConnection(NWALLET_MONGO_URI);
      console.log('✅ Connected to Nwallet MongoDB');
      
      // Load User models
      const NFTGenUser = require('./NFTGen/api/models/user');
      const NwalletUser = require('./Nwallet/models/user');
      
      this.NFTGenUserModel = this.nftgenConnection.model('User', NFTGenUser.schema);
      this.NwalletUserModel = this.nwalletConnection.model('User', NwalletUser.schema);
      
      console.log('✅ User models loaded successfully');
      
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
    console.log('\n🧪 Testing user creation...');
    
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
      
      // Test Nwallet user creation
      const nwalletUser = new this.NwalletUserModel({
        email: testUser.email,
        password: testUser.password,
        mnemonic: testUser.mnemonic,
        ethAddress: testUser.ethAddress,
        solAddress: testUser.solAddress,
        ethPrivateKey: testUser.ethPrivateKey,
        solPrivateKey: testUser.solPrivateKey
      });
      
      await nwalletUser.save();
      console.log('✅ Nwallet user created successfully');
      
      return { nftgenUser, nwalletUser, testUser };
      
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

  async testCredentialDecryption(user, testUser) {
    console.log('\n🧪 Testing credential decryption...');
    
    try {
      // Test mnemonic decryption
      const decryptedMnemonic = user.getMnemonic();
      const mnemonicMatch = decryptedMnemonic === testUser.mnemonic;
      console.log(`✅ Mnemonic decryption: ${mnemonicMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Test Ethereum private key decryption
      const decryptedEthKey = user.getEthPrivateKey();
      const ethKeyMatch = decryptedEthKey === testUser.ethPrivateKey;
      console.log(`✅ Ethereum private key decryption: ${ethKeyMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Test Solana private key decryption
      const decryptedSolKey = user.getSolPrivateKey();
      const solKeyMatch = decryptedSolKey === testUser.solPrivateKey;
      console.log(`✅ Solana private key decryption: ${solKeyMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (mnemonicMatch && ethKeyMatch && solKeyMatch) {
        console.log('✅ All credential decryption tests passed');
        return true;
      } else {
        throw new Error('Credential decryption failed');
      }
      
    } catch (error) {
      console.error('❌ Credential decryption test failed:', error);
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

  async testUserLookup(testUser) {
    console.log('\n🧪 Testing user lookup methods...');
    
    try {
      // Test lookup by email
      const userByEmail = await this.NFTGenUserModel.findByEmail(testUser.email);
      const emailLookup = userByEmail && userByEmail.email === testUser.email;
      console.log(`✅ Email lookup: ${emailLookup ? 'SUCCESS' : 'FAILED'}`);
      
      // Test lookup by address
      const userByAddress = await this.NFTGenUserModel.findByAddress(testUser.ethAddress);
      const addressLookup = userByAddress && userByAddress.ethAddress === testUser.ethAddress;
      console.log(`✅ Address lookup: ${addressLookup ? 'SUCCESS' : 'FAILED'}`);
      
      if (emailLookup && addressLookup) {
        console.log('✅ All user lookup tests passed');
        return true;
      } else {
        throw new Error('User lookup failed');
      }
      
    } catch (error) {
      console.error('❌ User lookup test failed:', error);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive authentication tests...');
    
    try {
      await this.initialize();
      
      // Test user creation
      const { nftgenUser, nwalletUser, testUser } = await this.testUserCreation();
      
      // Test password validation
      await this.testPasswordValidation(nftgenUser, testUser);
      
      // Test credential decryption
      await this.testCredentialDecryption(nftgenUser, testUser);
      
      // Test session management
      await this.testSessionManagement(nftgenUser);
      
      // Test user lookup
      await this.testUserLookup(testUser);
      
      console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED! 🎉');
      console.log('\n📋 Test Summary:');
      console.log('✅ User creation and encryption');
      console.log('✅ Password hashing and validation');
      console.log('✅ Credential encryption and decryption');
      console.log('✅ Session management');
      console.log('✅ User lookup methods');
      console.log('\n🔐 The MongoDB authentication system is working correctly!');
      
    } catch (error) {
      console.error('\n❌ AUTHENTICATION TESTS FAILED:', error);
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
        await this.NwalletUserModel.deleteOne({ email: testUser.email });
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
  const tester = new AuthenticationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AuthenticationTester;
