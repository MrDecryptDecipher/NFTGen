#!/usr/bin/env node

/**
 * Simple Migration Script: File-based Storage to MongoDB
 * 
 * This script migrates existing user data from file-based storage
 * to MongoDB with direct credential storage (no encryption).
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { ethers } = require('ethers');
const bip39 = require('bip39');

// Configuration
const NWALLET_DATA_DIR = './Nwallet/data';
const NFTGEN_MONGO_URI = 'mongodb://localhost:27017/nftgen';
const DEFAULT_PASSWORD = 'ChangeMe123!';

class SimpleMigration {
  constructor() {
    this.connection = null;
    this.UserModel = null;
    this.migratedUsers = [];
    this.errors = [];
  }

  async initialize() {
    console.log('🔧 Initializing simple migration script...');
    
    try {
      // Connect to NFTGen MongoDB only
      this.connection = await mongoose.createConnection(NFTGEN_MONGO_URI);
      console.log('✅ Connected to NFTGen MongoDB');
      
      // Load simplified User model
      const User = require('./NFTGen/api/models/user-simple');
      this.UserModel = this.connection.model('User', User.schema);
      
      console.log('✅ Simple migration script initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize migration script:', error);
      throw error;
    }
  }

  async scanFileBasedUsers() {
    console.log('🔍 Scanning for existing file-based users...');
    
    const users = [];
    
    try {
      // Check wallet_data.json
      const walletDataPath = path.join(NWALLET_DATA_DIR, 'wallet_data.json');
      if (fs.existsSync(walletDataPath)) {
        const walletData = JSON.parse(fs.readFileSync(walletDataPath, 'utf8'));
        console.log(`📁 Found wallet_data.json with ${Object.keys(walletData).length} entries`);
        
        for (const [key, userData] of Object.entries(walletData)) {
          users.push({
            source: 'wallet_data.json',
            key: key,
            ethAddress: userData,
            type: key // 'ethereum' or 'solana'
          });
        }
      }
      
      // Check session files for additional addresses
      const sessionFiles = fs.readdirSync(NWALLET_DATA_DIR)
        .filter(file => file.startsWith('session_') && file.endsWith('.json'));
      
      console.log(`📁 Found ${sessionFiles.length} session files`);
      
      const uniqueAddresses = new Set();
      
      for (const sessionFile of sessionFiles) {
        try {
          const sessionPath = path.join(NWALLET_DATA_DIR, sessionFile);
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          
          if (sessionData.address && !uniqueAddresses.has(sessionData.address)) {
            uniqueAddresses.add(sessionData.address);
            users.push({
              source: sessionFile,
              ethAddress: sessionData.address,
              timestamp: sessionData.timestamp,
              type: 'session'
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse session file ${sessionFile}:`, error.message);
        }
      }
      
      console.log(`✅ Found ${users.length} unique addresses to migrate`);
      return users;
      
    } catch (error) {
      console.error('❌ Failed to scan file-based users:', error);
      return [];
    }
  }

  generateUserFromAddress(addressData) {
    // Generate new mnemonic and credentials for each address
    const mnemonic = bip39.generateMnemonic();
    const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
    
    // Use the existing address if it's an Ethereum address, otherwise generate new
    let ethAddress = addressData.ethAddress;
    let ethPrivateKey = ethWallet.privateKey;
    
    // If the existing address doesn't match our generated wallet, use the existing one
    // but note that we won't have the private key for it
    if (ethAddress && ethAddress !== ethWallet.address) {
      console.log(`⚠️ Using existing address ${ethAddress}, but generating new credentials`);
      // Keep the existing address but use new credentials
      ethAddress = addressData.ethAddress;
    } else {
      ethAddress = ethWallet.address;
    }
    
    // Generate Solana credentials
    let solAddress = 'So11111111111111111111111111111111111111112';
    let solPrivateKey = '1234567890123456789012345678901234567890123456789012345678901234';
    
    try {
      const { Keypair } = require('@solana/web3.js');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const solKeypair = Keypair.fromSeed(seed.slice(0, 32));
      
      solAddress = solKeypair.publicKey.toString();
      solPrivateKey = Buffer.from(solKeypair.secretKey).toString('hex');
    } catch (error) {
      console.warn('⚠️ Solana wallet generation failed, using dummy values');
    }
    
    // Generate email from address
    const email = `user_${ethAddress.slice(2, 8).toLowerCase()}@migrated.local`;
    
    return {
      email,
      password: DEFAULT_PASSWORD,
      mnemonic,
      ethAddress,
      ethPrivateKey,
      solAddress,
      solPrivateKey,
      originalData: addressData
    };
  }

  async migrateUser(addressData) {
    try {
      console.log(`🔄 Migrating address: ${addressData.ethAddress}`);
      
      // Check if user already exists
      const existingUser = await this.UserModel.findOne({ 
        ethAddress: addressData.ethAddress 
      });
      
      if (existingUser) {
        console.log(`⚠️ User already exists in MongoDB, skipping: ${addressData.ethAddress}`);
        return { skipped: true, reason: 'already_exists' };
      }
      
      // Generate user data
      const userData = this.generateUserFromAddress(addressData);
      
      // Create user in MongoDB
      const user = new this.UserModel({
        email: userData.email,
        password: userData.password,
        mnemonic: userData.mnemonic,
        ethAddress: userData.ethAddress,
        solAddress: userData.solAddress,
        ethPrivateKey: userData.ethPrivateKey,
        solPrivateKey: userData.solPrivateKey,
        isEmailVerified: false,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        profile: {
          firstName: '',
          lastName: ''
        }
      });
      
      await user.save();
      console.log(`✅ Created user in MongoDB: ${userData.email}`);
      
      return {
        success: true,
        email: userData.email,
        ethAddress: userData.ethAddress,
        solAddress: userData.solAddress,
        originalAddress: addressData.ethAddress
      };
      
    } catch (error) {
      console.error(`❌ Failed to migrate address ${addressData.ethAddress}:`, error);
      return {
        success: false,
        error: error.message,
        addressData: addressData
      };
    }
  }

  async runMigration() {
    console.log('🚀 Starting simple user migration process...');
    
    try {
      await this.initialize();
      
      const addresses = await this.scanFileBasedUsers();
      
      if (addresses.length === 0) {
        console.log('ℹ️ No addresses found to migrate');
        return;
      }
      
      console.log(`🔄 Migrating ${addresses.length} addresses...`);
      
      for (const addressData of addresses) {
        const result = await this.migrateUser(addressData);
        
        if (result.success) {
          this.migratedUsers.push(result);
        } else if (result.skipped) {
          console.log(`⏭️ Skipped address: ${result.reason}`);
        } else {
          this.errors.push(result);
        }
      }
      
      // Print summary
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Successfully migrated: ${this.migratedUsers.length} users`);
      console.log(`❌ Failed migrations: ${this.errors.length} users`);
      
      if (this.migratedUsers.length > 0) {
        console.log('\n✅ Migrated Users:');
        this.migratedUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.ethAddress})`);
        });
        
        console.log(`\n🔐 Default Password: ${DEFAULT_PASSWORD}`);
        console.log('⚠️ Users should change their password after first login!');
        console.log('💾 All credentials are stored directly in MongoDB (no encryption)');
      }
      
      if (this.errors.length > 0) {
        console.log('\n❌ Failed Migrations:');
        this.errors.forEach(error => {
          console.log(`  - ${error.addressData?.ethAddress}: ${error.error}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up connections...');
    
    if (this.connection) {
      await this.connection.close();
    }
    
    console.log('✅ Simple migration script completed');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new SimpleMigration();
  migration.runMigration().catch(console.error);
}

module.exports = SimpleMigration;
