import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getUserNFTs, NFTItem } from '../api/nft';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Fade,
  Divider
} from '@mui/material';
import { format } from 'date-fns';

const Gallery: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isConnected || !address) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const nftData = await getUserNFTs(address);
        setNfts(nftData);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to load your NFT collection. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', my: 8 }}>
          <Typography variant="h4" gutterBottom>
            NFT Gallery
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Please connect your wallet to view your NFT collection.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 5 }}>
        <Typography variant="h4" gutterBottom align="center">
          My NFT Collection
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 4 }}>
            {error}
          </Alert>
        ) : nfts.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              You don't have any NFTs yet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create your first NFT on the "Create" page.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {nfts.map((nft) => (
              <Grid item key={nft.id} xs={12} sm={6} md={4}>
                <Fade in={true} timeout={500}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="280"
                      image={nft.image}
                      alt={nft.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Typography variant="h5" component="h2" gutterBottom noWrap>
                        {nft.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          height: '3em',
                        }}
                      >
                        {nft.description}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Token ID
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            #{nft.tokenId}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Minted
                          </Typography>
                          <Typography variant="body2">
                            {format(new Date(nft.mintDate), 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {nft.royalties > 0 && (
                            <Chip
                              label={`${nft.royalties}% Royalties`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                          {nft.fractions > 1 && (
                            <Chip 
                              label={`${nft.fractions} Fractions`} 
                              size="small" 
                              variant="outlined" 
                              color="secondary" 
                            />
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Gallery; 