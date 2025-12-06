import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getUserNFTHistory, NFTActivity } from '../api/nft';
import { NFTImage } from '../components/NFTImage';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  Tooltip,
  Link,
  Stack
} from '@mui/material';
import {
  SwapHoriz,
  AddCircleOutline,
  MonetizationOn,
  ReceiptLong
} from '@mui/icons-material';
import { format } from 'date-fns';

// Helper function to get activity icon
const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'mint':
      return <AddCircleOutline color="success" />;
    case 'transfer':
      return <SwapHoriz color="info" />;
    case 'sale':
      return <MonetizationOn color="primary" />;
    default:
      return <ReceiptLong color="action" />;
  }
};

// Helper function to get activity label with appropriate color
const getActivityChip = (type: string) => {
  let color: 'success' | 'info' | 'default' | 'primary' = 'default';

  switch (type.toLowerCase()) {
    case 'mint':
      color = 'success';
      break;
    case 'transfer':
      color = 'info';
      break;
    case 'sale':
      color = 'primary';
      break;
  }

  return (
    <Chip
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      size="small"
      color={color}
      variant="outlined"
    />
  );
};

// Format wallet address to be more readable
const formatAddress = (address: string) => {
  return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
};

const History: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [activities, setActivities] = useState<NFTActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isConnected || !address) return;

      setIsLoading(true);
      setError(null);
      try {
        // First try to get history from API
        const historyData = await getUserNFTHistory(address);

        // Then check localStorage for any additional activities
        const localActivities = loadLocalActivities();

        // Combine both sources, removing duplicates
        const combinedActivities = [...historyData];

        // Add local activities that aren't already in the API results
        localActivities.forEach(localActivity => {
          if (!combinedActivities.some(activity => activity.id === localActivity.id)) {
            combinedActivities.push(localActivity);
          }
        });

        // Sort by timestamp (newest first)
        combinedActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        console.log('Combined NFT activities:', combinedActivities);
        setActivities(combinedActivities);
      } catch (err) {
        console.error('Error fetching NFT history:', err);

        // Try to load from localStorage as fallback
        const localActivities = loadLocalActivities();
        if (localActivities.length > 0) {
          console.log('Using local activities as fallback:', localActivities);
          setActivities(localActivities);
          setError(null);
        } else {
          setError('Failed to load your NFT activity history. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Function to load activities from localStorage
    const loadLocalActivities = (): NFTActivity[] => {
      try {
        // Get all localStorage keys
        const keys = Object.keys(localStorage);

        // Filter keys that start with 'nftgen_tx_'
        const activityKeys = keys.filter(key => key.startsWith('nftgen_tx_'));

        // Also check for NFTs in nftgen_local_nfts
        const localNftsKey = 'nftgen_local_nfts';

        console.log('Found activity keys in localStorage:', activityKeys);

        // Parse activities from localStorage
        const activities = activityKeys
          .map(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '');

              // Check if we have a valid activity
              if (!data) return null;

              // Try to get the image from multiple sources
              let imageUrl = data.image;

              // If no image, try to find it in other localStorage keys
              if (!imageUrl) {
                // Try to find image by tokenId
                if (data.tokenId) {
                  const tokenImageKey = `nft_image_${data.tokenId}`;
                  const tokenKey = `nft_token_${data.tokenId}`;

                  // First check if we have a token entry with this ID
                  const tokenData = localStorage.getItem(tokenKey);
                  if (tokenData) {
                    try {
                      const parsedToken = JSON.parse(tokenData);
                      if (parsedToken && parsedToken.image) {
                        imageUrl = parsedToken.image;
                      }
                    } catch (e) {
                      console.error(`Error parsing token data for ${tokenKey}:`, e);
                    }
                  }

                  // If still no image, check for image mapping
                  if (!imageUrl) {
                    const tokenImage = localStorage.getItem(tokenImageKey);
                    if (tokenImage) {
                      try {
                        // Check if it's JSON
                        const imageData = JSON.parse(tokenImage);
                        imageUrl = imageData.gatewayUrl || imageData.ipfsUrl || imageData;
                      } catch {
                        // Not JSON, use directly
                        imageUrl = tokenImage;
                      }
                    }
                  }
                }

                // Try to find by transaction ID
                if (!imageUrl && data.id) {
                  const txImageKey = `nft_image_tx_${data.id}`;
                  imageUrl = localStorage.getItem(txImageKey) || '';
                }

                // Try to find by hash
                if (!imageUrl && data.hash) {
                  const hashImageKey = `nft_image_${data.hash}`;
                  imageUrl = localStorage.getItem(hashImageKey) || '';
                }
              }

              // Create the activity object with all available data
              return {
                id: data.id || key.replace('nftgen_tx_', ''),
                type: data.type || 'mint',
                tokenId: data.tokenId || data.id?.substring(0, 8) || '',
                name: data.name || 'Untitled NFT',
                image: imageUrl || '/placeholder-nft.png',
                from: data.from || '0x0000000000000000000000000000000000000000',
                to: data.to || address || '',
                price: data.price,
                timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
                transactionHash: data.transactionHash || data.hash || data.id || '',
                description: data.description || 'No description available',
                contractAddress: data.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A'
              };
            } catch (e) {
              console.error(`Error parsing activity from localStorage key ${key}:`, e);
              return null;
            }
          })
          .filter(Boolean) as NFTActivity[];

        // Also check for NFTs in nftgen_local_nfts and convert them to activities
        try {
          const localNftsJson = localStorage.getItem(localNftsKey);
          if (localNftsJson) {
            const localNfts = JSON.parse(localNftsJson);
            if (Array.isArray(localNfts)) {
              console.log('History: Found NFTs in nftgen_local_nfts:', localNfts.length);

              // Convert NFTs to activities
              const nftActivities = localNfts.map(nft => {
                // Only include if not already in activities
                if (!activities.some(activity =>
                  activity.id === nft.id ||
                  activity.tokenId === nft.tokenId ||
                  activity.transactionHash === nft.transactionHash
                )) {
                  return {
                    id: nft.id,
                    type: 'mint',
                    tokenId: nft.tokenId || nft.id.substring(0, 8),
                    name: nft.name || 'Untitled NFT',
                    image: nft.image || '/placeholder-nft.png',
                    from: '0x0000000000000000000000000000000000000000',
                    to: nft.owner || address || '',
                    price: undefined,
                    timestamp: nft.createdAt || new Date().toISOString(),
                    transactionHash: nft.transactionHash || `tx-${nft.id}`,
                    description: nft.description || 'No description available',
                    contractAddress: nft.contractAddress || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A'
                  } as NFTActivity;
                }
                return null;
              }).filter(Boolean) as NFTActivity[];

              // Add to activities
              activities.push(...nftActivities);
            }
          }
        } catch (e) {
          console.error('History: Error parsing nftgen_local_nfts:', e);
        }

        // Sort by timestamp (newest first)
        activities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return activities;
      } catch (error) {
        console.error('Error loading activities from localStorage:', error);
        return [];
      }
    };

    fetchHistory();

    // Listen for NFT activity updates
    const handleActivityUpdate = () => {
      console.log('NFT activity update detected, reloading history');
      fetchHistory();
    };

    window.addEventListener('nftgen_activity_update', handleActivityUpdate);
    window.addEventListener('storage', handleActivityUpdate);

    return () => {
      window.removeEventListener('nftgen_activity_update', handleActivityUpdate);
      window.removeEventListener('storage', handleActivityUpdate);
    };
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Typography variant="h4" gutterBottom>
            NFT Activity History
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Please connect your wallet to view your NFT activities.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 5 }}>
        <Typography variant="h4" gutterBottom align="center">
          My NFT Activity History
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', my: 8 }}>
            <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
            <Typography variant="h6" color="text.secondary" align="center">
              Loading your NFT activity history...
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, maxWidth: 500 }}>
              We're retrieving your NFT activities from the blockchain and local storage. This may take a moment.
            </Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            sx={{
              my: 4,
              '& .MuiAlert-message': {
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              Error Loading NFT Activities
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Try refreshing the page or checking your wallet connection.
            </Typography>
          </Alert>
        ) : activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 8, p: 4, border: '1px dashed #ccc', borderRadius: 2, maxWidth: '600px', mx: 'auto' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No NFT Activity Found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You haven't performed any NFT actions yet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try minting a new NFT to see your activity history here.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Link href="/" underline="hover">
                <Typography variant="button" color="primary">
                  Go to NFT Creator
                </Typography>
              </Link>
            </Box>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                  <TableCell>Event</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Transaction</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {getActivityIcon(activity.type)}
                        {getActivityChip(activity.type)}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          component="div"
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            overflow: 'hidden',
                            position: 'relative',
                            bgcolor: 'background.paper'
                          }}
                          data-nft-id={activity.id || activity.tokenId}
                        >
                          <NFTImage
                            src={activity.image}
                            alt={activity.name || 'NFT'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain', // Changed from 'cover' to 'contain' for better display
                              backgroundColor: '#f5f5f5' // Light background for better visibility
                            }}
                            fallbackSrc="/placeholder-nft.png"
                          />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            #{activity.tokenId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={activity.from} arrow>
                        <Typography variant="body2">
                          {formatAddress(activity.from)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={activity.to} arrow>
                        <Typography variant="body2">
                          {formatAddress(activity.to)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {activity.price ? (
                        <Typography variant="body2">
                          {activity.price} ETH
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(activity.timestamp), 'MMM d, yyyy HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {activity.transactionHash ? (
                        <Tooltip title="View on blockchain explorer" arrow>
                          <Link
                            href={`https://etherscan.io/tx/${activity.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: 'block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {`${activity.transactionHash.substring(0, 6)}...${activity.transactionHash.substring(activity.transactionHash.length - 4)}`}
                          </Link>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default History;