/**
 * Proper Pinata Service Implementation
 * Following official Pinata documentation for client-side uploads
 * Uses presigned URLs to avoid CORS and rate limiting issues
 */

interface PresignedURLResponse {
  success: boolean;
  url: string;
  expires: number;
  maxFileSize: number;
  allowedTypes: string[];
  timestamp: string;
}

interface ClientUploadResponse {
  success: boolean;
  image: {
    cid: string;
    url: string;
  };
  metadata: {
    cid: string;
    url: string;
  };
  message: string;
  timestamp: string;
}

interface PinataUploadResponse {
  cid: string;
  id: string;
  name: string;
  size: number;
  created_at: string;
}

export class ProperPinataService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:7105';
  }

  /**
   * Get presigned URL for client-side upload (following Pinata docs)
   */
  async getPresignedURL(): Promise<PresignedURLResponse> {
    try {
      console.log('🔗 Requesting presigned URL from server...');

      const response = await fetch(`${this.baseUrl}/api/mint/presigned-url`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Presigned URL received successfully');

      return result;
    } catch (error) {
      console.error('❌ Failed to get presigned URL:', error);
      throw error;
    }
  }

  /**
   * Upload file using presigned URL (following Pinata docs with SDK)
   */
  async uploadFileWithPresignedURL(file: File, presignedURL: string): Promise<PinataUploadResponse> {
    try {
      console.log('📤 Uploading file using presigned URL...');
      console.log('📁 File:', { name: file.name, size: file.size, type: file.type });

      // Import Pinata SDK dynamically for client-side use
      const { PinataSDK } = await import('pinata');

      // Initialize Pinata SDK (no JWT needed for presigned uploads)
      const pinata = new PinataSDK({
        pinataJwt: '', // Empty JWT since we're using presigned URL
        pinataGateway: 'rose-accepted-puma-897.mypinata.cloud'
      });

      // Upload using Pinata SDK with presigned URL (following official docs)
      const result = await pinata.upload.public
        .file(file)
        .url(presignedURL);

      console.log('✅ File uploaded successfully:', result);

      return result;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  /**
   * Process client upload result on server
   */
  async processClientUpload(uploadResult: PinataUploadResponse, metadata: {
    name: string;
    description: string;
    recipient: string;
    sessionId?: string;
  }): Promise<ClientUploadResponse> {
    try {
      console.log('🔄 Processing client upload on server...');

      const response = await fetch(`${this.baseUrl}/api/mint/client-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cid: uploadResult.cid,
          name: metadata.name,
          description: metadata.description,
          recipient: metadata.recipient,
          sessionId: metadata.sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Processing failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Client upload processed successfully:', result);

      return result;
    } catch (error) {
      console.error('❌ Failed to process client upload:', error);
      throw error;
    }
  }

  /**
   * Complete client-side upload flow (following Pinata documentation)
   */
  async uploadNFTAssets(file: File, metadata: {
    name: string;
    description: string;
    recipient: string;
    sessionId?: string;
  }): Promise<ClientUploadResponse> {
    try {
      console.log('🎨 Starting complete NFT asset upload flow...');

      // Step 1: Get presigned URL
      const presignedResponse = await this.getPresignedURL();

      // Step 2: Upload file using presigned URL
      const uploadResult = await this.uploadFileWithPresignedURL(file, presignedResponse.url);

      // Step 3: Process upload result on server
      const processedResult = await this.processClientUpload(uploadResult, metadata);

      console.log('🎉 Complete NFT asset upload successful!');
      return processedResult;

    } catch (error) {
      console.error('❌ Complete NFT asset upload failed:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size (10MB limit as per presigned URL)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`
      };
    }

    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: `File type (${file.type}) is not allowed. Only images are supported.`
      };
    }

    return { valid: true };
  }

  /**
   * Get optimized image URL (avoiding CORS issues)
   */
  getOptimizedImageURL(cid: string, options?: {
    width?: number;
    height?: number;
    format?: 'webp' | 'png' | 'jpg';
  }): string {
    // Use IPFS.io gateway to avoid CORS issues with Pinata gateway
    let url = `https://ipfs.io/ipfs/${cid}`;
    
    // Add optimization parameters if supported
    if (options) {
      const params = new URLSearchParams();
      if (options.width) params.append('w', options.width.toString());
      if (options.height) params.append('h', options.height.toString());
      if (options.format) params.append('format', options.format);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  }

  /**
   * Get multiple gateway URLs for redundancy
   */
  getGatewayURLs(cid: string): {
    primary: string;
    fallback: string[];
  } {
    return {
      primary: `https://ipfs.io/ipfs/${cid}`,
      fallback: [
        `https://gateway.ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`
      ]
    };
  }
}

export default ProperPinataService;
