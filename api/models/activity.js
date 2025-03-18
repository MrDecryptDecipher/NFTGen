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

// Index for faster querying by addresses
activitySchema.index({ from: 1 });
activitySchema.index({ to: 1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 