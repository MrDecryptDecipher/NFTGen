require('dotenv').config();
const mongoose = require('mongoose');
const NFT = require('./models/nft');
const Activity = require('./models/activity');

// Sample NFT data
const nftData = [
  {
    name: 'Cosmic Journey',
    description: 'An exploration of outer space in vivid colors.',
    image: 'https://gateway.pinata.cloud/ipfs/QmdqStCx1ezaKEWbcjfcQVYdUkC3miw3AJB68XBGQEXMcW',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Deep Space' },
        { trait_type: 'Style', value: 'Abstract' }
      ]
    },
    royalties: [
      { percentage: 5, beneficiary: '0x1C892fd7c68d4CFF3fAAc561506c453Cd3A49cd1' }
    ]
  },
  {
    name: 'Digital Dawn',
    description: 'The sunrise of the digital age captured in pixel art.',
    image: 'https://gateway.pinata.cloud/ipfs/QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Gradient Sky' },
        { trait_type: 'Style', value: 'Pixel Art' }
      ]
    },
    royalties: [
      { percentage: 7.5, beneficiary: '0x1C892fd7c68d4CFF3fAAc561506c453Cd3A49cd1' }
    ],
    fractions: [
      { supply: 5, remaining: 5, pricePerFraction: 0.2 }
    ]
  },
  {
    name: 'Ethereal Dimensions',
    description: 'A journey through multiple dimensions of reality.',
    image: 'https://gateway.pinata.cloud/ipfs/QmZ7jtAAUogWjTHpnJKvapuEUiRm8EWrDEaMHfW7NWvupN',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Multiverse' },
        { trait_type: 'Style', value: 'Surrealism' }
      ]
    }
  }
];

// Sample activity types
const activityTypes = ['mint', 'transfer', 'sale', 'auction'];

// Function to generate a random transaction hash
const generateTxHash = () => `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

// Connect to MongoDB
async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');
    
    // Clear existing data
    await NFT.deleteMany({});
    await Activity.deleteMany({});
    console.log('🧹 Cleared existing data');
    
    // Sample wallet address (replace with your test address)
    const testAddress = '0x1C892fd7c68d4CFF3fAAc561506c453Cd3A49cd1';
    
    // Create NFTs
    for (const nft of nftData) {
      const newNft = new NFT({
        ...nft,
        owner: testAddress,
        status: nft.fractions && nft.fractions.length > 0 ? 'fractional' : 'minted'
      });
      
      const savedNft = await newNft.save();
      console.log(`💎 Created NFT: ${savedNft.name}`);
      
      // Create mint activity
      const mintActivity = new Activity({
        type: 'mint',
        tokenId: savedNft._id.toString().substring(0, 8),
        name: savedNft.name,
        image: savedNft.image,
        from: '0x0000000000000000000000000000000000000000', // Zero address for minting
        to: testAddress,
        timestamp: savedNft.createdAt,
        transactionHash: generateTxHash()
      });
      
      await mintActivity.save();
      console.log(`📝 Created mint activity for: ${savedNft.name}`);
      
      // Create 1-2 additional activities per NFT
      const additionalActivitiesCount = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < additionalActivitiesCount; i++) {
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const isOutgoing = Math.random() > 0.5;
        const randomAddress = `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        
        const activity = new Activity({
          type: activityType,
          tokenId: savedNft._id.toString().substring(0, 8),
          name: savedNft.name,
          image: savedNft.image,
          from: isOutgoing ? testAddress : randomAddress,
          to: isOutgoing ? randomAddress : testAddress,
          price: (activityType === 'sale' || activityType === 'auction') ? 
            (Math.random() * 2).toFixed(3) + ' ETH' : undefined,
          timestamp: new Date(savedNft.createdAt.getTime() + (i + 1) * 24 * 60 * 60 * 1000), // 1 day after the previous activity
          transactionHash: generateTxHash()
        });
        
        await activity.save();
        console.log(`📝 Created ${activityType} activity for: ${savedNft.name}`);
      }
    }
    
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

seedDatabase(); 