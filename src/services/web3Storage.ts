/**
 * Web3.Storage Integration - Production Implementation
 *
 * This module provides a bridge between the legacy Web3.Storage interface
 * and the new Web3.Storage service using @web3-storage/w3up-client.
 *
 * Uses the production Web3.Storage service with cofounder's spaces:
 * - Primary: NijaNFTGen (did:key:z6MkqbnVhXLFfh3mg3rRa8dtYeRdaywhfVP7PkjHugqHJiPS)
 * - Backup: Nija Projects (did:key:z6MkoczXYA65Fvh8AcHXJPnQHB1eAmWhStCVKtrgQoj51iBM)
 */

import { web3StorageService } from './web3Storage.service';

// Web3.Storage configuration from environment
const WEB3_STORAGE_DID = import.meta.env.VITE_WEB3_STORAGE_API_KEY ||
                        import.meta.env.WEB3_STORAGE_DID ||
                        'did:key:z6MkqbnVhXLFfh3mg3rRa8dtYeRdaywhfVP7PkjHugqHJiPS';

/**
 * Initialize Web3.Storage service if not already ready
 */
async function ensureWeb3StorageReady(): Promise<void> {
  if (!web3StorageService.isSpaceReady()) {
    console.log('🔧 Initializing Web3.Storage service...');
    await web3StorageService.initialize();

    if (!web3StorageService.isSpaceReady()) {
      throw new Error('Web3.Storage service failed to initialize properly');
    }
  }
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface UploadResult {
  imageUrl: string;
  metadataUrl: string;
  imageCid: string;
  metadataCid: string;
}

/**
 * Upload an image file to IPFS via Web3.Storage
 */
export async function uploadImageToIPFS(file: File): Promise<{ url: string; cid: string }> {
  try {
    console.log('🖼️ Uploading image to Web3.Storage IPFS...');

    // Ensure Web3.Storage is ready
    await ensureWeb3StorageReady();

    // Upload using the production Web3.Storage service
    const result = await web3StorageService.uploadFile(file, (progress) => {
      console.log(`Image upload progress: ${progress.progress}% - ${progress.message}`);
    });

    console.log('✅ Image uploaded successfully to IPFS:', result);
    return {
      url: result.url,
      cid: result.cid
    };
  } catch (error) {
    console.error('❌ Error uploading image to IPFS:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload NFT metadata to IPFS via Web3.Storage
 */
export async function uploadMetadataToIPFS(metadata: NFTMetadata): Promise<{ url: string; cid: string }> {
  try {
    console.log('📄 Uploading metadata to Web3.Storage IPFS...');

    // Ensure Web3.Storage is ready
    await ensureWeb3StorageReady();

    // Upload using the production Web3.Storage service
    const result = await web3StorageService.uploadMetadata(metadata, (progress) => {
      console.log(`Metadata upload progress: ${progress.progress}% - ${progress.message}`);
    });

    console.log('✅ Metadata uploaded successfully to IPFS:', result);
    return {
      url: result.url,
      cid: result.cid
    };
  } catch (error) {
    console.error('❌ Error uploading metadata to IPFS:', error);
    throw new Error(`Failed to upload metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Complete NFT upload process: image + metadata
 */
export async function uploadNFTToIPFS(
  imageFile: File,
  metadata: Omit<NFTMetadata, 'image'>
): Promise<UploadResult> {
  try {
    console.log('Starting complete NFT upload process...');
    
    // Step 1: Upload image
    const imageResult = await uploadImageToIPFS(imageFile);
    
    // Step 2: Create complete metadata with image URL
    const completeMetadata: NFTMetadata = {
      ...metadata,
      image: imageResult.url
    };
    
    // Step 3: Upload metadata
    const metadataResult = await uploadMetadataToIPFS(completeMetadata);
    
    const result: UploadResult = {
      imageUrl: imageResult.url,
      metadataUrl: metadataResult.url,
      imageCid: imageResult.cid,
      metadataCid: metadataResult.cid
    };
    
    console.log('Complete NFT upload successful:', result);
    return result;
  } catch (error) {
    console.error('Error in complete NFT upload:', error);
    throw error;
  }
}

/**
 * Get file from IPFS (simulated for now)
 */
export async function getFileFromIPFS(cid: string, filename?: string): Promise<File | null> {
  try {
    console.log(`📁 Simulating IPFS file retrieval for CID: ${cid}`);

    // Simulate file retrieval delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For now, return null as we're simulating
    // In production, implement actual IPFS retrieval
    console.log('⚠️  File retrieval simulated - implement real IPFS gateway access');
    return null;
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    return null;
  }
}

/**
 * Check if Web3.Storage is properly configured
 */
export function isWeb3StorageConfigured(): boolean {
  return !!WEB3_STORAGE_DID && WEB3_STORAGE_DID.startsWith('did:key:');
}

/**
 * Get storage info
 */
export async function getStorageInfo() {
  try {
    // Get current space info from the Web3.Storage service
    const spaceInfo = web3StorageService.getCurrentSpaceInfo();

    return {
      configured: isWeb3StorageConfigured() && web3StorageService.isSpaceReady(),
      service: 'Web3.Storage (w3up-client)',
      spaceName: spaceInfo?.name || 'Unknown',
      spaceDid: spaceInfo?.did || WEB3_STORAGE_DID,
      registered: spaceInfo?.registered || false,
      key: WEB3_STORAGE_DID ? `${WEB3_STORAGE_DID.substring(0, 30)}...` : 'Not configured'
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      configured: false,
      service: 'Web3.Storage',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default {
  uploadImageToIPFS,
  uploadMetadataToIPFS,
  uploadNFTToIPFS,
  getFileFromIPFS,
  isWeb3StorageConfigured,
  getStorageInfo
};
