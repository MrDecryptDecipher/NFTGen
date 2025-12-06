#!/usr/bin/env node

/**
 * Migration Script: File-based Storage to MongoDB
 * 
 * This script migrates existing user data from file-based storage
 * (JSON files in Nwallet/data) to MongoDB with encrypted credentials.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const bip39 = require('bip39');
const { ethers } = require('ethers');

// Import User models
const NFTGenUser = require('./NFTGen/api/models/user');
const NwalletUser = require('./Nwallet/models/user');

// Configuration
const NWALLET_DATA_DIR = './Nwallet/data';
const NFTGEN_MONGO_URI = 'mongodb://localhost:27017/nftgen';
const NWALLET_MONGO_URI = 'mongodb://localhost:27017/nwallet';

// Default password for migrated users (they should change this)
const DEFAULT_PASSWORD = 'ChangeMe123!';

class UserMigration {
  constructor() {
    this.nftgenConnection = null;
    this.nwalletConnection = null;
    this.migratedUsers = [];
    this.errors = [];
  }

  async initialize() {
    console.log('🔧 Initializing migration script...');
    
    try {
      // Connect to both databases
      this.nftgenConnection = await mongoose.createConnection(NFTGEN_MONGO_URI);
      console.log('✅ Connected to NFTGen MongoDB');
      
      this.nwalletConnection = await mongoose.createConnection(NWALLET_MONGO_URI);
      console.log('✅ Connected to Nwallet MongoDB');
      
      // Bind models to connections
      this.NFTGenUserModel = this.nftgenConnection.model('User', NFTGenUser.schema);
      this.NwalletUserModel = this.nwalletConnection.model('User', NwalletUser.schema);
      
      console.log('✅ Migration script initialized successfully');
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
          if (userData.email && userData.ethAddress) {
            users.push({
              source: 'wallet_data.json',
              key: key,
              ...userData
            });
          }
        }
      }
      
      // Check session files
      const sessionFiles = fs.readdirSync(NWALLET_DATA_DIR)
        .filter(file => file.startsWith('session_') && file.endsWith('.json'));
      
      console.log(`📁 Found ${sessionFiles.length} session files`);
      
      for (const sessionFile of sessionFiles) {
        try {
          const sessionPath = path.join(NWALLET_DATA_DIR, sessionFile);
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          
          if (sessionData.address && !users.find(u => u.ethAddress === sessionData.address)) {
            users.push({
              source: sessionFile,
              ethAddress: sessionData.address,
              timestamp: sessionData.timestamp,
              ...sessionData
            });
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse session file ${sessionFile}:`, error.message);
        }
      }
      
      console.log(`✅ Found ${users.length} unique users to migrate`);
      return users;
      
    } catch (error) {
      console.error('❌ Failed to scan file-based users:', error);
      return [];
    }
  }

  generateMissingCredentials(userData) {
    const credentials = { ...userData };
    
    // Generate mnemonic if missing
    if (!credentials.mnemonic) {
      credentials.mnemonic = bip39.generateMnemonic();
      console.log(`🔑 Generated new mnemonic for user ${credentials.email || credentials.ethAddress}`);
    }
    
    // Generate Ethereum credentials if missing
    if (!credentials.ethAddress || !credentials.ethPrivateKey) {
      const ethWallet = ethers.Wallet.fromPhrase(credentials.mnemonic);
      credentials.ethAddress = ethWallet.address;
      credentials.ethPrivateKey = ethWallet.privateKey;
      console.log(`🔑 Generated Ethereum credentials for user`);
    }
    
    // Generate Solana credentials if missing
    if (!credentials.solAddress || !credentials.solPrivateKey) {
      try {
        const { Keypair } = require('@solana/web3.js');
        const seed = bip39.mnemonicToSeedSync(credentials.mnemonic);
        const solKeypair = Keypair.fromSeed(seed.slice(0, 32));
        
        credentials.solAddress = solKeypair.publicKey.toString();
        credentials.solPrivateKey = Buffer.from(solKeypair.secretKey).toString('hex');
        console.log(`🔑 Generated Solana credentials for user`);
      } catch (error) {
        console.warn('⚠️ Failed to generate Solana credentials:', error.message);
      }
    }
    
    // Generate email if missing
    if (!credentials.email) {
      credentials.email = `user_${credentials.ethAddress.slice(2, 8)}@migrated.local`;
      console.log(`📧 Generated email: ${credentials.email}`);
    }
    
    return credentials;
  }

  async migrateUser(userData) {
    try {
      console.log(`🔄 Migrating user: ${userData.email || userData.ethAddress}`);
      
      // Generate missing credentials
      const completeUserData = this.generateMissingCredentials(userData);
      
      // Check if user already exists in either database
      const existingNFTGenUser = await this.NFTGenUserModel.findOne({ 
        $or: [
          { email: completeUserData.email },
          { ethAddress: completeUserData.ethAddress }
        ]
      });
      
      const existingNwalletUser = await this.NwalletUserModel.findOne({ 
        $or: [
          { email: completeUserData.email },
          { ethAddress: completeUserData.ethAddress }
        ]
      });
      
      if (existingNFTGenUser || existingNwalletUser) {
        console.log(`⚠️ User already exists in MongoDB, skipping: ${completeUserData.email}`);
        return { skipped: true, reason: 'already_exists' };
      }
      
      // Create user data object
      const userObj = {
        email: completeUserData.email.toLowerCase(),
        password: DEFAULT_PASSWORD, // Will be hashed by pre-save middleware
        mnemonic: completeUserData.mnemonic, // Will be encrypted by pre-save middleware
        ethAddress: completeUserData.ethAddress,
        solAddress: completeUserData.solAddress,
        ethPrivateKey: completeUserData.ethPrivateKey, // Will be encrypted by pre-save middleware
        solPrivateKey: completeUserData.solPrivateKey, // Will be encrypted by pre-save middleware
        isEmailVerified: false,
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        profile: {
          firstName: completeUserData.firstName || '',
          lastName: completeUserData.lastName || ''
        },
        settings: {
          defaultNetwork: 'ethereum',
          twoFactorEnabled: false,
          emailNotifications: true,
          theme: 'dark'
        }
      };
      
      // Create user in NFTGen database
      const nftgenUser = new this.NFTGenUserModel(userObj);
      await nftgenUser.save();
      console.log(`✅ Created user in NFTGen database: ${userObj.email}`);
      
      // Create user in Nwallet database
      const nwalletUser = new this.NwalletUserModel(userObj);
      await nwalletUser.save();
      console.log(`✅ Created user in Nwallet database: ${userObj.email}`);
      
      return {
        success: true,
        email: userObj.email,
        ethAddress: userObj.ethAddress,
        solAddress: userObj.solAddress
      };
      
    } catch (error) {
      console.error(`❌ Failed to migrate user ${userData.email || userData.ethAddress}:`, error);
      return {
        success: false,
        error: error.message,
        userData: userData
      };
    }
  }

  async runMigration() {
    console.log('🚀 Starting user migration process...');
    
    try {
      await this.initialize();
      
      const users = await this.scanFileBasedUsers();
      
      if (users.length === 0) {
        console.log('ℹ️ No users found to migrate');
        return;
      }
      
      console.log(`🔄 Migrating ${users.length} users...`);
      
      for (const userData of users) {
        const result = await this.migrateUser(userData);
        
        if (result.success) {
          this.migratedUsers.push(result);
        } else if (result.skipped) {
          console.log(`⏭️ Skipped user: ${result.reason}`);
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
      }
      
      if (this.errors.length > 0) {
        console.log('\n❌ Failed Migrations:');
        this.errors.forEach(error => {
          console.log(`  - ${error.userData?.email || error.userData?.ethAddress}: ${error.error}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up connections...');
    
    if (this.nftgenConnection) {
      await this.nftgenConnection.close();
    }
    
    if (this.nwalletConnection) {
      await this.nwalletConnection.close();
    }
    
    console.log('✅ Migration script completed');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new UserMigration();
  migration.runMigration().catch(console.error);
}

module.exports = UserMigration;
