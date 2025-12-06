import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useWallet } from './WalletContext';
import { alchemyNFTService } from '../services/AlchemyNFTService';
import { NFT } from '../types';

// Global WebSocket declaration for Nwallet integration
declare global {
  interface Window {
    nftGenWalletWs?: WebSocket;
  }
}

// HYBRID INTEGRATION - Alchemy for blockchain data + Web3.Storage for IPFS uploads

// NFT type definition
interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  contractAddress: string;
  tokenId: string;
  status: 'OWNED' | 'LISTED' | 'SOLD' | 'FRACTIONALIZED';
  price?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    collection?: {
      name: string;
      family?: string;
    };
    creator?: string;
    external_url?: string;
    animation_url?: string;
    tokenStandard?: string;
    properties?: Record<string, any>;
    rarity?: {
      score: number;
      rank: number;
      totalSupply?: number;
    };
  };
  media?: Array<{
    gateway: string;
    raw?: string;
    format?: string;
    thumbnail?: string;
  }>;
  tokenType?: string;
  tokenUri?: {
    gateway: string;
    raw: string;
  };
  fractions?: {
    supply: number;
    available: number;
    pricePerFraction: string;
  };
}

// NFT Metadata type
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Pure Alchemy NFT Context - Read-only blockchain data
interface NFTContextType {
  userNFTs: NFT[];
  isLoadingNFTs: boolean;
  refreshUserNFTs: () => Promise<void>;
  fetchUserNFTs: () => Promise<NFT[]>;
  fetchNFTById: (contractAddress: string, tokenId: string) => Promise<NFT | null>;
  fetchNFTsForContract: (contractAddress: string) => Promise<NFT[]>;
  checkNFTOwnership: (walletAddress: string, contractAddress: string) => Promise<boolean>;
  // Re-enabled NFT creation functions
  createNFT: () => Promise<never>;
  mintNFT: (name: string, description: string, imageUrl: string) => Promise<{
    id: string;
    name: string;
    description: string;
    image: string;
    owner: string;
    contractAddress: string;
    tokenId: string;
    transactionHash?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    tokenURI?: string;
  }>;
  uploadToIPFS: () => Promise<never>;
  uploadMetadataToIPFS: () => Promise<never>;
  // NFT Creation UI State
  isProMode: boolean;
  setIsProMode: (value: boolean) => void;
  nftImage: File | null;
  setNftImage: (file: File | null) => void;
  nftMetadata: NFTMetadata;
  setNftMetadata: (metadata: NFTMetadata) => void;
  royalties: number;
  setRoyalties: (value: number) => void;
  fractions: number;
  setFractions: (value: number) => void;
  isMinting: boolean;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

// Default context values
const NFTContext = createContext<NFTContextType>({
  isProMode: false,
  setIsProMode: () => {},
  nftImage: null,
  setNftImage: () => {},
  nftMetadata: {
    name: '',
    description: '',
    image: '',
  },
  setNftMetadata: () => {},
  royalties: 0,
  setRoyalties: () => {},
  fractions: 1,
  setFractions: () => {},
  isMinting: false,
  mintNFT: async () => ({ id: '', name: '', description: '', image: '', owner: '', contractAddress: '', tokenId: '', status: 'OWNED', createdAt: '', updatedAt: '' }),
  previewUrl: null,
  setPreviewUrl: () => {},
  userNFTs: [],
  refreshUserNFTs: async () => {},
  isLoadingNFTs: false,
  fetchUserNFTs: async () => [],
  fetchNFTById: async () => null,
  uploadToIPFS: async () => '',
  uploadMetadataToIPFS: async () => '',
  createNFT: async () => '',
  listNFTForSale: async () => false,
  buyNFT: async () => false,
});

// Provider props
interface NFTProviderProps {
  children: ReactNode;
}

// Pure Alchemy NFT Provider - Read-only blockchain data
export const NFTProvider: React.FC<NFTProviderProps> = ({ children }) => {
  const { address } = useWallet();
  const [userNFTs, setUserNFTs] = useState<NFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  // NFT Creation UI State
  const [isProMode, setIsProMode] = useState(false);
  const [nftImage, setNftImage] = useState<File | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata>({
    name: '',
    description: '',
    image: '',
  });
  const [royalties, setRoyalties] = useState(0);
  const [fractions, setFractions] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ENABLED: Real Storacha IPFS Upload - Using production Storacha service
  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      console.log('NFTContext: Uploading file to Storacha IPFS...');

      // Import Storacha service dynamically to avoid SSR issues
      const { web3StorageService } = await import('../services/web3Storage.service');

      // Ensure service is initialized
      if (!web3StorageService.isSpaceReady()) {
        await web3StorageService.initialize();
      }

      // Upload file with progress tracking
      const result = await web3StorageService.uploadFile(file, (progress) => {
        console.log(`Upload progress: ${progress.progress}% - ${progress.message}`);
      });

      console.log('NFTContext: File uploaded successfully to Storacha IPFS:', result.url);
      console.log('NFTContext: IPFS CID:', result.cid);
      console.log('NFTContext: Gateway URL:', result.gateway);

      return result.url; // Returns ipfs:// URL

    } catch (error) {
      console.error('NFTContext: Storacha IPFS upload failed:', error);
      throw new Error(`Storacha IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ENABLED: Real Storacha Metadata Upload - Using production Storacha service
  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    try {
      console.log('NFTContext: Uploading metadata to Storacha IPFS...');

      // Import Storacha service dynamically
      const { web3StorageService } = await import('../services/web3Storage.service');

      // Ensure service is initialized
      if (!web3StorageService.isSpaceReady()) {
        await web3StorageService.initialize();
      }

      // Upload metadata with progress tracking
      const result = await web3StorageService.uploadMetadata(metadata, (progress) => {
        console.log(`Metadata upload progress: ${progress.progress}% - ${progress.message}`);
      });

      console.log('NFTContext: Metadata uploaded successfully to Storacha IPFS:', result.url);
      console.log('NFTContext: Metadata CID:', result.cid);

      return result.url; // Returns ipfs:// URL

    } catch (error) {
      console.error('NFTContext: Storacha metadata upload failed:', error);
      throw new Error(`Storacha metadata upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // REAL BLOCKCHAIN MINTING: Production-grade NFT minting with Sepolia testnet
  const mintNFT = async (name: string, description: string, imageFile: File, recipient?: string): Promise<{
    id: string;
    name: string;
    description: string;
    image: string;
    owner: string;
    contractAddress: string;
    tokenId: string;
    transactionHash: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    tokenURI: string;
    openseaUrl: string;
    etherscanUrl: string;
    gasUsed: string;
    totalCost: string;
  }> => {
    console.log('NFTContext: Starting REAL blockchain NFT minting...');
    console.log('NFTContext: Name:', name);
    console.log('NFTContext: Description:', description);
    console.log('NFTContext: Image file:', imageFile?.name, imageFile?.size);

    try {
      setIsMinting(true);

      // Get wallet session for recipient address
      const sessionStr = localStorage.getItem('nwallet_session') ||
                        localStorage.getItem('nija_wallet_session') ||
                        localStorage.getItem('nftgen_nwallet_session');

      let walletAddress = recipient;
      if (!walletAddress && sessionStr) {
        const session = JSON.parse(sessionStr);
        walletAddress = session.address;
      }

      // Use default address if no wallet connected
      if (!walletAddress) {
        walletAddress = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1'; // Default test address
        console.log('NFTContext: Using default recipient address');
      }

      console.log('NFTContext: Recipient address:', walletAddress);

      // Step 1: Execute REAL blockchain minting via API
      console.log('NFTContext: Preparing real blockchain minting request...');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('recipient', walletAddress);
      formData.append('image', imageFile);
      formData.append('external_url', `https://nftgen.app/nft/${Date.now()}`);

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://3.111.22.56:7102'}/api/mint/mint`;

      console.log('NFTContext: Sending minting request to:', apiUrl);

      // Execute REAL blockchain minting
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      const mintingResult = await response.json();

      if (!mintingResult.success) {
        throw new Error(mintingResult.error || 'Blockchain minting failed');
      }

      console.log('NFTContext: REAL blockchain minting completed!');
      console.log('🎯 Token ID:', mintingResult.tokenId);
      console.log('📡 Transaction Hash:', mintingResult.transactionHash);
      console.log('🔗 Contract Address:', mintingResult.contractAddress);
      console.log('🔗 OpenSea URL:', mintingResult.openseaUrl);
      console.log('🔗 Etherscan URL:', mintingResult.etherscanUrl);
      console.log('💸 Total Cost:', mintingResult.totalCost, 'ETH');

      // Create the NFT object with REAL blockchain data
      const nft = {
        id: mintingResult.tokenId,
        name,
        description,
        image: mintingResult.imageIPFS || `data:image/jpeg;base64,${await fileToBase64(imageFile)}`,
        owner: walletAddress,
        contractAddress: mintingResult.contractAddress,
        tokenId: mintingResult.tokenId,
        transactionHash: mintingResult.transactionHash,
        status: 'OWNED' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tokenURI: mintingResult.metadataIPFS,
        // Additional real blockchain data
        blockNumber: mintingResult.blockNumber,
        gasUsed: mintingResult.gasUsed,
        totalCost: mintingResult.totalCost,
        openseaUrl: mintingResult.openseaUrl,
        etherscanUrl: mintingResult.etherscanUrl,
        imageIPFS: mintingResult.imageIPFS,
        metadataIPFS: mintingResult.metadataIPFS,
        confirmations: mintingResult.confirmations
      };

      console.log('NFTContext: Created NFT object with REAL blockchain data:', nft);

      // Store NFT data in multiple localStorage keys for compatibility
      const nftDataKey = `nft_data_${mintingResult.tokenId}`;
      const nftTokenKey = `nft_token_${mintingResult.tokenId}`;

      localStorage.setItem(nftDataKey, JSON.stringify(nft));
      localStorage.setItem(nftTokenKey, JSON.stringify(nft));

      // Store in user's NFT collection
      const userNftsKey = `user_nfts_${walletAddress.toLowerCase()}`;
      const existingNfts = JSON.parse(localStorage.getItem(userNftsKey) || '[]');
      existingNfts.push(nft);
      localStorage.setItem(userNftsKey, JSON.stringify(existingNfts));

      // Store in global NFT collection
      const globalNftsKey = 'nftgen_local_nfts';
      const globalNfts = JSON.parse(localStorage.getItem(globalNftsKey) || '[]');
      globalNfts.push(nft);
      localStorage.setItem(globalNftsKey, JSON.stringify(globalNfts));

      // Create NFT activity record for Nwallet synchronization with REAL blockchain data
      const activity = {
        id: mintingResult.tokenId,
        tokenId: mintingResult.tokenId,
        name,
        description,
        image: mintingResult.imageIPFS || nft.image,
        type: 'NFT_CREATED',
        action: 'mint',
        from: '0x0000000000000000000000000000000000000000',
        to: walletAddress,
        walletAddress: walletAddress,
        timestamp: new Date().toISOString(),
        transactionHash: mintingResult.transactionHash,
        contractAddress: mintingResult.contractAddress,
        blockNumber: mintingResult.blockNumber,
        gasUsed: mintingResult.gasUsed,
        totalCost: mintingResult.totalCost,
        status: 'completed',
        source: 'nftgen_real_blockchain',
        metadata: {
          name,
          description,
          image: mintingResult.imageIPFS || nft.image,
          creator: walletAddress,
          owner: walletAddress,
          openseaUrl: mintingResult.openseaUrl,
          etherscanUrl: mintingResult.etherscanUrl,
          metadataIPFS: mintingResult.metadataIPFS
        }
      };

      const activityKey = `nftgen_tx_${mintingResult.tokenId}`;
      localStorage.setItem(activityKey, JSON.stringify(activity));

      console.log('NFTContext: REAL blockchain NFT activity created for Nwallet synchronization');

      // Trigger storage event for real-time synchronization
      window.dispatchEvent(new CustomEvent('nftgen_activity_update', {
        detail: activity
      }));

      // Send to Nwallet via WebSocket if available
      if (window.nftGenWalletWs && window.nftGenWalletWs.readyState === WebSocket.OPEN) {
        window.nftGenWalletWs.send(JSON.stringify({
          type: 'nft_activity_created',
          activity: activity,
          timestamp: Date.now()
        }));
        console.log('NFTContext: REAL blockchain NFT activity sent to Nwallet via WebSocket');
      }

      // Store IPFS image data with NFT ID for easy retrieval
      if (mintingResult.imageIPFS) {
        const imageDataKey = `ipfs_data_${mintingResult.tokenId}`;
        localStorage.setItem(imageDataKey, mintingResult.imageIPFS);
        console.log('NFTContext: Stored IPFS image data with key:', imageDataKey);
      }

      // Trigger storage event to notify other components
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('nftgen_activity_update', { detail: activity }));

      console.log('NFTContext: REAL blockchain NFT minting completed successfully!');
      console.log('🎉 Final result:', {
        tokenId: mintingResult.tokenId,
        transactionHash: mintingResult.transactionHash,
        openseaUrl: mintingResult.openseaUrl,
        etherscanUrl: mintingResult.etherscanUrl
      });

      return nft;

    } catch (error) {
      console.error('NFTContext: Error minting NFT:', error);
      throw error;
    } finally {
      setIsMinting(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // DISABLED: NFT Creation - Alchemy doesn't support NFT creation
  const createNFT = async (): Promise<never> => {
    throw new Error(
      'NFT creation is not supported by Alchemy API. ' +
      'Alchemy provides NFT data retrieval only, not NFT creation or blockchain transactions. ' +
      'NFTGen now operates as a read-only NFT viewer using real blockchain data.'
    );
  };

  // Fetch user's NFTs using pure Alchemy API
  const fetchUserNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!address) {
      setUserNFTs([]);
      return [];
    }

    try {
      setIsLoadingNFTs(true);
      console.log(`🔍 Fetching NFTs for owner: ${address} using Alchemy API`);

      // Use pure Alchemy service
      const response = await alchemyNFTService.getNFTsForOwner(address, {
        pageSize: 100,
        withMetadata: true
      });

      console.log(`✅ Found ${response.nfts.length} NFTs for owner ${address} from Alchemy`);

      // Store NFTs in localStorage for offline access
      try {
        localStorage.setItem('nftgen_user_nfts_alchemy', JSON.stringify(response.nfts));
        console.log('📦 Stored NFTs in localStorage for offline access');
      } catch (storageError) {
        console.warn('⚠️ Failed to store NFTs in localStorage:', storageError);
      }

      setUserNFTs(response.nfts);
      return response.nfts;
    } catch (error) {
      console.error("❌ Error fetching user NFTs from Alchemy:", error);
      toast.error("Failed to fetch your NFTs from blockchain. Trying offline data...");

      // Try to get NFTs from localStorage as fallback
      try {
        const storedNFTs = localStorage.getItem('nftgen_user_nfts_alchemy');
        if (storedNFTs) {
          const parsedNFTs = JSON.parse(storedNFTs) as NFT[];
          console.log(`📦 Retrieved ${parsedNFTs.length} NFTs from localStorage cache`);
          setUserNFTs(parsedNFTs);
          return parsedNFTs;
        }
      } catch (storageError) {
        console.error('❌ Failed to retrieve NFTs from localStorage:', storageError);
      }

      // No fallback to mock data - return empty array
      console.log('🚫 No NFTs found - returning empty array (no mock data)');
      setUserNFTs([]);
      return [];
    } finally {
      setIsLoadingNFTs(false);
    }
  }, [address]);

  // Refresh user's NFTs
  const refreshUserNFTs = useCallback(async () => {
    await fetchUserNFTs();
  }, [fetchUserNFTs]);

  // Fetch NFT by contract address and token ID using pure Alchemy API
  const fetchNFTById = async (contractAddress: string, tokenId: string): Promise<NFT | null> => {
    try {
      console.log(`🔍 Fetching NFT metadata: ${contractAddress}/${tokenId} using Alchemy API`);

      // Use pure Alchemy service
      const nft = await alchemyNFTService.getNFTMetadata(contractAddress, tokenId, {
        tokenType: 'ERC721',
        refreshCache: false,
        tokenUriTimeoutInMs: 15000
      });

      if (nft) {
        console.log(`✅ Retrieved NFT metadata from Alchemy: ${nft.name}`);
        return nft;
      }

      console.log(`❌ No NFT found for ${contractAddress}/${tokenId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching NFT ${contractAddress}/${tokenId}:`, error);
      return null;
    }
  };

  // Fetch NFTs for a specific contract using pure Alchemy API
  const fetchNFTsForContract = async (contractAddress: string): Promise<NFT[]> => {
    try {
      console.log(`🔍 Fetching NFTs for contract: ${contractAddress} using Alchemy API`);

      // Use pure Alchemy service
      const response = await alchemyNFTService.getNFTsForContract(contractAddress, {
        withMetadata: true,
        limit: 100
      });

      console.log(`✅ Retrieved ${response.nfts.length} NFTs for contract from Alchemy`);
      return response.nfts;
    } catch (error) {
      console.error(`❌ Error fetching NFTs for contract ${contractAddress}:`, error);
      return [];
    }
  };

  // Check NFT ownership using pure Alchemy API
  const checkNFTOwnership = async (walletAddress: string, contractAddress: string): Promise<boolean> => {
    try {
      console.log(`🔍 Checking NFT ownership: ${walletAddress} for ${contractAddress} using Alchemy API`);

      // Use pure Alchemy service
      const isHolder = await alchemyNFTService.isHolderOfContract(walletAddress, contractAddress);

      console.log(`✅ Ownership check result: ${isHolder}`);
      return isHolder;
    } catch (error) {
      console.error(`❌ Error checking NFT ownership:`, error);
      return false;
    }
  };

  // Load NFTs when address changes
  useEffect(() => {
    if (address) {
      fetchUserNFTs();
    }
  }, [address, fetchUserNFTs]);

  // Pure Alchemy Context Value - Read-only blockchain data
  const contextValue = {
    userNFTs,
    isLoadingNFTs,
    refreshUserNFTs,
    fetchUserNFTs,
    fetchNFTById,
    fetchNFTsForContract,
    checkNFTOwnership,
    // DISABLED FUNCTIONS - Alchemy doesn't support NFT creation
    createNFT,
    mintNFT,
    uploadToIPFS,
    uploadMetadataToIPFS,
    // NFT Creation UI State
    isProMode,
    setIsProMode,
    nftImage,
    setNftImage,
    nftMetadata,
    setNftMetadata,
    royalties,
    setRoyalties,
    fractions,
    setFractions,
    isMinting,
    previewUrl,
    setPreviewUrl,
  };

  return (
    <NFTContext.Provider value={contextValue}>
      {children}
    </NFTContext.Provider>
  );
};

export const useNFT = () => useContext(NFTContext);

export { NFTContext };
export default NFTContext;
