import React, { useCallback } from 'react';
import { toast } from 'react-hot-toast';

const NFTContext = React.createContext({
  // ... existing context properties ...
});

const useNFT = () => {
  // ... existing useNFT logic ...
};

const handleMintNFT = useCallback(async (
  recipientAddress: string, 
  tokenURI: string,
  metadataStruct: {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes?: string[];
  }) => {
  if (!tokenURI || !recipientAddress) return;
  
  setIsLoadingNFT(true);
  try {
    console.log('Minting NFT with data:', { recipientAddress, tokenURI, metadataStruct });
    
    // Get the session data from localStorage for authentication
    const sessionString = localStorage.getItem('nija_wallet_session');
    if (!sessionString) {
      throw new Error('No Nija Wallet session found. Please connect your wallet first.');
    }
    
    const sessionData = JSON.parse(sessionString);
    const { sessionId, nonce } = sessionData;
    
    if (!sessionId || !nonce) {
      throw new Error('Invalid session data. Please reconnect your wallet.');
    }
    
    // Send mint request to backend API with session credentials
    const response = await fetch('http://3.111.22.56:6102/api/nft/mint-real', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'X-Nonce': nonce.toString()
      },
      body: JSON.stringify({
        recipientAddress,
        tokenURI,
        metadataStruct
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to mint NFT');
    }
    
    console.log('Mint successful:', data);
    toast.success('NFT minted successfully!');
    
    // Get user NFTs to refresh the list with the new NFT
    fetchMyNFTs();
    
    // Reset form state
    setFormInput({ price: '', name: '', description: '' });
    setIsLoadingNFT(false);
    
  } catch (error) {
    console.error('Error minting NFT:', error);
    toast.error(`Minting error: ${error.message}`);
    setIsLoadingNFT(false);
  }
});

export { NFTContext, useNFT, handleMintNFT }; 