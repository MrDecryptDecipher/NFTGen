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
  tokenId: { type: String }, // Optional tokenId to match with Activity model
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

// Performance indexes for faster querying
nftSchema.index({ owner: 1 }); // Query NFTs by owner
nftSchema.index({ tokenId: 1 }); // Query by tokenId
nftSchema.index({ status: 1 }); // Query by status
nftSchema.index({ createdAt: -1 }); // Sort by creation date (newest first)
nftSchema.index({ updatedAt: -1 }); // Sort by update date
nftSchema.index({ name: 'text', description: 'text' }); // Text search on name and description
nftSchema.index({ owner: 1, status: 1 }); // Compound index for owner + status queries
nftSchema.index({ status: 1, createdAt: -1 }); // Compound index for status + date queries
nftSchema.index({ 'metadata.attributes.trait_type': 1, 'metadata.attributes.value': 1 }); // Query by attributes

const NFT = mongoose.model('NFT', nftSchema);

module.exports = NFT;