import React, { createContext, useContext, useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWallet } from './WalletContext';
import { mintNFT } from '../api/nft';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface NFTContextType {
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
  mintNFT: () => Promise<void>;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
}

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
  mintNFT: async () => {},
  previewUrl: null,
  setPreviewUrl: () => {},
});

export const NFTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { provider, signer, address } = useWallet();
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

  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      console.log("Starting file upload to IPFS");
      const formData = new FormData();
      formData.append('file', file);

      // Adding metadata for the file as recommended by Pinata
      formData.append('pinataMetadata', JSON.stringify({
        name: file.name
      }));

      // Check if we're using the development mock
      if (process.env.REACT_APP_ENABLE_MOCK_IPFS === 'true') {
        console.log("Using mock IPFS - returning dummy hash");
        toast.info("Using mock IPFS in development mode");
        // Return a mock IPFS URL
        return `https://gateway.pinata.cloud/ipfs/QmSimulated${Math.random().toString(36).substring(2, 10)}`;
      }

      console.log("Sending file to Pinata");
      
      // Get JWT from the file that already has credentials working
      const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiMDdkYTFmZi1lZmE0LTQ5YWYtYmRlYS05ZDk1ZDg4ODExMDMiLCJlbWFpbCI6ImQzY3JlYXRpdmV0ZWNoQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIyZDQzZTU2MDdlMGI3YTAyMjEwNCIsInNjb3BlZEtleVNlY3JldCI6ImMxYzZlNmQwZjY2YjdjMWY0YTZmNWE1ZTVjMWM2ZTZkMGY2NmI3YzFmNGE2ZjVhNWU1YzFjNmU2ZCIsImlhdCI6MTcxMDY3NTY4M30.XzeFCDm2Ru9hSMAmvWAOEpQbMgQQrV2r9SgPwvsGHeE';
      
      // Using Authorization: Bearer as recommended in current Pinata docs
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT}`
        },
        body: formData,
      });

      if (!response.ok) {
        console.error('Pinata API error:', response.status, response.statusText);
        let errorMessage = `Failed to upload to IPFS: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('Pinata error details:', errorData);
          errorMessage = errorData.error ? errorData.error : errorMessage;
        } catch (e) {
          console.error('Could not parse error response');
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("File uploaded to IPFS successfully:", data);
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      
      // If this is development, create a mock response
      if (process.env.NODE_ENV === 'development') {
        console.log("Using fallback mock IPFS in development");
        toast.warning("IPFS upload failed. Using mock data for development.");
        return `https://gateway.pinata.cloud/ipfs/QmFallback${Math.random().toString(36).substring(2, 10)}`;
      }
      
      throw error;
    }
  };

  const handleMintNFT = async () => {
    if (!provider || !signer || !address || !nftImage || !nftMetadata.name) {
      toast.error('Please connect wallet and fill in all required fields');
      return;
    }

    try {
      setIsMinting(true);
      toast.info('Starting NFT creation process...');

      // Step 1: Upload image to IPFS
      toast.info('Uploading image to IPFS... (Step 1/3)');
      let imageUrl;
      try {
        imageUrl = await uploadToIPFS(nftImage);
        console.log('Image uploaded to IPFS:', imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image to IPFS');
        throw error;
      }
      
      // Step 2: Create and upload metadata
      toast.info('Creating and uploading metadata... (Step 2/3)');
      const metadata = {
        ...nftMetadata,
        image: imageUrl,
      };

      let metadataUrl;
      try {
        // Create metadata file and upload to IPFS
        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        const metadataFile = new File([metadataBlob], `${nftMetadata.name.replace(/\s+/g, '-')}-metadata.json`, { type: 'application/json' });
        metadataUrl = await uploadToIPFS(metadataFile);
        console.log('Metadata uploaded to IPFS:', metadataUrl);
      } catch (error) {
        console.error('Error uploading metadata:', error);
        toast.error('Failed to upload metadata to IPFS');
        throw error;
      }

      // Step 3: Mint the NFT with the metadata
      toast.info('Minting your NFT... (Step 3/3)');
      try {
        // Call the mintNFT API function
        const result = await mintNFT({
          address,
          metadataUrl,
          royalties,
          fractions: isProMode ? fractions : 1,
        });

        console.log('NFT minted successfully:', result);
        toast.success('🎉 NFT created successfully!');
        
        // Reset form
        setNftImage(null);
        setNftMetadata({
          name: '',
          description: '',
          image: '',
        });
        setPreviewUrl(null);
        setRoyalties(0);
        setFractions(1);
      } catch (error) {
        console.error('Failed to mint NFT:', error);
        toast.error('Error during NFT minting process');
        throw error;
      }
    } catch (error) {
      console.error('Error in NFT minting process:', error);
      // Main error is already displayed in individual catch blocks
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <NFTContext.Provider
      value={{
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
        mintNFT: handleMintNFT,
        previewUrl,
        setPreviewUrl,
      }}
    >
      {children}
    </NFTContext.Provider>
  );
};

export const useNFT = () => useContext(NFTContext);

export default NFTContext; 