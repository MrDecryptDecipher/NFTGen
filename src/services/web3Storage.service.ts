/**
 * Real Pinata IPFS Service
 *
 * This service handles REAL IPFS uploads using your actual Pinata account
 * with proper API key authentication for production-ready NFT storage.
 *
 * Updated for July 2025 - Using REAL Pinata + Alchemy backend
 */

// Note: Now using REAL Pinata IPFS + Alchemy Ethereum integration

// Types for Storacha operations
export interface UploadResult {
  cid: string;
  url: string;
  gateway: string;
}

export interface UploadProgress {
  stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  startTime?: number;
  elapsedTime?: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
}

class Web3StorageService {
  private isInitialized = false;
  private backendUrl = 'http://3.111.22.56:7102';

  constructor() {
    console.log('🔧 PinataService: Initializing REAL Pinata IPFS service...');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing REAL Pinata IPFS service...');

      // Test server connectivity with REAL Pinata backend
      console.log('📡 Testing REAL Pinata + Alchemy backend...');
      const testResponse = await fetch(`${this.backendUrl}/api/web3storage/credentials`);

      if (testResponse.ok) {
        const result = await testResponse.json();
        console.log('✅ REAL Pinata + Alchemy backend available:', result.service);
      } else {
        console.warn('⚠️ REAL Pinata backend not available');
      }

      this.isInitialized = true;

    } catch (error: any) {
      console.error('❌ Failed to initialize REAL Pinata service:', error);
      // Always fallback to server-side uploads
      console.log('🔄 Using REAL Pinata backend...');
      this.isInitialized = true;
    }
  }

  /**
   * Check if space is ready for uploads
   */
  isSpaceReady(): boolean {
    return this.isInitialized && (this.client !== null || this.spaceDID !== null);
  }

  /**
   * Upload a single file to REAL Storacha IPFS
   */
  async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing file for REAL Storacha upload...',
        startTime,
        elapsedTime: 0
      });

      // Validate file size (100MB limit)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 100MB limit`);
      }

      // Validate file type for NFTs (allow images and JSON for metadata)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/json', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      onProgress?.({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading to REAL Storacha IPFS...',
        startTime,
        elapsedTime: Date.now() - startTime
      });

      let result: any;

      // Skip client-side upload and go directly to server-side for reliability
      console.log('🔄 Using server-side upload for maximum compatibility...');

      // Always use server-side upload for reliability
      console.log('🔄 Using server-side Web3.Storage upload...');

      onProgress?.({
        stage: 'uploading',
        progress: 50,
        message: 'Uploading via server-side Web3.Storage...',
        startTime,
        elapsedTime: Date.now() - startTime
      });

      // Create FormData for server upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      // Upload via server-side endpoint
      const uploadUrl = `${import.meta.env.VITE_API_URL || 'http://3.111.22.56:7102'}/api/web3storage/upload`;

      console.log('📤 Uploading to server endpoint:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      console.log('📥 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server upload error:', errorText);
        throw new Error(`Server upload failed: ${response.statusText} - ${errorText}`);
      }

      result = await response.json();
      console.log('📋 Server upload result:', result);

      if (!result.success) {
        throw new Error(result.error || result.details || 'Server upload failed');
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'REAL Storacha upload completed!',
        startTime,
        elapsedTime: Date.now() - startTime
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`✅ REAL Storacha upload completed: ${result.url}`);
      console.log(`📊 Upload duration: ${totalDuration}ms`);
      console.log(`🔗 IPFS CID: ${result.cid}`);
      console.log(`🌐 Gateway URL: ${result.gateway}`);

      return {
        cid: result.cid,
        url: result.url,
        gateway: result.gateway || `https://${result.cid}.ipfs.w3s.link`
      };

    } catch (error: any) {
      console.error('❌ Storacha upload failed:', error);

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Upload failed: ${error.message}`,
        startTime,
        elapsedTime: Date.now() - startTime
      });

      throw new Error(`REAL Storacha upload failed: ${error.message}`);
    }
  }

  /**
   * Upload metadata to REAL Storacha IPFS
   */
  async uploadMetadata(
    metadata: any,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing metadata for Storacha upload...'
      });

      // Create metadata file
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });

      // Upload metadata file
      const result = await this.uploadFile(metadataFile, onProgress);

      console.log('✅ Metadata uploaded successfully to Storacha');
      console.log('📄 Metadata URL:', result.url);
      console.log('🔗 Metadata CID:', result.cid);

      return result;

    } catch (error: any) {
      console.error('❌ Failed to upload metadata:', error);
      throw new Error(`Metadata upload failed: ${error.message}`);
    }
  }

  /**
   * Upload NFT metadata and image to REAL Pinata IPFS
   */
  async uploadNFTMetadata(
    imageFile: File,
    metadata: NFTMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ imageUrl: string; metadataUrl: string; imageCID: string; metadataCID: string }> {
    try {
      onProgress?.({
        stage: 'uploading',
        progress: 10,
        message: 'Uploading NFT to REAL Pinata IPFS...'
      });

      // Convert image to base64 for backend
      const imageBase64 = await this.fileToBase64(imageFile);

      onProgress?.({
        stage: 'uploading',
        progress: 30,
        message: 'Uploading to REAL Pinata + Alchemy backend...'
      });

      // Send complete NFT data to backend in the correct format
      const nftData = {
        name: metadata.name,
        description: metadata.description,
        image: imageBase64,
        attributes: metadata.attributes || [],
        mintNFT: false // Just upload to IPFS, don't mint yet
      };

      const uploadUrl = `${this.backendUrl}/api/web3storage/upload`;
      console.log('📤 Uploading to REAL Pinata backend:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nftData)
      });

      console.log('📥 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend upload error:', errorText);
        throw new Error(`Backend upload failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 Backend upload result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Backend upload failed');
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'REAL Pinata IPFS upload completed!'
      });

      console.log('✅ NFT uploaded to REAL Pinata IPFS successfully');
      console.log('🖼️ Image URL:', result.imageUrl);
      console.log('🖼️ Image CID:', result.imageCID);
      console.log('📄 Metadata URL:', result.metadataUrl);
      console.log('📄 Metadata CID:', result.metadataCID);

      return {
        imageUrl: result.imageUrl || result.metadata?.image || '',
        metadataUrl: result.metadataUrl || '',
        imageCID: result.imageCID || '',
        metadataCID: result.metadataCID || ''
      };

    } catch (error: any) {
      console.error('❌ Failed to upload NFT metadata:', error);
      throw new Error(`NFT metadata upload failed: ${error.message}`);
    }
  }

  /**
   * Convert File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Keep full data URL for backend
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Export singleton instance
export const web3StorageService = new Web3StorageService();
export default web3StorageService;
