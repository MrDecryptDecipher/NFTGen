import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const port = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : 7104;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// NFT routes

app.get('/api/nft/gallery', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Use Alchemy API to get NFTs owned by the address
    const alchemyApiKey = process.env.VITE_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5';

    try {
      console.log(`Fetching NFTs for address ${address} using Alchemy API`);
      const nftUrl = `https://eth-sepolia.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner`;

      const nftResponse = await axios.get(nftUrl, {
        params: {
          owner: address,
          pageSize: 100,
          withMetadata: true
        }
      });

      if (nftResponse.data && nftResponse.data.ownedNfts && nftResponse.data.ownedNfts.length > 0) {
        console.log(`Found ${nftResponse.data.ownedNfts.length} NFTs for address ${address}`);

        // Map the NFTs to our format
        const nfts = nftResponse.data.ownedNfts.map(nft => {
          // Extract image URL from various possible locations
          const imageUrl =
            nft.image?.cachedUrl ||
            nft.image?.originalUrl ||
            nft.image?.pngUrl ||
            nft.image?.thumbnailUrl ||
            nft.raw?.metadata?.image ||
            '/placeholder-nft.png';

          return {
            id: `nft-${nft.contract.address}-${nft.tokenId}`,
            tokenId: nft.tokenId,
            name: nft.name || nft.title || `NFT #${nft.tokenId}`,
            description: nft.description || '',
            image: imageUrl,
            contractAddress: nft.contract.address,
            owner: address,
            creator: nft.contract.openSea?.lastSeller || address,
            mintDate: nft.acquiredAt?.blockTimestamp || new Date().toISOString(),
            royalties: 2.5,
            fractions: 1,
            ipfsUrl: nft.tokenUri?.raw || ''
          };
        });

        return res.json(nfts);
      } else {
        console.log(`No NFTs found for address ${address}`);
        return res.json([]);
      }
    } catch (alchemyError) {
      console.error('Error fetching NFT data from Alchemy:', alchemyError.message);
      return res.status(500).json({
        error: 'Failed to fetch NFT data',
        message: alchemyError.message
      });
    }
  } catch (error) {
    console.error('Error in /api/nft/gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/nft/history', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Use Alchemy API to get NFT history
    const alchemyApiKey = process.env.VITE_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5';

    try {
      // First try to get NFTs owned by the address
      console.log(`Fetching NFTs for address ${address} using Alchemy API`);
      const nftUrl = `https://eth-sepolia.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner`;

      const nftResponse = await axios.get(nftUrl, {
        params: {
          owner: address,
          pageSize: 100,
          withMetadata: true,
          orderBy: 'transferTime'
        }
      });

      if (nftResponse.data && nftResponse.data.ownedNfts && nftResponse.data.ownedNfts.length > 0) {
        console.log(`Found ${nftResponse.data.ownedNfts.length} NFTs for address ${address}`);

        // Map the NFTs to our activity format
        const nftActivities = nftResponse.data.ownedNfts.map(nft => {
          // Extract image URL from various possible locations
          const imageUrl =
            nft.image?.cachedUrl ||
            nft.image?.originalUrl ||
            nft.image?.pngUrl ||
            nft.image?.thumbnailUrl ||
            nft.raw?.metadata?.image ||
            '/placeholder-nft.png';

          return {
            id: `nft-${nft.contract.address}-${nft.tokenId}`,
            type: 'mint',
            tokenId: nft.tokenId,
            name: nft.name || nft.title || `NFT #${nft.tokenId}`,
            description: nft.description || '',
            image: imageUrl,
            from: '0x0000000000000000000000000000000000000000',
            to: address,
            timestamp: nft.acquiredAt?.blockTimestamp || nft.timeLastUpdated || new Date().toISOString(),
            transactionHash: nft.acquiredAt?.transactionHash || ''
          };
        });

        // Now try to get transfer history for more accurate data
        try {
          console.log(`Fetching transfer history for address ${address}`);
          const transferUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

          const transferParams = {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [
              {
                fromBlock: '0x0',
                toBlock: 'latest',
                category: ['erc721', 'erc1155'],
                withMetadata: true,
                excludeZeroValue: true,
                maxCount: '0x64', // 100 in hex
                fromAddress: address,
                toAddress: address
              }
            ]
          };

          const transferResponse = await axios.post(transferUrl, transferParams);

          if (transferResponse.data?.result?.transfers && transferResponse.data.result.transfers.length > 0) {
            console.log(`Found ${transferResponse.data.result.transfers.length} transfers for address ${address}`);

            // Process transfers into activities
            const transferActivities = await Promise.all(
              transferResponse.data.result.transfers.map(async (transfer) => {
                // Determine if this is a mint, transfer in, or transfer out
                let type = 'transfer';
                if (transfer.from === '0x0000000000000000000000000000000000000000') {
                  type = 'mint';
                } else if (transfer.to.toLowerCase() === address.toLowerCase()) {
                  type = 'transfer'; // Received
                } else {
                  type = 'transfer'; // Sent
                }

                // Try to get NFT metadata for better display
                let name = `NFT #${transfer.tokenId || 'Unknown'}`;
                let image = '/placeholder-nft.png';

                if (transfer.rawContract && transfer.rawContract.address && transfer.tokenId) {
                  try {
                    const metadataUrl = `https://eth-sepolia.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTMetadata`;
                    const metadataResponse = await axios.get(metadataUrl, {
                      params: {
                        contractAddress: transfer.rawContract.address,
                        tokenId: transfer.tokenId,
                        refreshCache: false
                      }
                    });

                    if (metadataResponse.data) {
                      name = metadataResponse.data.name || metadataResponse.data.title || name;
                      image =
                        metadataResponse.data.image?.cachedUrl ||
                        metadataResponse.data.image?.originalUrl ||
                        metadataResponse.data.image?.pngUrl ||
                        metadataResponse.data.raw?.metadata?.image ||
                        image;
                    }
                  } catch (metadataError) {
                    console.warn(`Error fetching metadata for token ${transfer.tokenId}:`, metadataError.message);
                  }
                }

                return {
                  id: `transfer-${transfer.hash}-${transfer.tokenId || '0'}`,
                  type,
                  tokenId: transfer.tokenId || 'unknown',
                  name,
                  image,
                  from: transfer.from,
                  to: transfer.to,
                  price: transfer.value ? `${transfer.value} ETH` : undefined,
                  timestamp: new Date(parseInt(transfer.metadata.blockTimestamp) * 1000).toISOString(),
                  transactionHash: transfer.hash
                };
              })
            );

            // Combine NFT and transfer activities, removing duplicates
            const allActivities = [...nftActivities];

            // Add transfers that aren't already in the NFT activities
            transferActivities.forEach(transfer => {
              // Check if we already have this NFT in our list
              const exists = allActivities.some(
                activity => activity.transactionHash === transfer.transactionHash &&
                           activity.tokenId === transfer.tokenId
              );

              if (!exists) {
                allActivities.push(transfer);
              }
            });

            // Sort by timestamp (newest first)
            allActivities.sort((a, b) => {
              const timeA = new Date(a.timestamp).getTime();
              const timeB = new Date(b.timestamp).getTime();
              return timeB - timeA;
            });

            return res.json(allActivities);
          }
        } catch (transferError) {
          console.error('Error fetching transfer history:', transferError.message);
          // Continue with just the NFT activities
        }

        // If we couldn't get transfer history, just return the NFT activities
        return res.json(nftActivities);
      } else {
        console.log(`No NFTs found for address ${address}`);
        return res.json([]);
      }
    } catch (alchemyError) {
      console.error('Error fetching NFT data from Alchemy:', alchemyError.message);
      return res.status(500).json({
        error: 'Failed to fetch NFT data',
        message: alchemyError.message
      });
    }
  } catch (error) {
    console.error('Error in /api/nft/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IPFS proxy route
app.post('/api/ipfs/upload', async (req, res) => {
  try {
    const { file, metadata } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Mock IPFS upload
    const mockCid = `bafybeih${Date.now().toString(16)}${Math.random().toString(36).substring(2, 10)}`;
    const ipfsUrl = `ipfs://${mockCid}`;

    res.json({ success: true, ipfsUrl });
  } catch (error) {
    console.error('Error in /api/ipfs/upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`NFTGen API server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;
