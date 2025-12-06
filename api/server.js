require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const path = require('path');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const mongoose = require('mongoose');
const { typeDefs, resolvers } = require('./schema');
const axios = require('axios');

// Import routes
const nftRoutes = require('./routes/nft');
const storachaRoutes = require('./routes/storacha');
const web3storageRoutes = require('./routes/web3storage');
const realMintingRoutes = require('./routes/realMinting');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');

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
      'http://localhost:6102',
      'http://3.111.22.56:6102',
      'http://localhost:5173',
      'http://3.111.22.56:5173',
      'http://localhost:5174',
      'http://3.111.22.56:5174',
      'http://localhost:5175',
      'http://3.111.22.56:5175'
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      console.warn(`CORS rejected request from origin: ${origin}`);
      // Allow the request anyway to fix CORS issues during development
      callback(null, origin);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'X-NFTGen-Origin',
    'X-NFTGen-Session',
    'x-nftgen-origin',
    'x-nftgen-session'
  ],
  exposedHeaders: [
    'Content-Type',
    'Authorization',
    'X-NFTGen-Origin',
    'X-NFTGen-Session'
  ],
  credentials: true
}));

// Add CORS preflight handler
app.options('*', cors({
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
      'http://localhost:6102',
      'http://3.111.22.56:6102',
      'http://localhost:5173',
      'http://3.111.22.56:5173',
      'http://localhost:5174',
      'http://3.111.22.56:5174',
      'http://localhost:5175',
      'http://3.111.22.56:5175'
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      console.warn(`CORS rejected preflight from origin: ${origin}`);
      // Allow the request anyway to fix CORS issues during development
      callback(null, origin);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'X-NFTGen-Origin',
    'X-NFTGen-Session',
    'x-nftgen-origin',
    'x-nftgen-session'
  ],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test webhook endpoint (direct route for testing)
app.post('/api/webhooks/test-direct', (req, res) => {
  console.log('🧪 Direct test webhook received:', req.body);
  res.json({
    success: true,
    message: 'Direct test webhook working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoint for Nwallet API
app.post('/api/nft/mint-real', async (req, res) => {
  try {
    console.log('Proxying mint request to Nwallet server');
    const response = await axios.post('http://3.111.22.56:6102/api/nftgen/mint', req.body, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
        'Origin': req.headers.origin || 'http://3.111.22.56:7103',
        'X-NFTGen-Session': req.headers['x-nftgen-session'],
        'X-NFTGen-Origin': req.headers['x-nftgen-origin'] || 'http://3.111.22.56:7103'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying request to Nwallet server:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Nwallet server' });
    }
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/storacha', storachaRoutes);
app.use('/api/web3storage', web3storageRoutes);
app.use('/api/mint', realMintingRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB with proper error handling - USE SHARED NWALLET DATABASE
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nwallet';
console.log('🔧 Attempting MongoDB connection to:', mongoUri);

// Set mongoose connection options for better error handling
mongoose.set('strictQuery', false);

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  bufferCommands: false // Disable mongoose buffering
})
  .then(() => {
    console.log('📦 Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Continuing without MongoDB - authentication features will be limited');
    // Don't exit process, allow server to start without MongoDB
  });

// GraphQL setup
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Add any context you want to pass to resolvers
    return { req };
  },
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      path: error.path,
      // Don't expose internal errors to clients in production
      ...(process.env.NODE_ENV === 'development' && { extensions: error.extensions })
    };
  },
  // Fix for security warning: Set bounded cache for persisted queries
  cache: 'bounded',
  // Enable introspection for development and testing
  introspection: process.env.NODE_ENV !== 'production'
});

// Start server
const PORT = process.env.PORT || 7102;

async function startServer() {
  try {
    console.log('🔧 Starting Apollo Server...');
    await apolloServer.start();
    console.log('✅ Apollo Server started');

    apolloServer.applyMiddleware({ app, path: '/graphql' });
    console.log('✅ GraphQL middleware applied');

    // Try to start the server on the specified port
    try {
      const httpServer = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
        console.log(`🚀 GraphQL endpoint at http://0.0.0.0:${PORT}${apolloServer.graphqlPath}`);
        console.log(`🚀 REST API endpoints available at http://0.0.0.0:${PORT}/api/nft/*`);
      });

      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use. Please free up the port and restart the server.`);
          process.exit(1);
        } else {
          console.error('Server error:', err);
        }
      });
    } catch (err) {
      console.error('Failed to start server on port', PORT, err);

      // Exit with error
      console.error('Failed to start server. Please check if the port is available and try again.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

const NFTGEN_URL = 'http://3.111.22.56:7102';
const NFTGEN_GRAPHQL_URL = 'http://3.111.22.56:7102/graphql';