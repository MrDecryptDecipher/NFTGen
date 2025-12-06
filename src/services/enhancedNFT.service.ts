/**
 * Enhanced NFT Service
 * 
 * Combines Web3.Storage for IPFS uploads with Alchemy for blockchain interactions
 * Implements complete NFT lifecycle: creation, minting, and tracking
 */

import { web3StorageService, UploadProgress } from './web3Storage.service';
import { AlchemyNFTService } from './AlchemyNFTService';
import { smartContractService, TokenMetadata } from './smartContract.service';
import { webSocketService } from './websocket.service';
import type { NFT } from '../types';

// Enhanced NFT metadata interface
export interface EnhancedNFTMetadata {
  name: string;
  description: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
}

export interface MintingOptions {
  contractAddress: string;
  recipientAddress: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface MintingResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  error?: string;
  imageUrl?: string;
  metadataUrl?: string;
}

export interface NFTCreationProgress {
  stage: 'initializing' | 'uploading_image' | 'uploading_metadata' | 'minting' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: any;
}

class EnhancedNFTService {
  private alchemyService: AlchemyNFTService;
  private isInitialized = false;

  constructor() {
    this.alchemyService = new AlchemyNFTService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Enhanced NFT Service...');
      
      // Initialize Web3.Storage
      await web3StorageService.initialize();
      
      // Check if we need to create a space
      if (!web3StorageService.isSpaceReady()) {
        console.log('📝 Web3.Storage space not ready, creating new space...');
        await web3StorageService.createAndRegisterSpace({
          spaceName: `NFTGen-${Date.now()}`,
          email: 'nftgen@example.com' // You might want to make this configurable
        });
      }

      this.isInitialized = true;
      console.log('✅ Enhanced NFT Service initialized successfully');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Enhanced NFT Service:', error);
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Create and mint a complete NFT
   */
  async createAndMintNFT(
    imageFile: File,
    metadata: EnhancedNFTMetadata,
    mintingOptions: MintingOptions,
    onProgress?: (progress: NFTCreationProgress) => void
  ): Promise<MintingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      onProgress?.({
        stage: 'initializing',
        progress: 5,
        message: 'Initializing NFT creation process...'
      });

      // Step 1: Upload image and metadata to IPFS via Web3.Storage
      onProgress?.({
        stage: 'uploading_image',
        progress: 10,
        message: 'Uploading image to IPFS...'
      });

      const uploadResult = await web3StorageService.uploadCompleteNFT(
        imageFile,
        metadata,
        (uploadProgress: UploadProgress) => {
          let overallProgress = 10;
          if (uploadProgress.stage === 'uploading_image') {
            overallProgress = 10 + (uploadProgress.progress * 0.3); // 10-40%
          } else if (uploadProgress.stage === 'uploading_metadata') {
            overallProgress = 40 + (uploadProgress.progress * 0.2); // 40-60%
          }

          onProgress?.({
            stage: uploadProgress.stage.includes('image') ? 'uploading_image' : 'uploading_metadata',
            progress: overallProgress,
            message: uploadProgress.message
          });
        }
      );

      onProgress?.({
        stage: 'minting',
        progress: 65,
        message: 'Initiating blockchain transaction...'
      });

      // Step 2: Mint the NFT on the blockchain
      const mintResult = await this.mintNFTOnChain(
        mintingOptions.recipientAddress,
        uploadResult.metadataResult.url,
        mintingOptions,
        (mintProgress) => {
          onProgress?.({
            stage: 'minting',
            progress: 65 + (mintProgress * 0.3), // 65-95%
            message: 'Processing blockchain transaction...'
          });
        }
      );

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Minting failed');
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'NFT created and minted successfully!'
      });

      return {
        success: true,
        transactionHash: mintResult.transactionHash,
        tokenId: mintResult.tokenId,
        imageUrl: uploadResult.imageResult.gatewayUrl,
        metadataUrl: uploadResult.metadataResult.gatewayUrl
      };

    } catch (error: any) {
      console.error('❌ NFT creation failed:', error);
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `NFT creation failed: ${error.message}`
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mint NFT on blockchain using smart contract service
   */
  private async mintNFTOnChain(
    recipientAddress: string,
    metadataUrl: string,
    options: MintingOptions,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; transactionHash?: string; tokenId?: string; error?: string }> {
    try {
      onProgress?.(10);

      console.log('🔗 Minting NFT on blockchain...');
      console.log('📍 Recipient:', recipientAddress);
      console.log('📄 Metadata URL:', metadataUrl);
      console.log('🏭 Contract:', options.contractAddress);

      // Initialize smart contract service if needed
      await smartContractService.initialize();

      onProgress?.(30);

      // Prepare metadata for contract
      const contractMetadata: TokenMetadata = {
        name: 'NFTGen NFT', // This should come from the original metadata
        description: 'Created with NFTGen',
        image: metadataUrl,
        external_url: '',
        attributes: []
      };

      onProgress?.(50);

      // Mint the NFT using the smart contract service
      const mintResult = await smartContractService.mintERC721(
        recipientAddress,
        metadataUrl,
        contractMetadata
      );

      onProgress?.(90);

      if (mintResult.success) {
        // Send minting event to Nwallet via WebSocket
        webSocketService.sendNFTMintEvent({
          type: 'nft_minted',
          data: {
            tokenId: mintResult.tokenId!,
            contractAddress: options.contractAddress,
            transactionHash: mintResult.transactionHash!,
            imageUrl: metadataUrl,
            metadataUrl: metadataUrl,
            metadata: {
              name: contractMetadata.name,
              description: contractMetadata.description,
              attributes: []
            },
            timestamp: Date.now(),
            network: 'sepolia'
          }
        });

        onProgress?.(100);

        return {
          success: true,
          transactionHash: mintResult.transactionHash,
          tokenId: mintResult.tokenId
        };
      } else {
        throw new Error(mintResult.error || 'Minting failed');
      }

    } catch (error: any) {
      console.error('❌ Blockchain minting failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get NFT data using Alchemy
   */
  async getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFT | null> {
    return this.alchemyService.getNFTMetadata(contractAddress, tokenId);
  }

  /**
   * Get NFTs for owner using Alchemy
   */
  async getNFTsForOwner(ownerAddress: string, options: any = {}) {
    return this.alchemyService.getNFTsForOwner(ownerAddress, options);
  }

  /**
   * Get NFTs for contract using Alchemy
   */
  async getNFTsForContract(contractAddress: string, options: any = {}) {
    return this.alchemyService.getNFTsForContract(contractAddress, options);
  }

  /**
   * Check service status
   */
  getServiceStatus(): {
    web3Storage: boolean;
    alchemy: boolean;
    initialized: boolean;
  } {
    return {
      web3Storage: web3StorageService.isSpaceReady(),
      alchemy: true, // Alchemy is always available
      initialized: this.isInitialized
    };
  }

  /**
   * Get Web3.Storage space info
   */
  getStorageSpaceInfo() {
    return web3StorageService.getCurrentSpaceInfo();
  }
}

// Export singleton instance
export const enhancedNFTService = new EnhancedNFTService();
export default enhancedNFTService;
