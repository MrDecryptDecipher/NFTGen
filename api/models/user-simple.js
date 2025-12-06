const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Handle mongoose connection gracefully
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error in user model:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected in user model');
});

// Simple User Schema - No Encryption
const userSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  
  // Wallet credentials - stored directly (no encryption)
  mnemonic: {
    type: String,
    required: true
  },
  
  ethAddress: {
    type: String,
    required: true
  },
  
  ethPrivateKey: {
    type: String,
    required: true
  },
  
  solAddress: {
    type: String,
    required: false,
    default: 'So11111111111111111111111111111111111111112'
  },

  solPrivateKey: {
    type: String,
    required: false,
    default: '1234567890123456789012345678901234567890123456789012345678901234'
  },
  
  // User profile
  profile: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' }
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: {
    type: String,
    default: null
  },
  
  // Session management
  sessions: [{
    sessionId: {
      type: String,
      required: true
    },
    deviceInfo: {
      type: String,
      default: 'Unknown Device'
    },
    ipAddress: {
      type: String,
      default: 'Unknown IP'
    },
    userAgent: {
      type: String,
      default: 'Unknown User Agent'
    },
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
  
  // Settings
  settings: {
    defaultNetwork: {
      type: String,
      enum: ['ethereum', 'solana', 'polygon', 'binance'],
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
  
  // NFT and blockchain activity tracking
  nftActivity: {
    totalMinted: {
      type: Number,
      default: 0
    },
    totalSpentOnGas: {
      type: String, // Store as string to handle large numbers
      default: '0'
    },
    lastMintedAt: {
      type: Date,
      default: null
    },
    favoriteContract: {
      type: String,
      default: ''
    }
  },

  // NFT collection tracking
  mintedNFTs: [{
    tokenId: {
      type: String,
      required: true
    },
    contractAddress: {
      type: String,
      required: true
    },
    transactionHash: {
      type: String,
      required: true
    },
    blockNumber: {
      type: Number,
      required: true
    },
    metadataUrl: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    gasUsed: {
      type: String,
      default: '0'
    },
    gasCost: {
      type: String,
      default: '0'
    },
    network: {
      type: String,
      default: 'ethereum-sepolia'
    },
    standard: {
      type: String,
      enum: ['ERC721', 'ERC1155'],
      default: 'ERC1155'
    },
    amount: {
      type: Number,
      default: 1
    },
    mintedAt: {
      type: Date,
      default: Date.now
    },
    ipfsData: {
      imageCID: String,
      metadataCID: String,
      pinataGatewayUrl: String
    }
  }],

  // Blockchain balances cache
  balances: {
    ethereum: {
      sepolia: {
        eth: {
          type: String,
          default: '0'
        },
        lastUpdated: {
          type: Date,
          default: null
        }
      }
    }
  },

  // Timestamps
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// No password hashing - store passwords as plain text for compatibility with Nwallet
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//
//   try {
//     const saltRounds = 12;
//     this.password = await bcrypt.hash(this.password, saltRounds);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// Instance methods
userSchema.methods.comparePassword = function(candidatePassword) {
  // Simple plain text comparison for compatibility with Nwallet
  return this.password === candidatePassword;
};

// Get wallet credentials (no decryption needed)
userSchema.methods.getMnemonic = function() {
  return this.mnemonic;
};

userSchema.methods.getEthPrivateKey = function() {
  return this.ethPrivateKey;
};

userSchema.methods.getSolPrivateKey = function() {
  return this.solPrivateKey;
};

// Session management methods
userSchema.methods.addSession = async function(sessionData) {
  this.sessions.push({
    sessionId: sessionData.sessionId,
    deviceInfo: sessionData.deviceInfo || 'Unknown Device',
    ipAddress: sessionData.ipAddress || 'Unknown IP',
    userAgent: sessionData.userAgent || 'Unknown User Agent',
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true
  });
  
  await this.save();
};

userSchema.methods.updateSessionActivity = async function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId && s.isActive);
  if (session) {
    session.lastActivity = new Date();
    await this.save();
  }
};

userSchema.methods.deactivateSession = async function(sessionId) {
  const session = this.sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.isActive = false;
    await this.save();
  }
};

// NFT management methods
userSchema.methods.addMintedNFT = async function(nftData) {
  try {
    // Add the NFT to the collection
    this.mintedNFTs.push({
      tokenId: nftData.tokenId,
      contractAddress: nftData.contractAddress,
      transactionHash: nftData.transactionHash,
      blockNumber: nftData.blockNumber,
      metadataUrl: nftData.metadataUrl,
      imageUrl: nftData.imageUrl,
      name: nftData.name,
      description: nftData.description || '',
      gasUsed: nftData.gasUsed || '0',
      gasCost: nftData.gasCost || '0',
      network: nftData.network || 'ethereum-sepolia',
      standard: nftData.standard || 'ERC1155',
      amount: nftData.amount || 1,
      mintedAt: new Date(),
      ipfsData: {
        imageCID: nftData.ipfsData?.imageCID || '',
        metadataCID: nftData.ipfsData?.metadataCID || '',
        pinataGatewayUrl: nftData.ipfsData?.pinataGatewayUrl || ''
      }
    });

    // Update activity tracking
    this.nftActivity.totalMinted += 1;
    this.nftActivity.lastMintedAt = new Date();

    // Add gas cost to total spent
    if (nftData.gasCost && nftData.gasCost !== '0') {
      const currentTotal = parseFloat(this.nftActivity.totalSpentOnGas || '0');
      const newCost = parseFloat(nftData.gasCost);
      this.nftActivity.totalSpentOnGas = (currentTotal + newCost).toString();
    }

    // Update favorite contract (most used)
    if (nftData.contractAddress) {
      this.nftActivity.favoriteContract = nftData.contractAddress;
    }

    await this.save();
    console.log('✅ NFT added to user collection:', nftData.tokenId);

    return true;
  } catch (error) {
    console.error('❌ Failed to add NFT to user collection:', error);
    throw error;
  }
};

// Get user's NFT collection
userSchema.methods.getNFTCollection = function(options = {}) {
  let collection = this.mintedNFTs;

  // Filter by contract address
  if (options.contractAddress) {
    collection = collection.filter(nft =>
      nft.contractAddress.toLowerCase() === options.contractAddress.toLowerCase()
    );
  }

  // Filter by network
  if (options.network) {
    collection = collection.filter(nft => nft.network === options.network);
  }

  // Filter by standard
  if (options.standard) {
    collection = collection.filter(nft => nft.standard === options.standard);
  }

  // Sort by minting date (newest first)
  collection.sort((a, b) => new Date(b.mintedAt) - new Date(a.mintedAt));

  // Limit results
  if (options.limit) {
    collection = collection.slice(0, options.limit);
  }

  return collection;
};

// Update blockchain balance
userSchema.methods.updateBalance = async function(network, currency, balance) {
  try {
    if (network === 'ethereum-sepolia' && currency === 'eth') {
      this.balances.ethereum.sepolia.eth = balance.toString();
      this.balances.ethereum.sepolia.lastUpdated = new Date();
      await this.save();
      console.log('✅ Balance updated for user:', this.ethAddress, balance, 'ETH');
    }
  } catch (error) {
    console.error('❌ Failed to update balance:', error);
    throw error;
  }
};

// Get cached balance
userSchema.methods.getCachedBalance = function(network, currency) {
  if (network === 'ethereum-sepolia' && currency === 'eth') {
    return {
      balance: this.balances.ethereum.sepolia.eth || '0',
      lastUpdated: this.balances.ethereum.sepolia.lastUpdated
    };
  }
  return { balance: '0', lastUpdated: null };
};

// Get NFT activity summary
userSchema.methods.getNFTActivitySummary = function() {
  return {
    totalMinted: this.nftActivity.totalMinted,
    totalSpentOnGas: this.nftActivity.totalSpentOnGas,
    lastMintedAt: this.nftActivity.lastMintedAt,
    favoriteContract: this.nftActivity.favoriteContract,
    recentNFTs: this.getNFTCollection({ limit: 5 }),
    totalValue: this.mintedNFTs.reduce((sum, nft) => {
      return sum + parseFloat(nft.gasCost || '0');
    }, 0).toString()
  };
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

userSchema.statics.findByAddress = function(address) {
  return this.findOne({
    $or: [
      { ethAddress: address },
      { solAddress: address }
    ]
  });
};

userSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({
    'sessions.sessionId': sessionId,
    'sessions.isActive': true
  });
};

// Enhanced user lookup with credentials
userSchema.statics.findBySessionIdWithCredentials = function(sessionId) {
  return this.findOne({
    'sessions.sessionId': sessionId,
    'sessions.isActive': true
  }).select('+ethPrivateKey +mnemonic');
};

// Find users by NFT ownership
userSchema.statics.findByNFTOwnership = function(contractAddress, tokenId) {
  return this.find({
    'mintedNFTs.contractAddress': contractAddress,
    'mintedNFTs.tokenId': tokenId
  });
};

// Get NFT statistics across all users
userSchema.statics.getNFTStatistics = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalNFTsMinted: { $sum: '$nftActivity.totalMinted' },
          totalGasSpent: { $sum: { $toDouble: '$nftActivity.totalSpentOnGas' } },
          activeMintersLastWeek: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$nftActivity.lastMintedAt',
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalUsers: 0,
      totalNFTsMinted: 0,
      totalGasSpent: 0,
      activeMintersLastWeek: 0
    };
  } catch (error) {
    console.error('❌ Failed to get NFT statistics:', error);
    return {
      totalUsers: 0,
      totalNFTsMinted: 0,
      totalGasSpent: 0,
      activeMintersLastWeek: 0
    };
  }
};

// Find top NFT minters
userSchema.statics.getTopMinters = function(limit = 10) {
  return this.find({})
    .sort({ 'nftActivity.totalMinted': -1 })
    .limit(limit)
    .select('email ethAddress nftActivity profile');
};

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ ethAddress: 1 });
userSchema.index({ solAddress: 1 });
userSchema.index({ 'sessions.sessionId': 1 });

// NFT-related indexes
userSchema.index({ 'mintedNFTs.contractAddress': 1 });
userSchema.index({ 'mintedNFTs.tokenId': 1 });
userSchema.index({ 'mintedNFTs.transactionHash': 1 });
userSchema.index({ 'nftActivity.totalMinted': -1 });
userSchema.index({ 'nftActivity.lastMintedAt': -1 });

// Compound indexes for complex queries
userSchema.index({
  'mintedNFTs.contractAddress': 1,
  'mintedNFTs.tokenId': 1
});
userSchema.index({
  'sessions.sessionId': 1,
  'sessions.isActive': 1
});

const User = mongoose.model('User', userSchema);

module.exports = User;
