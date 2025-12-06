const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Helper functions for encryption/decryption
function encrypt(text) {
  if (!text) return null;

  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
}

function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;

  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// Wallet schema for storing multiple wallet addresses
const walletSchema = new mongoose.Schema({
  network: {
    type: String,
    required: true,
    enum: ['ethereum', 'solana', 'bitcoin', 'polygon']
  },
  address: {
    type: String,
    required: true
  },
  privateKey: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User schema with comprehensive authentication and wallet management
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  
  // Master mnemonic (encrypted)
  mnemonic: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  
  // Primary wallet addresses (for quick access)
  ethAddress: {
    type: String,
    required: true
  },
  
  solAddress: {
    type: String,
    required: true
  },
  
  // Encrypted private keys for primary wallets
  ethPrivateKey: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  
  solPrivateKey: {
    encrypted: String,
    iv: String,
    authTag: String
  },
  
  // Additional wallets (for multi-chain support)
  wallets: [walletSchema],
  
  // User profile information
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String,
    website: String,
    twitter: String,
    discord: String
  },
  
  // Account settings
  settings: {
    defaultNetwork: {
      type: String,
      enum: ['ethereum', 'solana'],
      default: 'ethereum'
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    }
  },
  
  // Session management
  sessions: [{
    sessionId: String,
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: String,
  
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastLogin: Date
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ ethAddress: 1 });
userSchema.index({ solAddress: 1 });
userSchema.index({ 'sessions.sessionId': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with bcrypt
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for encrypting sensitive data
userSchema.pre('save', function(next) {
  // Encrypt mnemonic if modified
  if (this.isModified('mnemonic') && typeof this.mnemonic === 'string') {
    this.mnemonic = encrypt(this.mnemonic);
  }
  
  // Encrypt private keys if modified
  if (this.isModified('ethPrivateKey') && typeof this.ethPrivateKey === 'string') {
    this.ethPrivateKey = encrypt(this.ethPrivateKey);
  }
  
  if (this.isModified('solPrivateKey') && typeof this.solPrivateKey === 'string') {
    this.solPrivateKey = encrypt(this.solPrivateKey);
  }
  
  // Encrypt wallet private keys
  if (this.wallets && this.wallets.length > 0) {
    this.wallets.forEach(wallet => {
      if (wallet.privateKey && typeof wallet.privateKey === 'string') {
        wallet.privateKey = encrypt(wallet.privateKey);
      }
    });
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getMnemonic = function() {
  return decrypt(this.mnemonic);
};

userSchema.methods.getEthPrivateKey = function() {
  return decrypt(this.ethPrivateKey);
};

userSchema.methods.getSolPrivateKey = function() {
  return decrypt(this.solPrivateKey);
};

userSchema.methods.getWalletPrivateKey = function(network) {
  const wallet = this.wallets.find(w => w.network === network && w.isActive);
  return wallet ? decrypt(wallet.privateKey) : null;
};

userSchema.methods.addSession = function(sessionData) {
  this.sessions.push({
    sessionId: sessionData.sessionId,
    deviceInfo: sessionData.deviceInfo || 'Unknown Device',
    ipAddress: sessionData.ipAddress || 'Unknown IP',
    userAgent: sessionData.userAgent || 'Unknown User Agent',
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true
  });
  
  // Keep only last 10 sessions
  if (this.sessions.length > 10) {
    this.sessions = this.sessions.slice(-10);
  }
  
  return this.save();
};

userSchema.methods.updateSessionActivity = function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

userSchema.methods.deactivateSession = function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password +mnemonic +ethPrivateKey +solPrivateKey');
};

userSchema.statics.findByAddress = function(address) {
  return this.findOne({
    $or: [
      { ethAddress: address },
      { solAddress: address },
      { 'wallets.address': address }
    ]
  });
};

userSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ 'sessions.sessionId': sessionId, 'sessions.isActive': true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
