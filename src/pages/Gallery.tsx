import React, { useEffect, useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { getUserNFTs, getUserNFTHistory, NFTItem } from '../api/nft';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Fade,
  Divider,
  Button
} from '@mui/material';
import { format } from 'date-fns';
import { NFTImage } from '../components/NFTImage';

const Gallery: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const highlightedNftRef = useRef<HTMLDivElement | null>(null);
  const [highlightedNft, setHighlightedNft] = useState<NFTItem | null>(null);

  useEffect(() => {
    // Clear any mock data on page load
    const clearMockData = () => {
      const keys = Object.keys(localStorage);
      const mockKeys = keys.filter(key => {
        const value = localStorage.getItem(key);
        return key.includes('68211a82') ||
               key.includes('vande') ||
               key.includes('mataram') ||
               value?.includes('Flag_of_India') ||
               value?.includes('Vande Mataram');
      });

      if (mockKeys.length > 0) {
        console.log('Gallery: Clearing mock data keys:', mockKeys);
        mockKeys.forEach(key => localStorage.removeItem(key));
      }
    };

    clearMockData();

    const fetchNFTs = async () => {
      if (!isConnected || !address) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('Gallery: Fetching NFTs for address:', address);
        const nftData = await getUserNFTs(address);
        console.log('Gallery: Received NFT data:', nftData);

        // Get NFT history as an additional source of NFTs
        const historyData = await getUserNFTHistory(address);
        console.log('Gallery: Received history data:', historyData);

        // Extract minted NFTs from history and format to match NFTItem
        const mintedNFTs = historyData
          .filter(activity => activity.type === 'mint')
          .map(activity => {
            // Try to get the actual image data from localStorage
            let imageUrl = activity.image;

            // Check for stored image data with various keys
            const possibleImageKeys = [
              `ipfs_data_${activity.id}`,
              `nft_image_data_${activity.id}`,
              `nftgen_image_data_${activity.id}`
            ];

            for (const key of possibleImageKeys) {
              const storedImage = localStorage.getItem(key);
              if (storedImage && storedImage.startsWith('data:image')) {
                console.log(`Gallery: Found stored image for ${activity.id} with key ${key}`);
                imageUrl = storedImage;
                break;
              }
            }

            // If still no image, check for any data URL in localStorage that might match
            if (!imageUrl || !imageUrl.startsWith('data:image')) {
              const allKeys = Object.keys(localStorage);
              const imageDataKeys = allKeys.filter(key => {
                const value = localStorage.getItem(key);
                return value && value.startsWith('data:image') &&
                       (key.includes(activity.id) || key.includes(activity.name?.replace(/\s+/g, '_')));
              });

              if (imageDataKeys.length > 0) {
                const foundImageData = localStorage.getItem(imageDataKeys[0]);
                if (foundImageData) {
                  console.log(`Gallery: Found matching image data for ${activity.id} with key ${imageDataKeys[0]}`);
                  imageUrl = foundImageData;
                }
              }
            }

            return {
              id: activity.id,
              tokenId: activity.tokenId,
              name: activity.name,
              description: activity.description || 'Your minted NFT',
              image: imageUrl,
              contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
              owner: address,
              creator: address,
              mintDate: activity.timestamp,
              royalties: 2.5,
              fractions: 1,
              ipfsUrl: imageUrl
            };
          });

        // Load NFTs from localStorage as another source
        const localNFTs = loadLocalNFTs();

        // Combine all sources, preferring NFTs from the API
        const combinedNFTs = [
          ...nftData,
          ...mintedNFTs.filter(nft => !nftData.some(n => n.id === nft.id)),
          ...localNFTs.filter(nft => !nftData.some(n => n.id === nft.id) && !mintedNFTs.some(n => n.id === nft.id))
        ];

        if (combinedNFTs.length > 0) {
          console.log('Gallery: Using combined NFTs:', combinedNFTs);
          setNfts(combinedNFTs);

          // Check if a specific NFT ID was requested in the URL
          if (id && combinedNFTs.length > 0) {
            console.log('Gallery: Looking for NFT with ID:', id);
            // Find NFT by id, tokenId, or any part of the ID/hash
            const foundNft = combinedNFTs.find(nft =>
              nft.id === id ||
              nft.tokenId === id ||
              (typeof nft.id === 'string' && nft.id.includes(id)) ||
              (typeof nft.tokenId === 'string' && nft.tokenId.includes(id))
            );

            if (foundNft) {
              console.log('Gallery: Found requested NFT:', foundNft);
              setHighlightedNft(foundNft);

              // Scroll to the highlighted NFT after rendering
              setTimeout(() => {
                if (highlightedNftRef.current) {
                  highlightedNftRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                }
              }, 500);
            } else {
              console.log('Gallery: Requested NFT not found');
              setError(`NFT with ID "${id}" not found in your collection.`);
            }
          }
        } else {
          console.log('Gallery: No NFTs found for address:', address);
          // Try to get NFT history to see if there are any minted NFTs
          try {
            const historyData = await getUserNFTHistory(address);
            console.log('Gallery: Received history data:', historyData);

            // Extract minted NFTs from history
            const mintedNFTs = historyData
              .filter(activity => activity.type === 'mint')
              .map(activity => ({
                id: activity.id,
                tokenId: activity.tokenId,
                name: activity.name,
                description: 'Your minted NFT',
                image: activity.image,
                contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
                owner: address,
                creator: address,
                mintDate: activity.timestamp,
                royalties: 2.5,
                fractions: 1,
                ipfsUrl: activity.image
              }));

            if (mintedNFTs.length > 0) {
              console.log('Gallery: Using minted NFTs from history:', mintedNFTs);
              setNfts(mintedNFTs);

              // Check for specific NFT if ID was provided
              if (id) {
                const foundNft = mintedNFTs.find(nft =>
                  nft.id === id ||
                  nft.tokenId === id ||
                  nft.id?.includes(id) ||
                  nft.tokenId?.includes(id)
                );

                if (foundNft) {
                  setHighlightedNft(foundNft);
                } else {
                  setError(`NFT with ID "${id}" not found in your collection.`);
                }
              }
            } else {
              setNfts([]);
            }
          } catch (historyErr) {
            console.error('Gallery: Error fetching NFT history:', historyErr);
            setNfts([]);
          }
        }
      } catch (err) {
        console.error('Gallery: Error fetching NFTs:', err);

        // Try to load from localStorage as fallback
        const localNFTs = loadLocalNFTs();
        if (localNFTs.length > 0) {
          console.log('Gallery: Using local NFTs as fallback:', localNFTs);
          setNfts(localNFTs);
          setError(null);

          // Check for specific NFT if ID was provided
          if (id) {
            const foundNft = localNFTs.find(nft =>
              nft.id === id ||
              nft.tokenId === id ||
              nft.id?.includes(id) ||
              nft.tokenId?.includes(id)
            );

            if (foundNft) {
              setHighlightedNft(foundNft);
            } else {
              setError(`NFT with ID "${id}" not found in your collection.`);
            }
          }
        } else {
          setError('Failed to load your NFT collection. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Function to load NFTs from localStorage - ONLY REAL DATA
    const loadLocalNFTs = (): NFTItem[] => {
      try {
        // Clear any mock data first
        const keys = Object.keys(localStorage);
        const mockKeys = keys.filter(key =>
          key.includes('68211a82') ||
          key.includes('vande') ||
          key.includes('mataram') ||
          localStorage.getItem(key)?.includes('Flag_of_India')
        );

        mockKeys.forEach(key => {
          console.log('Gallery: Removing mock data key:', key);
          localStorage.removeItem(key);
        });

        // Get remaining localStorage keys for REAL NFTs only
        const remainingKeys = Object.keys(localStorage);
        const nftDataKeys = remainingKeys.filter(key => key.startsWith('nft_data_'));
        const nftTokenKeys = remainingKeys.filter(key => key.startsWith('nft_token_'));
        const nftActivityKeys = remainingKeys.filter(key => key.startsWith('nftgen_tx_'));
        const userNftsKeys = remainingKeys.filter(key => key.startsWith('user_nfts_'));
        const localNftsKey = 'nftgen_local_nfts'; // Added key for NFTs stored by CreateNFT.tsx

        console.log('Gallery: Found REAL NFT data keys:', nftDataKeys);
        console.log('Gallery: Found REAL NFT token keys:', nftTokenKeys);
        console.log('Gallery: Found REAL NFT activity keys:', nftActivityKeys);
        console.log('Gallery: Found REAL user NFTs keys:', userNftsKeys);

        // Parse NFT data from localStorage
        const nftItems: NFTItem[] = [];

        // First check for NFTs stored by CreateNFT.tsx
        try {
          const localNftsJson = localStorage.getItem(localNftsKey);
          if (localNftsJson) {
            const localNfts = JSON.parse(localNftsJson);
            if (Array.isArray(localNfts)) {
              console.log('Gallery: Found NFTs in nftgen_local_nfts:', localNfts.length);
              localNfts.forEach(nft => {
                if (!nftItems.some(existing => existing.id === nft.id)) {
                  nftItems.push({
                    id: nft.id,
                    tokenId: nft.tokenId || nft.id.substring(0, 8),
                    name: nft.name || 'Untitled NFT',
                    description: nft.description || 'No description',
                    image: nft.image || '/placeholder-nft.png',
                    contractAddress: nft.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
                    owner: nft.owner || address || '',
                    creator: nft.creator || address || '',
                    mintDate: nft.createdAt || new Date().toISOString(),
                    royalties: nft.royalties || 2.5,
                    fractions: nft.fractions || 1,
                    ipfsUrl: nft.tokenURI || nft.ipfsUrl || ''
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error('Gallery: Error parsing nftgen_local_nfts:', e);
        }

        // Then try to get NFT data
        nftDataKeys.forEach(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            if (data && data.name) {
              // Get the image from a related image key if it exists
              const txId = key.replace('nft_data_', '');
              const imageKey = `nft_image_tx_${txId}`;
              const imageUrl = localStorage.getItem(imageKey) || data.image;

              // Check if this NFT is already in the array
              if (!nftItems.some(existing => existing.id === (data.id || txId))) {
                nftItems.push({
                  id: data.id || txId,
                  tokenId: data.tokenId || txId.substring(0, 8),
                  name: data.name,
                  description: data.description || 'No description',
                  image: imageUrl,
                  contractAddress: data.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
                  owner: data.owner || address || '',
                  creator: data.creator || address || '',
                  mintDate: data.createdAt || new Date().toISOString(),
                  royalties: 2.5,
                  fractions: 1,
                  ipfsUrl: data.tokenURI || ''
                });
              }
            }
          } catch (e) {
            console.error(`Gallery: Error parsing NFT data from localStorage key ${key}:`, e);
          }
        });

        // Check token-specific keys which are more reliable
        nftTokenKeys.forEach(key => {
          try {
            const nftJson = localStorage.getItem(key);
            if (nftJson) {
              const nft = JSON.parse(nftJson);
              // Only include NFTs owned by this user or if no owner is specified
              if (!nft.owner || nft.owner === address) {
                // Check if this NFT is already in the array
                if (!nftItems.some(existing => existing.id === nft.id)) {
                  nftItems.push({
                    id: nft.id || key.replace('nft_token_', ''),
                    tokenId: nft.tokenId || key.replace('nft_token_', ''),
                    name: nft.name || 'Untitled NFT',
                    description: nft.description || 'No description',
                    image: nft.image || '/placeholder-nft.png',
                    contractAddress: nft.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
                    owner: nft.owner || address || '',
                    creator: nft.creator || address || '',
                    mintDate: nft.createdAt || new Date().toISOString(),
                    royalties: nft.royalties || 2.5,
                    fractions: nft.fractions || 1,
                    ipfsUrl: nft.tokenURI || nft.ipfsUrl || ''
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Gallery: Error parsing NFT from ${key}:`, e);
          }
        });

        // Check user NFTs collections
        userNftsKeys.forEach(key => {
          try {
            const userNftsJson = localStorage.getItem(key);
            if (userNftsJson) {
              const userNfts = JSON.parse(userNftsJson);
              if (Array.isArray(userNfts)) {
                userNfts.forEach(nft => {
                  // Check if this NFT is already in the array
                  if (!nftItems.some(existing => existing.id === nft.id)) {
                    nftItems.push({
                      id: nft.id,
                      tokenId: nft.tokenId || nft.id.substring(0, 8),
                      name: nft.name || 'Untitled NFT',
                      description: nft.description || 'No description',
                      image: nft.image || '/placeholder-nft.png',
                      contractAddress: nft.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
                      owner: nft.owner || address || '',
                      creator: nft.creator || address || '',
                      mintDate: nft.createdAt || new Date().toISOString(),
                      royalties: nft.royalties || 2.5,
                      fractions: nft.fractions || 1,
                      ipfsUrl: nft.tokenURI || nft.ipfsUrl || ''
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.error(`Gallery: Error parsing user NFTs from ${key}:`, e);
          }
        });

        // Then try to get NFT activities if we still don't have enough data
        if (nftItems.length === 0 || nftActivityKeys.length > 0) {
          nftActivityKeys.forEach(key => {
            try {
              const activity = JSON.parse(localStorage.getItem(key) || '');
              if (activity && activity.type === 'mint') {
                // Check if this NFT is already in our list
                if (!nftItems.some(item => item.id === activity.id)) {
                  nftItems.push({
                    id: activity.id || activity.tokenId || key.replace('nftgen_tx_', ''),
                    tokenId: activity.tokenId || activity.id?.substring(0, 8) || '',
                    name: activity.name || 'Untitled NFT',
                    description: activity.description || 'Your minted NFT',
                    image: activity.image || '/placeholder-nft.png',
                    contractAddress: activity.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A',
                    owner: activity.to || address || '',
                    creator: activity.to || address || '',
                    mintDate: activity.timestamp ? new Date(activity.timestamp).toISOString() : new Date().toISOString(),
                    royalties: 2.5,
                    fractions: 1,
                    ipfsUrl: activity.tokenURI || ''
                  });
                }
              }
            } catch (e) {
              console.error(`Gallery: Error parsing NFT activity from localStorage key ${key}:`, e);
            }
          });
        }

        console.log('Gallery: Loaded local NFTs:', nftItems);
        return nftItems;
      } catch (error) {
        console.error('Gallery: Error loading NFTs from localStorage:', error);
        return [];
      }
    };

    fetchNFTs();

    // Listen for NFT activity updates
    const handleActivityUpdate = () => {
      console.log('Gallery: NFT activity update detected, reloading NFTs');
      fetchNFTs();
    };

    window.addEventListener('nftgen_activity_update', handleActivityUpdate);
    window.addEventListener('storage', handleActivityUpdate);

    return () => {
      window.removeEventListener('nftgen_activity_update', handleActivityUpdate);
      window.removeEventListener('storage', handleActivityUpdate);
    };
  }, [address, isConnected, id]);

  // Handle view all NFTs (clear highlighted NFT)
  const handleViewAll = () => {
    setHighlightedNft(null);
    navigate('/gallery');
  };

  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Please connect your wallet to view your NFT collection.</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your NFT Collection
        </Typography>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary" align="center">
            Loading your NFT collection...
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, maxWidth: 500 }}>
            We're retrieving your NFTs from the blockchain and local storage. This may take a moment.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Your NFT Collection
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            '& .MuiAlert-message': {
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Error Loading NFTs
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Try refreshing the page or checking your wallet connection.
          </Typography>
        </Alert>
      )}

      {id && highlightedNft && (
        <Box mb={4}>
          <Button
            variant="outlined"
            onClick={handleViewAll}
            sx={{ mb: 2 }}
          >
            View All NFTs
          </Button>

          <Typography variant="h5" gutterBottom>
            Viewing Selected NFT
        </Typography>

          <Card
            ref={highlightedNftRef}
            sx={{
              mb: 3,
              border: '2px solid #8e24aa',
              boxShadow: '0 0 15px rgba(142, 36, 170, 0.3)'
            }}
          >
            <Grid container spacing={0}>
              <Grid item xs={12} md={6}>
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                  <NFTImage src={highlightedNft.image} alt={highlightedNft.name} sx={{ maxHeight: '400px', width: '100%', objectFit: 'contain' }} />
          </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {highlightedNft.name}
                  </Typography>

                  <Typography variant="body1" color="text.secondary" paragraph>
                    {highlightedNft.description}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`ID: ${highlightedNft.tokenId || highlightedNft.id}`} size="small" />
                    {typeof highlightedNft.royalties === 'number' && (
                      <Chip label={`Royalties: ${highlightedNft.royalties}%`} size="small" />
                    )}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    Minted: {highlightedNft.mintDate ? format(new Date(highlightedNft.mintDate), 'PPP') : 'Unknown date'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Creator: {highlightedNft.creator ? `${highlightedNft.creator.substring(0, 6)}...${highlightedNft.creator.substring(highlightedNft.creator.length - 4)}` : 'Unknown'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Owner: {highlightedNft.owner ? `${highlightedNft.owner.substring(0, 6)}...${highlightedNft.owner.substring(highlightedNft.owner.length - 4)}` : 'Unknown'}
            </Typography>

                  {highlightedNft.ipfsUrl && (
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', mt: 1 }}>
                      IPFS: {highlightedNft.ipfsUrl.substring(0, 20)}...
            </Typography>
                  )}
                </CardContent>
              </Grid>
            </Grid>
          </Card>
          </Box>
      )}

      {(!id || !highlightedNft) && (
        <>
          {nfts.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              You don't have any NFTs yet. Try minting one!
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {nfts.map((nft, index) => {
                // Determine if this NFT matches the requested ID
                const isHighlighted = highlightedNft && (
                  nft.id === highlightedNft.id ||
                  nft.tokenId === highlightedNft.tokenId
                );

                return (
                  <Grid
                    item
                    xs={12} sm={6} md={4} lg={3}
                    key={nft.id || `nft-${index}`}
                    ref={isHighlighted ? highlightedNftRef : null}
                  >
                    <Fade in timeout={300} style={{ transitionDelay: `${index * 50}ms` }}>
                      <div>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                            position: 'relative',
                            transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: '0 12px 20px rgba(0, 0, 0, 0.2)'
                            },
                            ...(isHighlighted ? {
                              boxShadow: '0 0 0 2px #8b5cf6, 0 0 20px rgba(139, 92, 246, 0.5)',
                              transform: 'translateY(-5px)',
                            } : {})
                          }}
                        >
                          {isHighlighted && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bgcolor: 'primary.main',
                                color: 'black',
                                px: 2,
                                py: 0.5,
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                zIndex: 1,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              }}
                            >
                              Selected NFT
                            </Box>
                          )}
                          <Box sx={{ pt: '100%', position: 'relative' }}>
                    <NFTImage
                      src={nft.image}
                      alt={nft.name}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain', // Changed from 'cover' to 'contain' for better display
                        backgroundColor: '#f5f5f5', // Light background for better visibility
                      }}
                    />
                          </Box>
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Typography gutterBottom variant="h5" component="h2">
                        {nft.name}
                      </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {nft.description ?
                                (nft.description.length > 100 ? `${nft.description.substring(0, 100)}...` : nft.description)
                                : 'No description available'}
                      </Typography>
                            <Stack direction="row" spacing={1}>
                            <Chip
                                label={`ID: ${nft.tokenId || nft.id.substring(0, 8)}`}
                              size="small"
                              variant="outlined"
                              />
                              {typeof nft.royalties === 'number' && (
                                <Chip
                                  label={`${nft.royalties}%`}
                                  size="small"
                              color="primary"
                                  variant="outlined"
                            />
                          )}
                              {typeof nft.fractions === 'number' && nft.fractions > 1 && (
                            <Chip
                              label={`${nft.fractions} Fractions`}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                      </Stack>
                            {nft.mintDate && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Minted: {format(new Date(nft.mintDate || new Date()), 'PPP')}
                              </Typography>
                            )}
                    </CardContent>
                  </Card>
                      </div>
                </Fade>
              </Grid>
                );
              })}
          </Grid>
        )}
        </>
      )}
    </Container>
  );
};

export default Gallery;