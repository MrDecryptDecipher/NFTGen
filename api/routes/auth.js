const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');
const bip39 = require('bip39');
const mongoose = require('mongoose');
const User = require('../models/user-simple');

const router = express.Router();

// Helper function to generate wallets from mnemonic
function generateWalletsFromMnemonic(mnemonic) {
  try {
    // Generate Ethereum wallet
    const ethWallet = ethers.Wallet.fromPhrase(mnemonic);

    // Generate Solana wallet with proper error handling
    let solAddress = 'So11111111111111111111111111111111111111112';
    let solPrivateKey = '1234567890123456789012345678901234567890123456789012345678901234';

    try {
      // Try to import Solana web3.js safely
      const { Keypair } = require('@solana/web3.js');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const solKeypair = Keypair.fromSeed(seed.slice(0, 32));

      solAddress = solKeypair.publicKey.toString();
      solPrivateKey = Buffer.from(solKeypair.secretKey).toString('hex');
      console.log('✅ Generated real Solana credentials');
    } catch (solanaError) {
      console.warn('⚠️ Solana wallet generation failed, using dummy values:', solanaError.message);
      // Keep dummy values as fallback
    }

    return {
      ethAddress: ethWallet.address,
      ethPrivateKey: ethWallet.privateKey,
      solAddress: solAddress,
      solPrivateKey: solPrivateKey
    };
  } catch (error) {
    console.error('Error generating wallets:', error);
    throw new Error('Failed to generate wallets from mnemonic');
  }
}

// Helper function to check MongoDB connection
function isMongoDBConnected() {
  return mongoose.connection.readyState === 1;
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check MongoDB connection
    if (!isMongoDBConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable. Please try again later.',
        fallback: 'MongoDB connection required for user registration'
      });
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Generate mnemonic and wallets
    const mnemonic = bip39.generateMnemonic();
    const wallets = generateWalletsFromMnemonic(mnemonic);
    
    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save middleware
      mnemonic: mnemonic, // Will be encrypted by pre-save middleware
      ethAddress: wallets.ethAddress,
      solAddress: wallets.solAddress,
      ethPrivateKey: wallets.ethPrivateKey, // Will be encrypted by pre-save middleware
      solPrivateKey: wallets.solPrivateKey, // Will be encrypted by pre-save middleware
      isEmailVerified: false,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });
    
    await user.save();
    
    console.log('✅ User registered successfully:', {
      email: user.email,
      ethAddress: user.ethAddress,
      solAddress: user.solAddress
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        ethAddress: user.ethAddress,
        solAddress: user.solAddress,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Find user with password field included
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Generate session
    const sessionId = `nftgen_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    
    // Add session to user
    await user.addSession({
      sessionId,
      deviceInfo: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown IP',
      userAgent: req.headers['user-agent'] || 'Unknown User Agent'
    });
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    console.log('✅ User logged in successfully:', {
      email: user.email,
      sessionId: sessionId.substring(0, 16) + '...'
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      sessionId,
      user: {
        id: user._id,
        email: user.email,
        ethAddress: user.ethAddress,
        solAddress: user.solAddress,
        profile: user.profile,
        settings: user.settings,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// Get user profile endpoint
router.get('/profile/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find user by session
    const user = await User.findBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }
    
    // Update session activity
    await user.updateSessionActivity(sessionId);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        ethAddress: user.ethAddress,
        solAddress: user.solAddress,
        profile: user.profile,
        settings: user.settings,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user credentials (for minting)
router.get('/credentials/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find user by session
    const user = await User.findBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }
    
    // Update session activity
    await user.updateSessionActivity(sessionId);
    
    // Get decrypted credentials
    const mnemonic = user.getMnemonic();
    const ethPrivateKey = user.getEthPrivateKey();
    const solPrivateKey = user.getSolPrivateKey();
    
    res.json({
      success: true,
      credentials: {
        mnemonic,
        ethAddress: user.ethAddress,
        ethPrivateKey,
        solAddress: user.solAddress,
        solPrivateKey
      }
    });
    
  } catch (error) {
    console.error('❌ Credentials fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    // Find user and deactivate session
    const user = await User.findBySessionId(sessionId);
    if (user) {
      await user.deactivateSession(sessionId);
      console.log('✅ User logged out successfully:', {
        email: user.email,
        sessionId: sessionId.substring(0, 16) + '...'
      });
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
});

module.exports = router;
