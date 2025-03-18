const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  trait_type: { type: String, required: true },
  value: { type: String, required: true }
});

const metadataSchema = new mongoose.Schema({
  attributes: { type: [attributeSchema], required: true }
});

const fractionSchema = new mongoose.Schema({
  supply: { type: Number, required: true },
  remaining: { type: Number, required: true },
  pricePerFraction: { type: Number, required: true }
});

const royaltySchema = new mongoose.Schema({
  percentage: { type: Number, required: true },
  beneficiary: { type: String, required: true }
});

const nftSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  owner: { type: String, required: true },
  metadata: { type: metadataSchema, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['created', 'minted', 'listed', 'sold', 'fractional'],
    default: 'created'
  },
  fractions: [fractionSchema],
  royalties: [royaltySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
nftSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const NFT = mongoose.model('NFT', nftSchema);

module.exports = NFT; 