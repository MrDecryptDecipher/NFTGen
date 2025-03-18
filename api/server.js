require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const mongoose = require('mongoose');
const { typeDefs, resolvers } = require('./schema');

// Import routes
const nftRoutes = require('./routes/nft');

const app = express();

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5175', 'http://3.111.22.56:5175'],
  credentials: true
}));

// JSON body parser
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/nft', nftRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      // Add any context you want to pass to resolvers
    }),
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        path: error.path,
        // Don't expose internal errors to clients in production
        ...(process.env.NODE_ENV === 'development' && { extensions: error.extensions })
      };
    }
  });

  await server.start();
  server.applyMiddleware({ 
    app,
    cors: false // We're handling CORS with express middleware
  });

  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
    console.log(`🚀 GraphQL endpoint at http://0.0.0.0:${PORT}${server.graphqlPath}`);
    console.log(`🚀 REST API endpoints available at http://0.0.0.0:${PORT}/api/nft/*`);
  });
}

startApolloServer().catch(error => {
  console.error('Failed to start server:', error);
}); 