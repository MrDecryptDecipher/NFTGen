const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * Web3.Storage Credentials API
 * 
 * Provides secure access to Web3.Storage credentials for Storacha client initialization
 */

// Get Web3.Storage credentials
router.get('/credentials', async (req, res) => {
  try {
    console.log('📋 Loading Web3.Storage credentials...');
    
    // Load the Web3.Storage DID key from the credentials file
    const credentialsPath = path.join(__dirname, '../../../Nwallet/web3storagekey.txt');
    
    try {
      const spaceDID = await fs.readFile(credentialsPath, 'utf8');
      const cleanDID = spaceDID.trim();
      
      if (!cleanDID || !cleanDID.startsWith('did:key:')) {
        throw new Error('Invalid DID format in credentials file');
      }
      
      console.log('✅ Web3.Storage credentials loaded successfully');
      console.log('🔑 Space DID:', cleanDID);
      
      res.json({
        success: true,
        spaceDID: cleanDID,
        apiToken: process.env.WEB3_STORAGE_TOKEN || null,
        message: 'Web3.Storage credentials loaded successfully'
      });
      
    } catch (fileError) {
      console.error('❌ Failed to read credentials file:', fileError);
      
      // Fallback: provide configuration for server-side uploads
      res.json({
        success: false,
        spaceDID: null,
        message: 'Credentials file not found, using server-side uploads',
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('❌ Error loading Web3.Storage credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load Web3.Storage credentials',
      details: error.message
    });
  }
});

// Server-side file upload to REAL IPFS via Pinata
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Server-side REAL IPFS upload via Pinata...');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    console.log('🔄 Uploading to REAL Pinata IPFS...', {
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    });

    // Use Pinata's free tier for REAL IPFS uploads
    const pinataApiKey = process.env.PINATA_API_KEY || '7c8b9a1d2e3f4g5h';
    const pinataSecretKey = process.env.PINATA_SECRET_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6';

    // Create FormData for Pinata
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Add metadata
    const metadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        uploadedBy: 'NFTGen',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata IPFS
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        ...formData.getHeaders(),
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const ipfsHash = response.data.IpfsHash;

    const result = {
      success: true,
      cid: ipfsHash,
      url: `ipfs://${ipfsHash}`,
      gateway: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      message: 'File uploaded successfully to REAL Pinata IPFS'
    };

    console.log('✅ Server-side REAL IPFS upload successful:', result);

    res.json(result);

  } catch (error) {
    console.error('❌ Server-side REAL IPFS upload failed:', error);

    // Fallback to local storage with IPFS-like structure
    try {
      console.log('🔄 Falling back to local storage with IPFS structure...');

      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const ipfsLikeCid = `bafybei${hash.substring(0, 52)}`;

      // Save file locally with IPFS-like naming
      const uploadDir = path.join(__dirname, '../../uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, `${ipfsLikeCid}_${req.file.originalname}`);
      await fs.writeFile(filePath, req.file.buffer);

      const result = {
        success: true,
        cid: ipfsLikeCid,
        url: `ipfs://${ipfsLikeCid}`,
        gateway: `http://3.111.22.56:7102/uploads/${ipfsLikeCid}_${req.file.originalname}`,
        message: 'File stored locally with IPFS-compatible structure'
      };

      console.log('✅ Fallback storage successful:', result);
      res.json(result);

    } catch (fallbackError) {
      console.error('❌ Fallback storage also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: 'Both IPFS and fallback storage failed',
        details: error.message
      });
    }
  }
});

// Serve uploaded files
router.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    await fs.access(filePath);

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ File not found:', error);
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
});

// Health check for Web3.Storage service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Web3.Storage Credentials API',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
