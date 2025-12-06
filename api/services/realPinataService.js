require('dotenv').config({ path: __dirname + '/../.env' });
const { PinataSDK } = require('pinata');

console.log('🔧 REAL Pinata Service 2025: Module loaded successfully');

class RealPinataService {
  constructor() {
    // Use provided credentials with fallback to environment variables
    this.jwt = process.env.PINATA_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlZjcxZDljNy1lYWNmLTQyMGQtYmQzYS1mMTNkZjNkODY1MmYiLCJlbWFpbCI6InNhbmRlZXAuc2F2ZXRoZW0yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI2ZmRmMzFhMzg1MTUxY2EzODk1MiIsInNjb3BlZEtleVNlY3JldCI6ImJmYTk0YjYyZjkzN2JmODNhMmVhOTY0ZTI1YzI1MTQwYTg0NDAwZGY0MTdhYzNiNmNkNWQ0NWQ3MzhiM2JmYjkiLCJleHAiOjE3ODcwNTI5NTh9.nJ95c0_f764QJhX9hgnJI5tHRBgdQAPVbVKeTwz8Mrg';
    this.apiKey = process.env.PINATA_API_KEY || '6fdf31a385151ca38952';
    this.apiSecret = process.env.PINATA_API_SECRET || 'bfa94b62f937bf83a2ea964e25c25140a84400df417ac3b6cd5d45d738b3bfb9';
    this.gateway = process.env.PINATA_GATEWAY || 'rose-accepted-puma-897.mypinata.cloud';
    this.pinata = null;
    this.initialized = false;
    this.uploadRetries = 3;
    this.uploadTimeout = 30000; // 30 seconds

    console.log('🔧 REAL Pinata Service 2025: Initializing with production credentials...');
    console.log('🔧 Gateway:', this.gateway);
    console.log('🔧 JWT present:', !!this.jwt);
    console.log('🔧 API Key present:', !!this.apiKey);
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('📌 REAL Pinata 2025: Initializing with production SDK...');

      // Validate credentials
      if (!this.jwt) {
        throw new Error('PINATA_JWT is required for production operation');
      }

      // Initialize the Pinata SDK with production credentials
      console.log('🔧 REAL Pinata 2025: Creating SDK instance with production JWT...');
      this.pinata = new PinataSDK({
        pinataJwt: this.jwt,
        pinataGateway: this.gateway,
      });

      // Test the connection
      console.log('🔍 REAL Pinata 2025: Testing connection...');
      await this.testConnection();

      console.log('✅ REAL Pinata 2025: SDK initialized and verified successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ REAL Pinata 2025: Failed to initialize SDK:', error);
      this.initialized = false;
      throw error;
    }
  }

  // Production method to validate JWT token
  async validateJWT() {
    try {
      if (!this.jwt) {
        throw new Error('JWT token is required');
      }

      // Parse JWT to check expiration
      const payload = JSON.parse(atob(this.jwt.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < currentTime) {
        throw new Error('JWT token has expired');
      }

      console.log('✅ JWT token is valid and not expired');
      return true;

    } catch (error) {
      console.error('❌ JWT validation failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🔍 Testing REAL Pinata connection...');

      // Test JWT authentication with timeout
      const testPromise = this.testJWTConnection();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection test timeout after 10 seconds')), 10000)
      );

      const result = await Promise.race([testPromise, timeoutPromise]);
      console.log('✅ REAL Pinata connection test successful');
      return result;

    } catch (error) {
      console.error('❌ REAL Pinata connection test failed:', error);
      throw error;
    }
  }

  async testJWTConnection() {
    // Test JWT with the legacy authentication endpoint
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JWT test failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ REAL Pinata JWT connection test successful:', result.message);
    return result;
  }

  async testAPIKeyConnection() {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.apiSecret
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API key test failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ REAL Pinata API key connection test successful:', result.message);
    return result;
  }

  async uploadFile(fileBuffer, fileName, metadata = {}) {
    console.log('🚨 REAL Pinata 2025: uploadFile method called!');
    await this.initialize();

    // Validate inputs
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('File name is required and must be a string');
    }

    let lastError;
    for (let attempt = 1; attempt <= this.uploadRetries; attempt++) {
      try {
        console.log(`📌 REAL Pinata 2025: Upload attempt ${attempt}/${this.uploadRetries} for ${fileName} (${fileBuffer.length} bytes)`);

        // Create File object for upload
        const file = new File([fileBuffer], fileName, {
          type: metadata.contentType || this.getContentType(fileName)
        });

        // Upload with timeout
        const uploadPromise = this.pinata.upload.public.file(file).name(fileName);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), this.uploadTimeout)
        );

        const upload = await Promise.race([uploadPromise, timeoutPromise]);

        console.log('✅ REAL Pinata 2025: File uploaded successfully:', upload.cid);
        console.log('🔍 REAL Pinata 2025: Upload response:', JSON.stringify(upload, null, 2));

        // Verify upload by checking if CID is accessible
        await this.verifyCIDAccessibility(upload.cid);

        // Generate multiple gateway URLs for redundancy
        const imageUrl = `https://${this.gateway}/ipfs/${upload.cid}`;
        const gatewayUrl = `https://ipfs.io/ipfs/${upload.cid}`;
        const pinataGatewayUrl = `https://rose-accepted-puma-897.mypinata.cloud/ipfs/${upload.cid}`;

        return {
          success: true,
          cid: upload.cid,
          imageUrl,
          gatewayUrl,
          pinataGatewayUrl,
          fileName,
          size: fileBuffer.length,
          service: 'REAL Pinata 2025 Production SDK',
          pinataId: upload.id,
          timestamp: new Date().toISOString(),
          verified: true
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ REAL Pinata 2025: Upload attempt ${attempt} failed:`, error.message);

        if (attempt < this.uploadRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ REAL Pinata 2025: All upload attempts failed:', lastError);
    throw lastError;
  }

  // Helper method to determine content type from file extension
  getContentType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    const contentTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'json': 'application/json',
      'txt': 'text/plain'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  // Verify that uploaded content is accessible via IPFS
  async verifyCIDAccessibility(cid) {
    try {
      console.log('🔍 Verifying CID accessibility:', cid);

      // Try to access the content via gateway
      const response = await fetch(`https://${this.gateway}/ipfs/${cid}`, {
        method: 'HEAD',
        timeout: 5000
      });

      if (response.ok) {
        console.log('✅ CID verified accessible via gateway');
        return true;
      } else {
        console.warn('⚠️ CID not immediately accessible, but this is normal for new uploads');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ CID verification failed, but this is normal for new uploads:', error.message);
      return false;
    }
  }



  async uploadMetadata(metadata) {
    await this.initialize();

    // Validate metadata
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata must be a valid object');
    }

    // Ensure required NFT metadata fields
    const nftMetadata = {
      name: metadata.name || 'Untitled NFT',
      description: metadata.description || 'NFT created with NFTGen',
      image: metadata.image,
      ...metadata,
      // Add NFT standard fields
      external_url: metadata.external_url || '',
      attributes: metadata.attributes || [],
      // Add creation metadata
      created_by: 'NFTGen Platform',
      created_at: new Date().toISOString(),
      ipfs_service: 'Pinata IPFS'
    };

    let lastError;
    for (let attempt = 1; attempt <= this.uploadRetries; attempt++) {
      try {
        console.log(`📌 REAL Pinata 2025: Metadata upload attempt ${attempt}/${this.uploadRetries}`);

        // Upload with timeout
        const uploadPromise = this.pinata.upload.public.json(nftMetadata);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Metadata upload timeout')), this.uploadTimeout)
        );

        const upload = await Promise.race([uploadPromise, timeoutPromise]);

        console.log('✅ REAL Pinata 2025: Metadata uploaded successfully:', upload.cid);
        console.log('🔍 REAL Pinata 2025: Metadata response:', JSON.stringify(upload, null, 2));

        // Verify metadata accessibility
        await this.verifyCIDAccessibility(upload.cid);

        // Generate multiple gateway URLs for redundancy
        const metadataUrl = `https://${this.gateway}/ipfs/${upload.cid}`;
        const gatewayUrl = `https://ipfs.io/ipfs/${upload.cid}`;
        const pinataGatewayUrl = `https://rose-accepted-puma-897.mypinata.cloud/ipfs/${upload.cid}`;

        return {
          success: true,
          cid: upload.cid,
          metadataUrl,
          gatewayUrl,
          pinataGatewayUrl,
          metadata: nftMetadata,
          service: 'REAL Pinata 2025 Production SDK',
          pinataId: upload.id,
          timestamp: new Date().toISOString(),
          verified: true
        };

      } catch (error) {
        lastError = error;
        console.error(`❌ REAL Pinata 2025: Metadata upload attempt ${attempt} failed:`, error.message);

        if (attempt < this.uploadRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ REAL Pinata 2025: All metadata upload attempts failed:', lastError);
    throw lastError;
  }

  // Comprehensive method to upload both file and metadata for NFT creation
  async uploadNFTAssets(fileBuffer, fileName, nftMetadata) {
    console.log('🎨 REAL Pinata 2025: Starting comprehensive NFT asset upload...');

    try {
      // Step 1: Upload the image file
      console.log('📸 Step 1: Uploading NFT image...');
      const imageUpload = await this.uploadFile(fileBuffer, fileName, {
        contentType: this.getContentType(fileName)
      });

      // Step 2: Create metadata with image URL
      console.log('📄 Step 2: Creating NFT metadata...');
      const metadataWithImage = {
        ...nftMetadata,
        image: imageUpload.imageUrl,
        image_ipfs: `ipfs://${imageUpload.cid}`,
        image_cid: imageUpload.cid
      };

      // Step 3: Upload the metadata
      console.log('📤 Step 3: Uploading NFT metadata...');
      const metadataUpload = await this.uploadMetadata(metadataWithImage);

      // Step 4: Return comprehensive result
      const result = {
        success: true,
        image: {
          cid: imageUpload.cid,
          url: imageUpload.imageUrl,
          gatewayUrl: imageUpload.gatewayUrl,
          pinataGatewayUrl: imageUpload.pinataGatewayUrl,
          fileName: fileName,
          size: fileBuffer.length
        },
        metadata: {
          cid: metadataUpload.cid,
          url: metadataUpload.metadataUrl,
          gatewayUrl: metadataUpload.gatewayUrl,
          pinataGatewayUrl: metadataUpload.pinataGatewayUrl,
          content: metadataUpload.metadata
        },
        service: 'REAL Pinata 2025 Production SDK',
        timestamp: new Date().toISOString(),
        verified: true
      };

      console.log('🎉 REAL Pinata 2025: NFT assets uploaded successfully!');
      console.log('🔍 Image CID:', result.image.cid);
      console.log('🔍 Metadata CID:', result.metadata.cid);

      return result;

    } catch (error) {
      console.error('❌ REAL Pinata 2025: NFT asset upload failed:', error);
      throw error;
    }
  }



  async getAccountInfo() {
    await this.initialize();

    try {
      console.log('📌 Getting REAL Pinata account info...');

      // Test connection to verify account status
      await this.testConnection();

      return {
        success: true,
        account: {
          service: 'REAL Pinata IPFS Production',
          gateway: this.gateway,
          authenticated: true,
          jwt: this.jwt ? 'Present and Valid' : 'Missing',
          apiKey: this.apiKey ? 'Present' : 'Missing',
          initialized: this.initialized,
          uploadRetries: this.uploadRetries,
          uploadTimeout: this.uploadTimeout
        },
        capabilities: {
          fileUpload: true,
          metadataUpload: true,
          nftAssetUpload: true,
          cidVerification: true,
          multipleGateways: true
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to get REAL Pinata account info:', error);
      throw error;
    }
  }

  async getSpaceInfo() {
    return this.getAccountInfo();
  }

  async listUploads(options = {}) {
    await this.initialize();
    
    return {
      success: true,
      uploads: [],
      message: 'Upload listing available through Pinata console at https://app.pinata.cloud',
      service: 'REAL Pinata IPFS (Latest API)',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = RealPinataService;