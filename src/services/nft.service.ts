import type { NFT, NFTUploadFormData, NFTAttribute, NFTStatus } from '../types';
import { id as generateId } from 'ethers';
import { toast } from 'react-toastify';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs';
const NFT_STORAGE_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY;

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
  properties: {
    fractions: {
      supply: number;
      pricePerFraction: number;
    };
    royalty: {
      percentage: number;
      beneficiary: string;
    };
  };
}

export class NFTService {
  private static instance: NFTService;
  private constructor() {}

  public static getInstance(): NFTService {
    if (!NFTService.instance) {
      NFTService.instance = new NFTService();
    }
    return NFTService.instance;
  }

  async uploadNFT(data: NFTUploadFormData, onProgress?: (progress: number) => void): Promise<NFT> {
    try {
      if (!NFT_STORAGE_KEY) {
        throw new Error('NFT Storage key is not configured');
      }

      // Upload image to IPFS
      const imageHash = await this.uploadFileToIPFS(data.file, (progress) => {
        onProgress?.(progress * 0.6); // Image upload is 60% of total progress
      });

      // Prepare metadata
      const metadata: NFTMetadata = {
        name: data.name,
        description: data.description,
        image: `${IPFS_GATEWAY}/${imageHash}`,
        attributes: data.attributes,
        properties: {
          fractions: {
            supply: data.fractions,
            pricePerFraction: 0 // Will be set during fractionalization
          },
          royalty: {
            percentage: data.royaltyPercentage,
            beneficiary: data.royaltyBeneficiary
          }
        }
      };

      // Upload metadata to IPFS
      const metadataHash = await this.uploadJSONToIPFS(metadata, (progress) => {
        onProgress?.(60 + progress * 0.4); // Metadata upload is 40% of total progress
      });

      const nftId = generateId(`${Date.now()}`);
      const status: NFTStatus = 'PENDING';

      // Create NFT object
      const nft: NFT = {
        id: nftId,
        name: data.name,
        description: data.description,
        image: `${IPFS_GATEWAY}/${imageHash}`,
        metadata: `${IPFS_GATEWAY}/${metadataHash}`,
        owner: data.royaltyBeneficiary,
        fractions: {
          id: generateId(`${nftId}-fractions`),
          supply: data.fractions,
          remaining: data.fractions,
          pricePerFraction: 0 // Will be set during fractionalization
        },
        royalties: {
          id: generateId(`${nftId}-royalties`),
          percentage: data.royaltyPercentage,
          beneficiary: data.royaltyBeneficiary
        },
        status,
        attributes: data.attributes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return nft;
    } catch (error) {
      console.error('Error uploading NFT:', error);
      throw new Error('Failed to upload NFT');
    }
  }

  private async uploadFileToIPFS(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NFT_STORAGE_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to IPFS');
      }

      const data = await response.json();
      return data.value.cid;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  private async uploadJSONToIPFS(
    json: any,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const file = new File([blob], 'metadata.json', { type: 'application/json' });

      return await this.uploadFileToIPFS(file, onProgress);
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  }

  async mintNFT(nft: NFT): Promise<NFT> {
    try {
      // TODO: Implement NFT minting logic using ethers.js
      // This will involve:
      // 1. Connecting to the smart contract
      // 2. Calling the mint function with metadata URI
      // 3. Setting up fractionalization
      // 4. Setting up royalties
      // 5. Updating the NFT status to 'minted'
      
      const status: NFTStatus = 'MINTED';
      
      return {
        ...nft,
        status,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw new Error('Failed to mint NFT');
    }
  }

  async getNFTs(owner: string): Promise<NFT[]> {
    try {
      // TODO: Implement fetching NFTs owned by the address
      // This will involve:
      // 1. Querying the smart contract for tokens owned by the address
      // 2. Fetching metadata from IPFS for each token
      // 3. Returning the formatted NFT objects
      
      return [];
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      throw new Error('Failed to fetch NFTs');
    }
  }

  async getNFTDetails(tokenId: string): Promise<NFT> {
    try {
      // TODO: Implement fetching single NFT details
      // This will involve:
      // 1. Querying the smart contract for token details
      // 2. Fetching metadata from IPFS
      // 3. Returning the formatted NFT object
      
      throw new Error('Not implemented');
    } catch (error) {
      console.error('Error fetching NFT details:', error);
      throw new Error('Failed to fetch NFT details');
    }
  }
} 