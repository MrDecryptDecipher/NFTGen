require('dotenv').config({ path: __dirname + '/../.env' });

class RealWeb3StorageService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.spaceDID = process.env.WEB3_STORAGE_DID;
    this.spaceName = process.env.WEB3_STORAGE_SPACE_NAME || 'NijaNFTGen';
    this.email = process.env.WEB3_STORAGE_EMAIL || 'achyutab@gmail.com';
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🌐 Initializing Real Web3Storage client...');
      
      // Dynamic import for ES module
      const { create } = await import('@web3-storage/w3up-client');
      
      // Create the client
      this.client = await create();
      console.log('✅ Web3Storage client created');
      
      // Check if we have an existing space
      const spaces = await this.client.spaces();
      console.log(`📦 Found ${spaces.length} existing spaces`);
      
      let targetSpace = null;
      
      // Look for existing space by name or DID
      for (const space of spaces) {
        const spaceInfo = await this.client.space.info(space.did());
        console.log(`📦 Space: ${space.did()} - ${spaceInfo.name || 'unnamed'}`);
        
        if (space.did() === this.spaceDID || spaceInfo.name === this.spaceName) {
          targetSpace = space;
          console.log(`✅ Found target space: ${space.did()}`);
          break;
        }
      }
      
      // If no existing space found, create a new one
      if (!targetSpace) {
        console.log('🔧 Creating new Web3Storage space...');
        targetSpace = await this.client.createSpace(this.spaceName);
        console.log(`✅ Created new space: ${targetSpace.did()}`);
        
        // Set as current space
        await this.client.setCurrentSpace(targetSpace.did());
        console.log('✅ Set as current space');
        
        // Register the space
        try {
          console.log(`📧 Registering space with email: ${this.email}`);
          await this.client.registerSpace(this.email);
          console.log('✅ Space registered successfully');
        } catch (regError) {
          console.warn('⚠️ Space registration failed (may already be registered):', regError.message);
        }
      } else {
        // Use existing space
        await this.client.setCurrentSpace(targetSpace.did());
        console.log('✅ Using existing space');
      }
      
      this.initialized = true;
      console.log('🎉 Real Web3Storage service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Web3Storage:', error);
      throw error;
    }
  }  async uploadFile(fileBuffer, fileName, metadata = {}) {
    await this.initialize();
    
    try {
      console.log(`📤 Uploading file: ${fileName} (${fileBuffer.length} bytes)`);
      
      // Create a File object from buffer
      const file = new File([fileBuffer], fileName, {
        type: metadata.contentType || 'application/octet-stream'
      });
      
      // Upload the file
      const cid = await this.client.uploadFile(file);
      console.log(`✅ File uploaded successfully: ${cid}`);
      
      // Generate URLs
      const imageUrl = `https://w3s.link/ipfs/${cid}`;
      const gatewayUrl = `https://${cid}.ipfs.w3s.link`;
      
      return {
        success: true,
        cid: cid.toString(),
        imageUrl,
        gatewayUrl,
        fileName,
        size: fileBuffer.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  async uploadMetadata(metadata) {
    await this.initialize();
    
    try {
      console.log('📤 Uploading NFT metadata...');
      
      // Convert metadata to JSON
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBuffer = Buffer.from(metadataJson, 'utf8');
      
      // Create a File object
      const file = new File([metadataBuffer], 'metadata.json', {
        type: 'application/json'
      });
      
      // Upload the metadata
      const cid = await this.client.uploadFile(file);
      console.log(`✅ Metadata uploaded successfully: ${cid}`);
      
      // Generate URLs
      const metadataUrl = `https://w3s.link/ipfs/${cid}`;
      const gatewayUrl = `https://${cid}.ipfs.w3s.link`;
      
      return {
        success: true,
        cid: cid.toString(),
        metadataUrl,
        gatewayUrl,
        metadata,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Metadata upload failed:', error);
      throw error;
    }
  }  async uploadDirectory(files) {
    await this.initialize();
    
    try {
      console.log(`📤 Uploading directory with ${files.length} files...`);
      
      // Convert files to File objects
      const fileObjects = files.map(file => {
        return new File([file.content], file.name, {
          type: file.contentType || 'application/octet-stream'
        });
      });
      
      // Upload the directory
      const cid = await this.client.uploadDirectory(fileObjects);
      console.log(`✅ Directory uploaded successfully: ${cid}`);
      
      // Generate URLs
      const directoryUrl = `https://w3s.link/ipfs/${cid}`;
      const gatewayUrl = `https://${cid}.ipfs.w3s.link`;
      
      return {
        success: true,
        cid: cid.toString(),
        directoryUrl,
        gatewayUrl,
        fileCount: files.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Directory upload failed:', error);
      throw error;
    }
  }

  async getSpaceInfo() {
    await this.initialize();
    
    try {
      const currentSpace = this.client.currentSpace();
      if (!currentSpace) {
        throw new Error('No current space set');
      }
      
      const spaceInfo = await this.client.space.info(currentSpace.did());
      
      return {
        success: true,
        space: {
          did: currentSpace.did(),
          name: spaceInfo.name || this.spaceName,
          email: this.email
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get space info:', error);
      throw error;
    }
  }
}

module.exports = RealWeb3StorageService;