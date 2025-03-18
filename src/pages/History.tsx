import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { getUserNFTHistory, NFTActivity } from '../api/nft';
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
        const historyData = await getUserNFTHistory(address);
        setActivities(historyData);
      } catch (err) {
        console.error('Error fetching NFT history:', err);
        setError('Failed to load your NFT activity history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
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
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 4 }}>
            {error}
          </Alert>
        ) : activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', my: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No activity found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You haven't performed any NFT actions yet.
            </Typography>
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
                        <Avatar 
                          src={activity.image} 
                          variant="rounded" 
                          sx={{ width: 40, height: 40 }}
                        />
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