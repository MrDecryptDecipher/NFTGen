require('dotenv').config({ path: __dirname + '/../.env' });

class RealPinataIPFSService {
  constructor() {
    this.pinata = null;
    this.initialized = false;
    this.jwt = process.env.PINATA_JWT;
    this.gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    this.apiUrl = 'https://api.pinata.cloud';
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📌 Initializing REAL Pinata IPFS service...');
      
      if (!this.jwt) {
        throw new Error('PINATA_JWT not found in environment variables');
      }
      
      // Test the connection with a simple API call
      await this.testConnection();
      
      this.initialized = true;
      console.log('✅ REAL Pinata IPFS service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize REAL Pinata IPFS service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🔍 Testing REAL Pinata connection...');
      
      const response = await fetch(`${this.apiUrl}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Authentication test failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ REAL Pinata connection test successful:', data.message);
      
      return data;
    } catch (error) {
      console.warn('⚠️ REAL Pinata connection test failed:', error.message);
      throw error;
    }
  }

  async uploadFile(fileBuffer, fileName, metadata = {}) {
    await this.initialize();
    
    try {
      console.log(`📌 Uploading file to REAL Pinata: ${fileName} (${fileBuffer.length} bytes)`);
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Create a File object from buffer
      const file = new File([fileBuffer], fileName, {
        type: metadata.contentType || 'application/octet-stream'
      });
      
      formData.append('file', file);
      
      // Add metadata
      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          platform: 'NFTGen',
          uploadedAt: new Date().toISOString(),
          ...metadata.keyvalues
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
      
      // Upload to REAL Pinata
      const response = await fetch(`${this.apiUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ File uploaded to REAL Pinata: ${result.IpfsHash}`);
      
      // Generate URLs
      const imageUrl = `https://${this.gateway}/ipfs/${result.IpfsHash}`;
      const gatewayUrl = `https://ipfs.io/ipfs/${result.IpfsHash}`;
      
      return {
        success: true,
        cid: result.IpfsHash,
        imageUrl,
        gatewayUrl,
        fileName,
        size: fileBuffer.length,
        service: 'REAL Pinata IPFS',
        pinataId: result.PinSize,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ REAL Pinata file upload failed:', error);
      throw error;
    }
  }

  async uploadMetadata(metadata) {
    await this.initialize();
    
    try {
      console.log('📌 Uploading NFT metadata to REAL Pinata...');
      
      // Prepare metadata with additional info
      const enrichedMetadata = {
        ...metadata,
        uploaded_via: 'NFTGen Platform',
        ipfs_service: 'REAL Pinata',
        timestamp: new Date().toISOString()
      };
      
      // Upload JSON metadata
      const response = await fetch(`${this.apiUrl}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pinataContent: enrichedMetadata,
          pinataMetadata: {
            name: `${metadata.name || 'NFT'}_metadata.json`,
            keyvalues: {
              type: 'nft_metadata',
              platform: 'NFTGen',
              nft_name: metadata.name || 'Unknown'
            }
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Metadata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Metadata uploaded to REAL Pinata: ${result.IpfsHash}`);
      
      // Generate URLs
      const metadataUrl = `https://${this.gateway}/ipfs/${result.IpfsHash}`;
      const gatewayUrl = `https://ipfs.io/ipfs/${result.IpfsHash}`;
      
      return {
        success: true,
        cid: result.IpfsHash,
        metadataUrl,
        gatewayUrl,
        metadata: enrichedMetadata,
        service: 'REAL Pinata IPFS',
        pinataId: result.PinSize,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ REAL Pinata metadata upload failed:', error);
      throw error;
    }
  }

  async listFiles(options = {}) {
    await this.initialize();
    
    try {
      console.log('📌 Listing files from REAL Pinata...');
      
      const queryParams = new URLSearchParams({
        pageLimit: options.limit || 10,
        pageOffset: options.offset || 0
      });
      
      const response = await fetch(`${this.apiUrl}/data/pinList?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`List files failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        files: data.rows || [],
        count: data.count || 0,
        service: 'REAL Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to list REAL Pinata files:', error);
      throw error;
    }
  }

  async deleteFile(cid) {
    await this.initialize();
    
    try {
      console.log(`📌 Deleting file from REAL Pinata: ${cid}`);
      
      const response = await fetch(`${this.apiUrl}/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }
      
      console.log(`✅ File deleted from REAL Pinata: ${cid}`);
      
      return {
        success: true,
        cid,
        service: 'REAL Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to delete file from REAL Pinata:', error);
      throw error;
    }
  }

  async getFileInfo(cid) {
    await this.initialize();
    
    try {
      console.log(`📌 Getting file info from REAL Pinata: ${cid}`);
      
      const response = await fetch(`${this.apiUrl}/data/pinList?hashContains=${cid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Get file info failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const file = data.rows?.find(f => f.ipfs_pin_hash === cid);
      
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
        service: 'REAL Pinata IPFS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get file info from REAL Pinata:', error);
      throw error;
    }
  }

  async getAccountInfo() {
    await this.initialize();
    
    try {
      console.log('📌 Getting REAL Pinata account info...');
      
      const response = await fetch(`${this.apiUrl}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Get account info failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        account: {
          service: 'REAL Pinata IPFS',
          gateway: this.gateway,
          authenticated: true,
          message: data.message
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get REAL Pinata account info:', error);
      throw error;
    }
  }
}

module.exports = RealPinataIPFSService;