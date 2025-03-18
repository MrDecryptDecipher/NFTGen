#!/usr/bin/env node

/**
 * NFTGen Simple Network Connectivity Checker
 * This script uses ES Modules format to check network connectivity for the NFTGen app
 */

import http from 'http';
import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Header
console.log(`${colors.bold}${colors.cyan}NFTGen Network Check (Simple Version)${colors.reset}`);
console.log(`${colors.cyan}==========================================${colors.reset}\n`);

// Get IP addresses
function getIpAddresses() {
  console.log(`${colors.bold}Network Interfaces:${colors.reset}`);
  const interfaces = os.networkInterfaces();
  const ipAddresses = [];

  for (const [name, netInterface] of Object.entries(interfaces)) {
    for (const info of netInterface) {
      if (!info.internal && info.family === 'IPv4') {
        console.log(`  ${colors.green}${name}:${colors.reset} ${info.address}`);
        ipAddresses.push(info.address);
      }
    }
  }

  if (ipAddresses.length === 0) {
    console.log(`  ${colors.yellow}No external IP addresses found${colors.reset}`);
  }

  return ipAddresses;
}

// Check port
async function checkPort(port) {
  console.log(`\n${colors.bold}Checking Port ${port}:${colors.reset}`);
  
  try {
    const { stdout } = await execAsync(`netstat -tuln | grep :${port}`);
    if (stdout) {
      console.log(`  ${colors.green}Port ${port} is in use:${colors.reset}`);
      console.log(`  ${stdout.trim()}`);
      return true;
    } else {
      console.log(`  ${colors.red}Port ${port} is not in use${colors.reset}`);
      console.log(`  ${colors.yellow}The NFTGen server is probably not running${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`  ${colors.red}Port ${port} is not in use${colors.reset}`);
    console.log(`  ${colors.yellow}The NFTGen server is probably not running${colors.reset}`);
    return false;
  }
}

// Test connection
function testConnection(url) {
  return new Promise((resolve) => {
    console.log(`  Testing connection to ${url}`);
    
    const req = http.get(url, (res) => {
      console.log(`  ${colors.green}✓ Connected to ${url}${colors.reset}`);
      console.log(`  ${colors.green}Status: ${res.statusCode}${colors.reset}`);
      
      res.on('data', () => {});
      res.on('end', () => {
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ${colors.red}✗ Failed to connect to ${url}${colors.reset}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
      resolve(false);
    });
    
    // Set a timeout to avoid hanging
    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`  ${colors.red}✗ Connection to ${url} timed out${colors.reset}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Check firewall
async function checkFirewall() {
  console.log(`\n${colors.bold}Checking Firewall:${colors.reset}`);
  
  try {
    const { stdout } = await execAsync('sudo ufw status');
    console.log(`  Firewall status:`);
    console.log(`  ${stdout.trim()}`);
    
    if (stdout.includes('Status: active')) {
      if (stdout.includes('5175/tcp')) {
        console.log(`  ${colors.green}✓ Port 5175 is allowed through firewall${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Port 5175 may be blocked by firewall${colors.reset}`);
        console.log(`  ${colors.yellow}Run: sudo ufw allow 5175/tcp${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.green}✓ Firewall is inactive${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.yellow}Cannot check firewall status (no sudo access)${colors.reset}`);
    console.log(`  ${colors.yellow}To check manually, run: sudo ufw status${colors.reset}`);
  }
}

// Main function
async function main() {
  const ipAddresses = getIpAddresses();
  const portInUse = await checkPort(5175);
  
  let localhostOk = false;
  let ipResults = []; // Initialize here so it's properly defined

  if (portInUse) {
    console.log(`\n${colors.bold}Testing Connections:${colors.reset}`);
    
    // Test localhost
    localhostOk = await testConnection('http://localhost:5175');
    
    // Test with real IPs
    for (const ip of ipAddresses) {
      const result = await testConnection(`http://${ip}:5175`);
      ipResults.push({ ip, result });
    }
    
    // Summary
    console.log(`\n${colors.bold}${colors.cyan}Connection Summary:${colors.reset}`);
    console.log(`  Localhost (http://localhost:5175): ${localhostOk ? colors.green + 'OK' + colors.reset : colors.red + 'FAILED' + colors.reset}`);
    
    for (const { ip, result } of ipResults) {
      console.log(`  IP (http://${ip}:5175): ${result ? colors.green + 'OK' + colors.reset : colors.red + 'FAILED' + colors.reset}`);
    }
  }
  
  await checkFirewall();
  
  // Check surge.sh domains
  console.log(`\n${colors.bold}${colors.cyan}Testing Surge.sh Domains:${colors.reset}`);
  console.log(`  ${colors.yellow}Note: These tests check if the domains are reachable, not if they're running your app${colors.reset}`);
  
  // Test NFTGen on surge
  try {
    console.log(`  Testing connection to https://nftgenrtr.surge.sh`);
    const response = await fetch('https://nftgenrtr.surge.sh', { 
      // Use no-cors to avoid CORS issues in node environment
      // This will return an opaque response
      method: 'HEAD'
    });
    console.log(`  ${colors.green}✓ NFTGen surge domain is reachable${colors.reset}`);
  } catch (error) {
    console.log(`  ${colors.red}✗ Failed to connect to NFTGen on surge.sh${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
  
  // Test Nwallet on surge
  try {
    console.log(`  Testing connection to https://nwallet.surge.sh`);
    const response = await fetch('https://nwallet.surge.sh', { 
      method: 'HEAD'
    });
    console.log(`  ${colors.green}✓ Nwallet surge domain is reachable${colors.reset}`);
  } catch (error) {
    console.log(`  ${colors.red}✗ Failed to connect to Nwallet on surge.sh${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
  
  // Test SCGen on surge
  try {
    console.log(`  Testing connection to https://scgen.surge.sh`);
    const response = await fetch('https://scgen.surge.sh', {
      method: 'HEAD'
    });
    console.log(`  ${colors.green}✓ SCGen surge domain is reachable${colors.reset}`);
  } catch (error) {
    console.log(`  ${colors.red}✗ Failed to connect to SCGen on surge.sh${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
  
  // Recommendations
  console.log(`\n${colors.bold}${colors.cyan}Recommendations:${colors.reset}`);
  
  if (!portInUse) {
    console.log(`  ${colors.yellow}1. Start the NFTGen server:${colors.reset}`);
    console.log(`     npm run dev:network`);
    console.log(`     # or with explicit host/port:`);
    console.log(`     npm run dev -- --host 0.0.0.0 --port 5175`);
  } else if (!ipAddresses.length) {
    console.log(`  ${colors.yellow}1. Your machine appears to have no network interfaces${colors.reset}`);
    console.log(`     Check your network connection and try again`);
  } else {
    const anyIpWorking = ipResults.some(r => r.result);
    
    if (!localhostOk) {
      console.log(`  ${colors.yellow}1. Localhost connection failed${colors.reset}`);
      console.log(`     Check if the server is running and listening on localhost`);
    }
    
    if (!anyIpWorking) {
      console.log(`  ${colors.yellow}2. Network connections failed${colors.reset}`);
      console.log(`     Make sure your Vite config has host set to '0.0.0.0'`);
      console.log(`     Check firewall settings`);
      console.log(`     Try restarting the server with: npm run network:restart`);
    }
  }
  
  console.log(`\n${colors.bold}${colors.cyan}URLs to try:${colors.reset}`);
  console.log(`  ${colors.green}Local Development:${colors.reset}`);
  console.log(`    ${colors.green}http://localhost:5175${colors.reset}`);
  
  for (const ip of ipAddresses) {
    console.log(`    ${colors.green}http://${ip}:5175${colors.reset}`);
  }
  
  console.log(`  ${colors.green}Production (Surge):${colors.reset}`);
  console.log(`    ${colors.green}https://nftgenrtr.surge.sh${colors.reset}`);
  console.log(`    ${colors.green}https://nwallet.surge.sh${colors.reset}`);
  console.log(`    ${colors.green}https://scgen.surge.sh${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
  process.exit(1);
}); 