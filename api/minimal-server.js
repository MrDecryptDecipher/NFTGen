require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:7103',
      'http://3.111.22.56:7103',
      'http://localhost:7102',
      'http://3.111.22.56:7102',
      'http://localhost:6101',
      'http://3.111.22.56:6101',
      'http://localhost:6103',
      'http://3.111.22.56:6103',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic info endpoint
app.get('/', (req, res) => {
  console.log('Root endpoint requested');
  res.json({ 
    message: 'NFTGen API Server - Minimal Version', 
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/health',
      '/api/web3storage/upload',
      '/api/web3storage/credentials'
    ]
  });
});

// Mock Web3.Storage endpoints for testing
app.get('/api/web3storage/credentials', (req, res) => {
  console.log('Web3Storage credentials requested');
  res.json({
    success: true,
    token: process.env.WEB3_STORAGE_TOKEN || 'mock-token'
  });
});

app.post('/api/web3storage/upload', (req, res) => {
  console.log('Web3Storage upload requested');
  res.json({
    success: true,
    imageUrl: 'https://ipfs.io/ipfs/mock-image-hash',
    metadataUrl: 'https://ipfs.io/ipfs/mock-metadata-hash',
    imageCID: 'mock-image-hash',
    metadataCID: 'mock-metadata-hash'
  });
});

// Start server
const PORT = process.env.PORT || 7105;

console.log('🔧 Starting minimal NFTGen API server...');

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal server ready at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🚀 Web3Storage endpoints: http://0.0.0.0:${PORT}/api/web3storage/*`);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free up the port and restart the server.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

console.log('✅ Minimal server startup completed');
