require('dotenv').config({ path: __dirname + '/../.env' });
const { PinataSDK } = require('pinata');

class PinataIPFSService {
  constructor() {
    this.pinata = null;
    this.initialized = false;
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretKey = process.env.PINATA_SECRET_KEY;
    this.jwt = process.env.PINATA_JWT;
    this.gateway = process.env.PINATA_GATEWAY || 'rose-accepted-puma-897.mypinata.cloud';
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📌 Initializing Pinata IPFS service...');
      
      if (!this.jwt && !this.apiKey) {
        throw new Error('PINATA_JWT or PINATA_API_KEY not found in environment variables');
      }
      
      // Initialize Pinata SDK
      if (this.jwt) {
        console.log('🔑 Using Pinata JWT authentication');
        this.pinata = new PinataSDK({
          pinataJwt: this.jwt,
          pinataGateway: this.gateway,
        });
      } else {
        console.log('🔑 Using Pinata API Key authentication');
        this.pinata = new PinataSDK({
          pinataApiKey: this.apiKey,
          pinataSecretApiKey: this.secretKey,
          pinataGateway: this.gateway,
        });
      }
      
      // Test the connection
      await this.testConnection();
      
      this.initialized = true;
      console.log('✅ Pinata IPFS service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Pinata IPFS service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test with a simple operation
      console.log('🔍 Testing Pinata connection...');
      
      // Create a small test file
      const testFile = new File(['Hello Pinata!'], 'test.txt', { type: 'text/plain' });
      
      // Try to upload it
      const result = await this.pinata.upload.public.file(testFile);
      console.log('✅ Pinata connection test successful:', result.cid);
      
      return result;
    } catch (error) {
      console.warn('⚠️ Pinata connection test failed:', error.message);
      // Don't throw here, just warn - service might still work for other operations
    }
  }

  async uploadFile(fileBuffer, fileName, metadata = {}) {
    await this.initialize();
    
    try {
      console.log(`📌 Uploading file to Pinata: ${fileName} (${fileBuffer.length} bytes)`);
      
      // Create a File object from buffer
      const file = new File([fileBuffer], fileName, {
        type: metadata.contentType || 'application/octet-stream'
      });
      
      // Prepare upload options
      const options = {
        metadata: {
          name: fileName,
          keyvalues: {
            platform: 'NFTGen',
            uploadedAt: new Date().toISOString(),
            ...metadata.keyvalues
          }
        }
      };
      
      // Upload to Pinata using the correct API
      const result = await this.pinata.upload.public.file(file)
        .name(fileName)
        .keyvalues({
          platform: 'NFTGen',
          uploadedAt: new Date().toISOString(),
          ...metadata.keyvalues
        });
      console.log(`✅ File uploaded to Pinata: ${result.IpfsHash}`);
      
      // Generate URLs
      const imageUrl = `https://${this.gateway}/ipfs/${result.cid}`;
      const gatewayUrl = `https://ipfs.io/ipfs/${result.cid}`;
      
      return {
        success: true,
        cid: result.cid,
        imageUrl,
        gatewayUrl,
        fileName,
        size: fileBuffer.length,
        service: 'Pinata IPFS',
        pinataId: result.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Pinata file upload failed:', error);
      throw error;
    }
  }

  async uploadMetadata(metadata) {
    await this.initialize();
    
    try {
      console.log('📌 Uploading NFT metadata to Pinata...');
      
      // Prepare metadata with additional info
      const enrichedMetadata = {
        ...metadata,
        uploaded_via: 'NFTGen Platform',
        ipfs_service: 'Pinata',
        timestamp: new Date().toISOString()
      };
      
      // Upload JSON metadata using the correct API
      const result = await this.pinata.upload.public.json(enrichedMetadata)
        .name(`${metadata.name || 'NFT'}_metadata.json`)
        .keyvalues({
          type: 'nft_metadata',
          platform: 'NFTGen',
          nft_name: metadata.name || 'Unknown'
        });
      
      console.log(`✅ Metadata uploaded to Pinata: ${result.IpfsHash}`);
      
      // Generate URLs
      const metadataUrl = `https://${this.gateway}/ipfs/${result.cid}`;
      const gatewayUrl = `https://ipfs.io/ipfs/${result.cid}`;
      
      return {
        success: true,
        cid: result.cid,
        metadataUrl,
        gatewayUrl,
        metadata: enrichedMetadata,
        service: 'Pinata IPFS',
        pinataId: result.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Pinata metadata upload failed:', error);
      throw error;
    }
  }

  async uploadDirectory(files) {
    await this.initialize();
    
    try {
      console.log(`📌 Uploading directory to Pinata with ${files.length} files...`);
      
      // Convert files to File objects
      const fileObjects = files.map(file => {
        return new File([file.content], file.name, {
          type: file.contentType || 'application/octet-stream'
        });
      });
      
      // Upload directory using the correct API
      const result = await this.pinata.upload.public.fileArray(fileObjects)
        .name(`NFTGen_Directory_${Date.now()}`)
        .keyvalues({
          type: 'directory',
          platform: 'NFTGen',
          file_count: files.length.toString()
        });
      
      console.log(`✅ Directory uploaded to Pinata: ${result.IpfsHash}`);
      
      // Generate URLs
      const directoryUrl = `https://${this.gateway}/ipfs/${result.cid}`;
      const gatewayUrl = `https://ipfs.io/ipfs/${result.cid}`;
      
      return {
        success: true,
        cid: result.cid,
        directoryUrl,
        gatewayUrl,
        fileCount: files.length,
        service: 'Pinata IPFS',
        pinataId: result.id,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Pinata directory upload failed:', error);
      throw error;
    }
  }

  async listFiles(options = {}) {
    await this.initialize();
    
    try {
      console.log('📌 Listing files from Pinata...');
      
      const files = await this.pinata.listFiles({
        pageLimit: options.limit || 10,
        pageOffset: options.offset || 0,
        metadata: options.metadata || {}
      });
      
      return {
        success: true,
        files: files.rows || [],
        count: files.count || 0,
        service: 'Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to list Pinata files:', error);
      throw error;
    }
  }

  async deleteFile(cid) {
    await this.initialize();
    
    try {
      console.log(`📌 Deleting file from Pinata: ${cid}`);
      
      await this.pinata.unpin(cid);
      console.log(`✅ File deleted from Pinata: ${cid}`);
      
      return {
        success: true,
        cid,
        service: 'Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to delete file from Pinata:', error);
      throw error;
    }
  }

  async getFileInfo(cid) {
    await this.initialize();
    
    try {
      console.log(`📌 Getting file info from Pinata: ${cid}`);
      
      // Note: Pinata doesn't have a direct "get file info" endpoint
      // This would typically be done through the list files with a filter
      const files = await this.pinata.listFiles({
        hashContains: cid
      });
      
      const file = files.rows?.find(f => f.ipfs_pin_hash === cid);
      
      if (!file) {
        throw new Error(`File not found: ${cid}`);
      }
      
      return {
        success: true,
        file: {
          cid: file.ipfs_pin_hash,
          name: file.metadata?.name || 'Unknown',
          size: file.size,
          pinDate: file.date_pinned,
          metadata: file.metadata
        },
        service: 'Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get file info from Pinata:', error);
      throw error;
    }
  }

  async getAccountInfo() {
    await this.initialize();
    
    try {
      console.log('📌 Getting Pinata account info...');
      
      // Note: This would require the account endpoint if available
      // For now, return basic info
      return {
        success: true,
        account: {
          service: 'Pinata IPFS',
          gateway: this.gateway,
          authenticated: true
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get Pinata account info:', error);
      throw error;
    }
  }
}

module.exports = PinataIPFSService;