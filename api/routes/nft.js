const express = require('express');
const router = express.Router();
const NFT = require('../models/nft');
const Activity = require('../models/activity');
const { ethers } = require('ethers');
const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env variables for this API
config();

// Use environment variables from .env file (no hardcoded overrides)
console.log('[NFTGen API] Using environment variables from .env file');
console.log(`[NFTGen API] NFT_CONTRACT_ADDRESS: ${process.env.NFT_CONTRACT_ADDRESS}`);
console.log(`[NFTGen API] PRIVATE_KEY: ${process.env.PRIVATE_KEY ? 'Set' : 'Not set'}`);
console.log(`[NFTGen API] ALCHEMY_API_KEY: ${process.env.ALCHEMY_API_KEY ? 'Set' : 'Not set'}`);
console.log(`[NFTGen API] ALCHEMY_SEPOLIA_URL: ${process.env.ALCHEMY_SEPOLIA_URL ? 'Set' : 'Not set'}`);

// Validate required environment variables
if (!process.env.NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT_CONTRACT_ADDRESS is required in environment variables');
}

if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY is required in environment variables');
}

if (!process.env.ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY is required in environment variables');
}

if (!process.env.ALCHEMY_SEPOLIA_URL) {
    throw new Error('ALCHEMY_SEPOLIA_URL is required in environment variables');
}

// Import the ABI (ensure path is correct relative to this file)
let MyNFT_ABI;
try {
    // Try multiple locations for the ABI
    const possiblePaths = [
        '/home/ubuntu/MyNFT_ABI/MyNFT.json',
        path.join(__dirname, '../../contracts/MyNFT.json'),
        path.join(__dirname, '../../artifacts/contracts/MyNFT.sol/MyNFT.json'),
        path.join(__dirname, '../../artifacts/contracts/MyNFT.sol/NFTGenERC1155.json')
    ];

    for (const abiPath of possiblePaths) {
        if (fs.existsSync(abiPath)) {
            MyNFT_ABI = require(abiPath);
            console.log(`[NFTGen API] Loaded ABI from ${abiPath}`);
            break;
        }
    }

    // If no ABI found, create a minimal one
    if (!MyNFT_ABI) {
        console.log('[NFTGen API] Creating minimal ABI for testing');
        MyNFT_ABI = {
            abi: [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "to",
                            "type": "address"
                        },
                        {
                            "internalType": "string",
                            "name": "uri",
                            "type": "string"
                        },
                        {
                            "internalType": "object",
                            "name": "metadata",
                            "type": "tuple"
                        }
                    ],
                    "name": "mintNFT",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
        };
    }
} catch (e) {
    console.error("Failed to load MyNFT ABI from artifacts:", e.message);
    MyNFT_ABI = null;
}

// --- Environment Variables ---
const alchemyApiKey = process.env.ALCHEMY_API_KEY; // API Key for Alchemy
const nftContractAddress = process.env.NFT_CONTRACT_ADDRESS; // Address of MyNFT on Sepolia
const contractOwnerPrivateKey = process.env.PRIVATE_KEY; // Owner's key for minting
const sepoliaRpcUrl = process.env.ALCHEMY_SEPOLIA_URL || `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

// --- Initializations ---
let provider, ownerSigner, nftContract;
try {
    if (!sepoliaRpcUrl) throw new Error("Missing ALCHEMY_SEPOLIA_URL or ALCHEMY_API_KEY");
    provider = new ethers.JsonRpcProvider(sepoliaRpcUrl);

    if (!contractOwnerPrivateKey) throw new Error("Missing PRIVATE_KEY");
    ownerSigner = new ethers.Wallet(contractOwnerPrivateKey, provider);
    console.log('[NFTGen API] Owner Signer Initialized:', ownerSigner.address);

    if (!nftContractAddress) throw new Error("Missing NFT_CONTRACT_ADDRESS");
    if (!MyNFT_ABI) throw new Error("Missing MyNFT ABI artifact");
    nftContract = new ethers.Contract(nftContractAddress, MyNFT_ABI.abi, ownerSigner);
    console.log('[NFTGen API] Contract Instance Initialized:', nftContractAddress);

} catch (error) {
    console.error("[NFTGen API] Initialization failed:", error.message);
    // Set to null so endpoint check fails cleanly
    provider = null;
    ownerSigner = null;
    nftContract = null;
}

// GET /api/nft/gallery - Get all NFTs owned by an address
router.get('/gallery', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log(`[NFTGen API] 🎨 REAL FIX: Fetching gallery for address: ${address}`);

    // Find all NFTs owned by the address
    const nfts = await NFT.find({ owner: address });
    console.log(`[NFTGen API] Found ${nfts.length} NFTs in database for address: ${address}`);

    // If no NFTs found in database, check if we have any activities for this address
    let formattedNfts = [];

    if (nfts.length === 0) {
      console.log(`[NFTGen API] No NFTs found in database, checking activities`);
      // Find mint activities for this address
      const activities = await Activity.find({
        to: address,
        type: 'mint'
      });

      console.log(`[NFTGen API] Found ${activities.length} mint activities for address: ${address}`);

      if (activities.length > 0) {
        // Create NFT records from activities with REAL image URL extraction
        formattedNfts = await Promise.all(activities.map(async activity => {
          let actualImageUrl = activity.image;
          let metadataUrl = activity.image;

          // REAL FIX: Extract actual image URL from metadata if needed
          if (activity.image && (activity.image.includes('gateway.pinata.cloud') || activity.image.includes('ipfs'))) {
            try {
              console.log(`[NFTGen API] Fetching metadata for activity ${activity._id} from: ${activity.image}`);
              const axios = require('axios');
              const metadataResponse = await axios.get(activity.image, { timeout: 5000 });

              if (metadataResponse.data && metadataResponse.data.image) {
                actualImageUrl = metadataResponse.data.image;
                metadataUrl = activity.image; // Keep original as metadata URL
                console.log(`[NFTGen API] Extracted real image URL from activity: ${actualImageUrl}`);
              }
            } catch (metadataError) {
              console.warn(`[NFTGen API] Failed to fetch metadata for activity ${activity._id}:`, metadataError.message);
              // Keep original URL as fallback
            }
          }

          return {
            id: activity._id.toString(),
            tokenId: activity.tokenId,
            name: activity.name,
            description: 'Your minted NFT',
            image: actualImageUrl, // Use extracted image URL
            imageUrl: actualImageUrl, // Add imageUrl field for frontend compatibility
            image_url: actualImageUrl, // Add image_url field for frontend compatibility
            metadataUrl: metadataUrl, // Separate metadata URL
            metadata_url: metadataUrl, // Add metadata_url field for frontend compatibility
            contractAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Real contract address from logs
            owner: address,
            creator: address,
            mintDate: activity.timestamp.toISOString(),
            royalties: 2.5,
            fractions: 1,
            ipfsUrl: actualImageUrl, // Using actual image URL as ipfsUrl
            transactionHash: activity.transactionHash || null // Add transaction hash if available
          };
        }));

        // Also save these NFTs to the database for future queries
        try {
          for (const activity of activities) {
            // Check if NFT already exists
            const existingNft = await NFT.findOne({
              tokenId: activity.tokenId,
              owner: address
            });

            if (!existingNft) {
              const newNft = new NFT({
                name: activity.name,
                description: 'Your minted NFT',
                image: activity.image,
                owner: address,
                metadata: {
                  attributes: []
                },
                status: 'minted',
                royalties: [{ percentage: 2.5, beneficiary: address }]
              });

              await newNft.save();
              console.log(`[NFTGen API] Created new NFT record from activity: ${activity.name}`);
            }
          }
        } catch (dbError) {
          console.error('[NFTGen API] Error saving NFTs from activities:', dbError);
          // Continue with the response even if saving fails
        }
      } else {
        // NO MOCK NFTs - Only show real blockchain data
        console.log(`[NFTGen API] No real NFTs found for address: ${address} - returning empty array`);
        formattedNfts = [];
      }
    } else {
      // Transform the data to match the expected format from the frontend
      formattedNfts = await Promise.all(nfts.map(async nft => {
        // Calculate royalties percentage as a total
        const totalRoyalties = nft.royalties.reduce((sum, royalty) => sum + royalty.percentage, 0);

        // Calculate fractions count
        const totalFractions = nft.fractions && nft.fractions.length > 0
          ? nft.fractions.reduce((sum, fraction) => sum + fraction.supply, 0)
          : 1;

        // REAL FIX: Extract actual image URL from metadata if needed
        let actualImageUrl = nft.image;
        let metadataUrl = nft.image;

        // If the image URL looks like a metadata URL, fetch the metadata to get the real image URL
        if (nft.image && (nft.image.includes('gateway.pinata.cloud') || nft.image.includes('ipfs'))) {
          try {
            console.log(`[NFTGen API] Fetching metadata for NFT ${nft._id} from: ${nft.image}`);
            const axios = require('axios');
            const metadataResponse = await axios.get(nft.image, { timeout: 5000 });

            if (metadataResponse.data && metadataResponse.data.image) {
              actualImageUrl = metadataResponse.data.image;
              metadataUrl = nft.image; // Keep original as metadata URL
              console.log(`[NFTGen API] Extracted real image URL: ${actualImageUrl}`);
            }
          } catch (metadataError) {
            console.warn(`[NFTGen API] Failed to fetch metadata for NFT ${nft._id}:`, metadataError.message);
            // Keep original URL as fallback
          }
        }

        return {
          id: nft._id.toString(),
          tokenId: nft.tokenId || nft._id.toString().substring(0, 8),
          name: nft.name,
          description: nft.description,
          image: actualImageUrl, // Use extracted image URL
          imageUrl: actualImageUrl, // Add imageUrl field for frontend compatibility
          image_url: actualImageUrl, // Add image_url field for frontend compatibility
          metadataUrl: metadataUrl, // Separate metadata URL
          metadata_url: metadataUrl, // Add metadata_url field for frontend compatibility
          contractAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Real contract address from logs
          owner: nft.owner,
          creator: nft.owner, // Assuming creator is the owner for now
          mintDate: nft.createdAt.toISOString(),
          royalties: totalRoyalties,
          fractions: totalFractions || 1,
          ipfsUrl: actualImageUrl, // Using actual image URL as ipfsUrl
          transactionHash: nft.transactionHash || null // Add transaction hash if available
        };
      }));
    }

    console.log(`[NFTGen API] Returning ${formattedNfts.length} NFTs for address: ${address}`);
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

// GET /api/nft/mock-history - Get mock NFT activity history for an address
router.get('/mock-history', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log(`[NFTGen API] Mock history generation DISABLED for address: ${address}`);
    console.log('[NFTGen API] Only real blockchain data via Alchemy API is allowed');

    // Return empty array - no mock data allowed
    res.json([]);
  } catch (error) {
    console.error('Error generating mock history:', error);
    res.status(500).json({ error: 'Failed to generate mock history' });
  }
});

// POST /api/nft/mint - Mint a new NFT
router.post('/mint', async (req, res) => {
    // Check if contract interaction is possible
    if (!nftContract || !ownerSigner) {
        console.error('[NFTGen API /mint] Error: Server not configured for minting.');
        return res.status(500).json({ error: 'Server not configured for NFT minting.' });
    }

    const { recipientAddress, tokenURI, metadataStruct } = req.body;
    console.log('[NFTGen API /mint] Received request:', { recipientAddress, tokenURI, metadataStruct });

    // Validate inputs
    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
        return res.status(400).json({ error: 'Valid recipientAddress is required.' });
    }
    if (!tokenURI || !tokenURI.startsWith('ipfs://')) {
        return res.status(400).json({ error: 'Valid IPFS tokenURI is required.' });
    }
    if (!metadataStruct || typeof metadataStruct !== 'object') {
        return res.status(400).json({ error: 'Valid metadataStruct is required.' });
    }
    // Basic validation of metadataStruct content (can be expanded)
    if (!metadataStruct.name || !metadataStruct.description || !metadataStruct.image || !Array.isArray(metadataStruct.attributes)) {
        return res.status(400).json({ error: 'metadataStruct is missing required fields (name, description, image, attributes array).' });
    }

    try {
        console.log(`[NFTGen API /mint] Attempting to mint NFT for ${recipientAddress} with URI ${tokenURI}...`);

        // Prepare metadata struct for the contract (add external_url if missing)
        const contractMetadata = {
            name: metadataStruct.name,
            description: metadataStruct.description,
            image: metadataStruct.image,
            external_url: metadataStruct.external_url || "https://nija.world",
            attributes: metadataStruct.attributes
        };

        console.log('[NFTGen API /mint] Contract metadata:', contractMetadata);

        // Mint NFT via Contract using the owner's signer
        // Function signature: mintNFT(address recipient, string tokenURI, TokenMetadata metadata)
        const tx = await nftContract.mintNFT(recipientAddress, tokenURI, contractMetadata);

        console.log('[NFTGen API /mint] Mint transaction sent:', tx.hash);

        // Create a unique ID for the NFT based on the transaction hash
        const nftId = tx.hash.substring(0, 14);

        try {
            // Save the activity to the database for history tracking
            const activity = new Activity({
                type: 'mint',
                tokenId: nftId,
                name: metadataStruct.name,
                image: metadataStruct.image,
                from: '0x0000000000000000000000000000000000000000', // Minting from zero address
                to: recipientAddress,
                transactionHash: tx.hash
            });

            await activity.save();
            console.log('[NFTGen API /mint] Activity record saved to database');

            // Also save the NFT to the database
            const nft = new NFT({
                name: metadataStruct.name,
                description: metadataStruct.description,
                image: metadataStruct.image,
                owner: recipientAddress,
                tokenId: nftId, // Save the tokenId to match with Activity model
                metadata: {
                    attributes: metadataStruct.attributes
                },
                status: 'minted',
                royalties: [{ percentage: 2.5, beneficiary: ownerSigner.address }]
            });

            await nft.save();
            console.log('[NFTGen API /mint] NFT record saved to database');
        } catch (dbError) {
            // Don't fail the request if database saving fails
            console.error('[NFTGen API /mint] Error saving to database:', dbError);
        }

        // Respond with the actual transaction hash and NFT ID
        res.status(200).json({
            success: true,
            message: 'NFT Minting initiated successfully by owner!',
            transactionHash: tx.hash,
            tokenURI: tokenURI,
            id: nftId,
            name: metadataStruct.name,
            description: metadataStruct.description,
            image: metadataStruct.image
        });

    } catch (error) {
        console.error('[NFTGen API /mint] Error minting NFT:', error);
        // Provide more specific contract error details if possible
        const reason = error.reason || error.message;
        res.status(500).json({
            success: false,
            error: 'Failed to mint NFT on-chain.',
            details: reason
        });
    }
});

module.exports = router;