const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['mint', 'transfer', 'sale', 'auction', 'listing'],
  },
  tokenId: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  image: { 
    type: String, 
    required: true 
  },
  from: { 
    type: String, 
    required: true 
  },
  to: { 
    type: String, 
    required: true 
  },
  price: { 
    type: String,
    required: function() {
      return this.type === 'sale' || this.type === 'auction';
    }
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  transactionHash: { 
    type: String, 
    required: true 
  }
});

// Performance indexes for faster querying
activitySchema.index({ from: 1 }); // Query by sender address
activitySchema.index({ to: 1 }); // Query by receiver address
activitySchema.index({ tokenId: 1 }); // Query by tokenId
activitySchema.index({ type: 1 }); // Query by activity type
activitySchema.index({ timestamp: -1 }); // Sort by timestamp (newest first)
activitySchema.index({ transactionHash: 1 }); // Query by transaction hash
activitySchema.index({ tokenId: 1, timestamp: -1 }); // Compound index for token activity timeline
activitySchema.index({ from: 1, timestamp: -1 }); // Compound index for user activity timeline
activitySchema.index({ to: 1, timestamp: -1 }); // Compound index for user received activity
activitySchema.index({ type: 1, timestamp: -1 }); // Compound index for activity type + date

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;