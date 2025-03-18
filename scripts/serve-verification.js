/**
 * Simple HTTP server to serve the verification files
 * Run with: node scripts/serve-verification.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3456;

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle favicon.ico requests
  if (req.url === '/favicon.ico') {
    res.writeHead(204); // No content
    res.end();
    return;
  }
  
  // Normalize URL path to serve the verification HTML by default
  let filePath = path.join(__dirname, req.url === '/' ? 'verify-integration.html' : req.url);
  
  // Make sure we're only serving files from the scripts directory for security
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden: Cannot access files outside the scripts directory');
    return;
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`File not found: ${filePath}`);
      res.writeHead(404);
      res.end(`File not found: ${req.url}`);
      return;
    }
    
    // Get file extension and content type
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
        res.writeHead(500);
        res.end(`Server Error: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n---------------------------------------`);
  console.log(`Verification server running at http://localhost:${PORT}`);
  console.log(`Open the URL above in your browser to verify NFTGen <-> Nija Wallet integration`);
  console.log(`Make sure both NFTGen and Nija Wallet are running in the same browser`);
  console.log(`---------------------------------------\n`);
}); 