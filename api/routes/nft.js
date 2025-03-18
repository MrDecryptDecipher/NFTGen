const express = require('express');
const router = express.Router();
const NFT = require('../models/nft');
const Activity = require('../models/activity');

// GET /api/nft/gallery - Get all NFTs owned by an address
router.get('/gallery', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    // Find all NFTs owned by the address
    const nfts = await NFT.find({ owner: address });
    
    // Transform the data to match the expected format from the frontend
    const formattedNfts = nfts.map(nft => {
      // Calculate royalties percentage as a total
      const totalRoyalties = nft.royalties.reduce((sum, royalty) => sum + royalty.percentage, 0);
      
      // Calculate fractions count
      const totalFractions = nft.fractions.reduce((sum, fraction) => sum + fraction.supply, 0);
      
      return {
        id: nft._id.toString(),
        tokenId: nft._id.toString().substring(0, 8),
        name: nft.name,
        description: nft.description,
        image: nft.image,
        contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0', // Placeholder contract address
        owner: nft.owner,
        creator: nft.owner, // Assuming creator is the owner for now
        mintDate: nft.createdAt.toISOString(),
        royalties: totalRoyalties,
        fractions: totalFractions || 1,
        ipfsUrl: nft.image // Using image URL as ipfsUrl for now
      };
    });
    
    res.json(formattedNfts);
  } catch (error) {
    console.error('Error fetching NFT gallery:', error);
    res.status(500).json({ error: 'Failed to fetch NFT gallery' });
  }
});

// GET /api/nft/history - Get NFT activity history for an address
router.get('/history', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    // Find all activities where the address is involved (either as sender or receiver)
    const activities = await Activity.find({
      $or: [{ from: address }, { to: address }]
    }).sort({ timestamp: -1 });
    
    // Transform the data to match the expected format from the frontend
    const formattedActivities = activities.map(activity => ({
      id: activity._id.toString(),
      type: activity.type,
      tokenId: activity.tokenId,
      name: activity.name,
      image: activity.image,
      from: activity.from,
      to: activity.to,
      price: activity.price,
      timestamp: activity.timestamp.toISOString(),
      transactionHash: activity.transactionHash
    }));
    
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching NFT history:', error);
    res.status(500).json({ error: 'Failed to fetch NFT history' });
  }
});

// POST /api/nft/mint - Mint a new NFT
router.post('/mint', async (req, res) => {
  try {
    const { address, metadataUrl, royalties, fractions } = req.body;
    
    if (!address || !metadataUrl) {
      return res.status(400).json({ error: 'Address and metadataUrl are required' });
    }
    
    // Extract metadata from the URL (in a real app, you would fetch this from IPFS)
    // For now, let's create some sample metadata
    const name = `NFT #${Math.floor(Math.random() * 10000)}`;
    const description = 'A unique digital collectible created on the NFTGen platform.';
    const image = metadataUrl; // Using the metadataUrl as the image URL for simplicity
    
    // Create the NFT
    const nft = new NFT({
      name,
      description,
      image,
      owner: address,
      metadata: {
        attributes: [
          { trait_type: 'Creator', value: address },
          { trait_type: 'Created', value: new Date().toISOString() }
        ]
      },
      status: 'minted'
    });
    
    // Add royalties if specified
    if (royalties && royalties > 0) {
      nft.royalties.push({
        percentage: royalties,
        beneficiary: address
      });
    }
    
    // Add fractions if specified
    if (fractions && fractions > 1) {
      nft.fractions.push({
        supply: fractions,
        remaining: fractions,
        pricePerFraction: 0.01 // Default price per fraction
      });
      nft.status = 'fractional';
    }
    
    // Save the NFT
    const savedNft = await nft.save();
    
    // Create an activity record for the mint
    const tokenId = savedNft._id.toString().substring(0, 8);
    const transactionHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    const activity = new Activity({
      type: 'mint',
      tokenId,
      name,
      image,
      from: '0x0000000000000000000000000000000000000000', // Zero address for minting
      to: address,
      transactionHash
    });
    
    await activity.save();
    
    // Return the response
    res.status(201).json({
      tokenId,
      contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0', // Placeholder contract address
      transactionHash,
      ipfsUrl: metadataUrl
    });
  } catch (error) {
    console.error('Error minting NFT:', error);
    res.status(500).json({ error: 'Failed to mint NFT' });
  }
});

module.exports = router; 