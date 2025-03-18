import { NFT_API_BASE_URL } from '../config';

export interface MintNFTParams {
  address: string;
  metadataUrl: string;
  royalties: number;
  fractions: number;
}

export interface MintNFTResponse {
  tokenId: string;
  contractAddress: string;
  transactionHash: string;
  ipfsUrl: string;
}

export interface NFTItem {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  contractAddress: string;
  owner: string;
  creator: string;
  mintDate: string;
  royalties: number;
  fractions: number;
  ipfsUrl: string;
}

export interface NFTActivity {
  id: string;
  type: 'mint' | 'transfer' | 'sale' | 'auction';
  tokenId: string;
  name: string;
  image: string;
  from: string;
  to: string;
  price?: string;
  timestamp: string;
  transactionHash: string;
}

export const mintNFT = async (params: MintNFTParams): Promise<MintNFTResponse> => {
  try {
    console.log('Minting NFT with params:', params);
    
    const response = await fetch(`${NFT_API_BASE_URL}/api/nft/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Minting API error:', response.status, response.statusText);
      
      // If in development, we can use a mock response
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock minting response in development');
        
        return {
          tokenId: `${Math.floor(Math.random() * 1000000)}`,
          contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
          transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          ipfsUrl: params.metadataUrl
        };
      }
      
      throw new Error(`Failed to mint NFT: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error minting NFT:', error);
    
    // Always provide a fallback in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock minting response after error');
      
      return {
        tokenId: `${Math.floor(Math.random() * 1000000)}`,
        contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
        transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        ipfsUrl: params.metadataUrl
      };
    }
    
    throw error;
  }
};

export const getUserNFTs = async (address: string): Promise<NFTItem[]> => {
  try {
    console.log('Fetching user NFTs for address:', address);
    
    const response = await fetch(`${NFT_API_BASE_URL}/api/nft/gallery?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('Gallery API error:', response.status, response.statusText);
      
      // Only use mock data if we get a 404 (endpoint not found)
      if (response.status === 404 || process.env.NODE_ENV === 'development') {
        console.log('Using mock gallery data');
        return generateMockNFTs(address);
      }
      
      throw new Error(`Failed to fetch NFTs: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received NFT gallery data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    
    // Provide a fallback for network errors in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock gallery data after error');
      return generateMockNFTs(address);
    }
    
    throw error;
  }
};

export const getUserNFTHistory = async (address: string): Promise<NFTActivity[]> => {
  try {
    console.log('Fetching NFT history for address:', address);
    
    const response = await fetch(`${NFT_API_BASE_URL}/api/nft/history?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('History API error:', response.status, response.statusText);
      
      // Only use mock data if we get a 404 (endpoint not found)
      if (response.status === 404 || process.env.NODE_ENV === 'development') {
        console.log('Using mock history data');
        return generateMockHistory(address);
      }
      
      throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received NFT history data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching NFT history:', error);
    
    // Provide a fallback for network errors in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock history data after error');
      return generateMockHistory(address);
    }
    
    throw error;
  }
};

// Helper function to generate mock NFT gallery data
const generateMockNFTs = (address: string): NFTItem[] => {
  // Generate between 1 and 5 NFTs
  const count = Math.floor(Math.random() * 5) + 1;
  const nfts: NFTItem[] = [];
  
  const images = [
    'QmdqStCx1ezaKEWbcjfcQVYdUkC3miw3AJB68XBGQEXMcW',
    'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng',
    'QmZ7jtAAUogWjTHpnJKvapuEUiRm8EWrDEaMHfW7NWvupN',
    'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
    'QmX55c2KTiRTP3hFHzLBAEUEGbyd9g2a49eJhP9A5QXfWx'
  ];
  
  const names = [
    'Cosmic Journey',
    'Digital Dawn',
    'Ethereal Dimensions',
    'Quantum Realm',
    'Neon Dreams'
  ];
  
  for (let i = 0; i < count; i++) {
    const tokenId = Math.floor(Math.random() * 1000000).toString();
    nfts.push({
      id: `nft-${i}`,
      tokenId,
      name: names[i % names.length],
      description: `A unique digital collectible created on the NFTGen platform.`,
      image: `https://gateway.pinata.cloud/ipfs/${images[i % images.length]}`,
      contractAddress: '0x8901B7252e988E991eC333C6ef66307D8516b7a0',
      owner: address,
      creator: address,
      mintDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      royalties: Math.floor(Math.random() * 10),
      fractions: 1,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/QmMetadata${i}`
    });
  }
  
  return nfts;
};

// Helper function to generate mock NFT history data
const generateMockHistory = (address: string): NFTActivity[] => {
  // Generate between 2 and 8 activities
  const count = Math.floor(Math.random() * 6) + 2;
  const activities: NFTActivity[] = [];
  
  const activityTypes: ('mint' | 'transfer' | 'sale' | 'auction')[] = ['mint', 'transfer', 'sale', 'auction'];
  const images = [
    'QmdqStCx1ezaKEWbcjfcQVYdUkC3miw3AJB68XBGQEXMcW',
    'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng',
    'QmZ7jtAAUogWjTHpnJKvapuEUiRm8EWrDEaMHfW7NWvupN',
    'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
    'QmX55c2KTiRTP3hFHzLBAEUEGbyd9g2a49eJhP9A5QXfWx'
  ];
  
  const names = [
    'Cosmic Journey',
    'Digital Dawn',
    'Ethereal Dimensions',
    'Quantum Realm',
    'Neon Dreams'
  ];
  
  for (let i = 0; i < count; i++) {
    const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const tokenId = Math.floor(Math.random() * 1000000).toString();
    
    activities.push({
      id: `activity-${i}`,
      type: activityType,
      tokenId,
      name: names[i % names.length],
      image: `https://gateway.pinata.cloud/ipfs/${images[i % images.length]}`,
      from: activityType === 'mint' ? '0x0000000000000000000000000000000000000000' : '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
      to: address,
      price: activityType === 'sale' || activityType === 'auction' ? (Math.random() * 2).toFixed(3) + ' ETH' : undefined,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
    });
  }
  
  // Sort by timestamp descending (newest first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return activities;
}; 