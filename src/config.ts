// API configuration
export const API_BASE_URL = 'http://3.111.22.56:5177';

// NFT API configuration 
export const NFT_API_BASE_URL = 'http://3.111.22.56:3000';

// WebSocket configuration
export const WS_BASE_URL = 'ws://3.111.22.56:5176';

// NFT contract configuration
export const NFT_FRACTIONALIZATION_ADDRESS = '0x...'; // Replace with actual contract address
export const NFT_FRACTIONALIZATION_ABI = [
  // Fractionalize function
  {
    inputs: [
      { name: 'nftId', type: 'string' },
      { name: 'supply', type: 'uint256' },
      { name: 'pricePerFraction', type: 'uint256' },
      { name: 'minimumPurchase', type: 'uint256' }
    ],
    name: 'fractionalize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Buy fractions function
  {
    inputs: [
      { name: 'nftId', type: 'string' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'buyFractions',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  // Get fraction details function
  {
    inputs: [{ name: 'nftId', type: 'string' }],
    name: 'getFractionDetails',
    outputs: [
      { name: 'supply', type: 'uint256' },
      { name: 'pricePerFraction', type: 'uint256' },
      { name: 'minimumPurchase', type: 'uint256' },
      { name: 'availableFractions', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
]; 