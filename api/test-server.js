require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');

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

// Add authentication routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NFTGen API Server', 
    version: '1.0.0',
    endpoints: [
      '/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/profile/:sessionId',
      '/api/auth/credentials/:sessionId',
      '/api/auth/logout'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 7102;

console.log('🔧 Starting minimal NFTGen API server...');

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal server ready at http://0.0.0.0:${PORT}`);
  console.log(`🚀 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🚀 Auth endpoints: http://0.0.0.0:${PORT}/api/auth/*`);
});

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free up the port and restart the server.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

console.log('✅ Server startup completed');
