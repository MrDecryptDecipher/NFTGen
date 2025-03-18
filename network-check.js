#!/usr/bin/env node

/**
 * NFTGen Network Connectivity Diagnostic Tool
 * 
 * This script helps diagnose network connectivity issues with the NFTGen application.
 * It checks for common issues and provides suggestions for fixing them.
 */

import http from 'http';
import { exec } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.bright}${colors.cyan}NFTGen Network Connectivity Diagnostic Tool${colors.reset}\n`);

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
console.log(`${colors.bright}Network Interfaces:${colors.reset}`);
let ipAddresses = [];

Object.keys(networkInterfaces).forEach((interfaceName) => {
  const interfaces = networkInterfaces[interfaceName];
  interfaces.forEach((iface) => {
    // Skip internal and non-IPv4 interfaces
    if (!iface.internal && iface.family === 'IPv4') {
      console.log(`  ${colors.green}${interfaceName}:${colors.reset} ${iface.address}`);
      ipAddresses.push(iface.address);
    }
  });
});

console.log('\n');

// Check if Vite config has proper host settings
const checkViteConfig = () => {
  try {
    const viteConfigPath = path.join(__dirname, 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
      console.log(`${colors.bright}Checking Vite Configuration:${colors.reset}`);
      
      if (viteConfig.includes("host: '0.0.0.0'")) {
        console.log(`  ${colors.green}✓ Host is set to '0.0.0.0' (allows all network connections)${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Host is not set to '0.0.0.0'${colors.reset}`);
        console.log(`  ${colors.yellow}Recommendation: Update vite.config.ts to include:${colors.reset}`);
        console.log(`  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true
  }`);
      }
      
      if (viteConfig.includes("port: 5175")) {
        console.log(`  ${colors.green}✓ Port is set to 5175${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Port is not explicitly set to 5175${colors.reset}`);
        console.log(`  ${colors.yellow}Recommendation: Set port explicitly in vite.config.ts${colors.reset}`);
      }
    } else {
      console.log(`  ${colors.red}✗ vite.config.ts not found${colors.reset}`);
    }
  } catch (error) {
    console.error(`  ${colors.red}Error checking Vite config:${colors.reset}`, error.message);
  }
  console.log('\n');
};

// Check if port 5175 is in use
const checkPortUsage = () => {
  console.log(`${colors.bright}Checking Port Usage:${colors.reset}`);
  
  exec('netstat -tuln | grep 5175', (error, stdout, stderr) => {
    if (stdout) {
      console.log(`  ${colors.green}✓ Port 5175 is in use:${colors.reset}`);
      console.log(`  ${stdout.trim()}`);
    } else {
      console.log(`  ${colors.red}✗ Port 5175 is not in use${colors.reset}`);
      console.log(`  ${colors.yellow}Recommendation: Make sure the NFTGen server is running${colors.reset}`);
    }
    console.log('\n');
    checkFirewall();
  });
};

// Check firewall status
const checkFirewall = () => {
  console.log(`${colors.bright}Checking Firewall Status:${colors.reset}`);
  
  exec('sudo ufw status', (error, stdout, stderr) => {
    if (error) {
      console.log(`  ${colors.yellow}Unable to check firewall status (requires sudo)${colors.reset}`);
      console.log(`  ${colors.yellow}Recommendation: Run 'sudo ufw status' to check firewall${colors.reset}`);
      console.log(`  ${colors.yellow}If firewall is enabled, run 'sudo ufw allow 5175/tcp'${colors.reset}`);
    } else {
      console.log(`  Firewall status:`);
      console.log(`  ${stdout.trim()}`);
      
      if (stdout.includes('5175/tcp')) {
        console.log(`  ${colors.green}✓ Port 5175 is allowed through firewall${colors.reset}`);
      } else if (stdout.includes('Status: inactive')) {
        console.log(`  ${colors.green}✓ Firewall is inactive${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ Port 5175 may be blocked by firewall${colors.reset}`);
        console.log(`  ${colors.yellow}Recommendation: Run 'sudo ufw allow 5175/tcp'${colors.reset}`);
      }
    }
    console.log('\n');
    testLocalConnection();
  });
};

// Test local connection
const testLocalConnection = () => {
  console.log(`${colors.bright}Testing Local Connection:${colors.reset}`);
  
  const req = http.get('http://localhost:5175', (res) => {
    console.log(`  ${colors.green}✓ Connected to localhost:5175${colors.reset}`);
    console.log(`  Status: ${res.statusCode}`);
    res.on('data', () => {});
    res.on('end', () => {
      console.log('\n');
      testNetworkConnections();
    });
  });
  
  req.on('error', (error) => {
    console.log(`  ${colors.red}✗ Failed to connect to localhost:5175${colors.reset}`);
    console.log(`  Error: ${error.message}`);
    console.log('\n');
    testNetworkConnections();
  });
  
  req.end();
};

// Test network connections
const testNetworkConnections = () => {
  console.log(`${colors.bright}Testing Network Connections:${colors.reset}`);
  
  let completedTests = 0;
  
  ipAddresses.forEach((ip) => {
    const req = http.get(`http://${ip}:5175`, (res) => {
      console.log(`  ${colors.green}✓ Connected to ${ip}:5175${colors.reset}`);
      console.log(`  Status: ${res.statusCode}`);
      res.on('data', () => {});
      res.on('end', () => {
        completedTests++;
        if (completedTests === ipAddresses.length) {
          console.log('\n');
          provideSummary();
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`  ${colors.red}✗ Failed to connect to ${ip}:5175${colors.reset}`);
      console.log(`  Error: ${error.message}`);
      completedTests++;
      if (completedTests === ipAddresses.length) {
        console.log('\n');
        provideSummary();
      }
    });
    
    req.end();
  });
  
  if (ipAddresses.length === 0) {
    console.log(`  ${colors.yellow}No network interfaces found${colors.reset}`);
    console.log('\n');
    provideSummary();
  }
};

// Provide summary and recommendations
const provideSummary = () => {
  console.log(`${colors.bright}${colors.cyan}Summary and Recommendations:${colors.reset}`);
  console.log(`
1. If you can't access the application:
   - Make sure the server is running with: ${colors.green}npm run dev${colors.reset}
   - Try accessing with IP address instead of localhost
   - Check browser console for CORS or other errors

2. For network access issues:
   - Ensure Vite is configured with ${colors.green}host: '0.0.0.0'${colors.reset}
   - Check if port 5175 is allowed through firewall
   - Try running with explicit host: ${colors.green}npm run dev -- --host 0.0.0.0${colors.reset}

3. For browser connectivity:
   - Try different browsers
   - Clear browser cache and cookies
   - Check if any browser extensions are blocking connections

4. For debugging:
   - Use the Debug panel in the application
   - Check browser console for errors
   - Run this diagnostic tool again after making changes
  `);
};

// Run the checks
checkViteConfig();
checkPortUsage(); 