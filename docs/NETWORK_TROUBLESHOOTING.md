# NFTGen Network Connectivity Troubleshooting Guide

## Overview

This guide provides steps to diagnose and resolve network connectivity issues with the NFTGen application. If you're experiencing problems accessing the NFTGen application URLs, follow the steps below.

## Quick Reference

- **NFTGen Port**: 5175
- **Expected URLs**: 
  - `http://localhost:5175/`
  - `http://172.26.6.21:5175/` (replace with your server IP)
- **Diagnostic Tools**:
  - Debug panel in application
  - `npm run network:check` - Run network diagnostics
  - `npm run network:restart` - Restart server with correct settings
  - `npm run dev:network` - Start server with explicit network settings

## Common Issues and Solutions

### Issue 1: URLs Not Working At All

If you can't access the NFTGen application through any URL:

1. **Check if the server is running**:
   ```bash
   npm run network:check
   ```

2. **Restart the server with proper network settings**:
   ```bash
   npm run network:restart
   ```

3. **Verify in your browser console** if there are any connection errors.

### Issue 2: localhost Works But Network URL Doesn't

If you can access via `localhost:5175` but not via the network IP:

1. **Check Vite configuration**:
   - Ensure `host` is set to `0.0.0.0` in `vite.config.ts`
   - Verify `port` is set to `5175`

2. **Check firewall settings**:
   ```bash
   sudo ufw status
   ```
   
3. **Allow port through firewall if needed**:
   ```bash
   sudo ufw allow 5175/tcp
   ```

### Issue 3: Cannot Connect From Other Devices

If you can't access the application from other devices on your network:

1. **Verify server is listening on all interfaces**:
   ```bash
   netstat -tuln | grep 5175
   ```
   You should see `0.0.0.0:5175` in the output.

2. **Test connection using IP address**:
   Try accessing using your machine's IP address: `http://YOUR_IP:5175`

3. **Check for CORS issues** in the browser console.

### Issue 4: AWS Lightsail Configuration

If you're running the application on AWS Lightsail and can't access it via the public IP:

1. **Verify the application is running and listening on all interfaces**:
   ```bash
   netstat -tuln | grep 5175
   ```
   You should see `0.0.0.0:5175` in the output.

2. **Check AWS Lightsail firewall settings**:
   - Log in to the AWS Lightsail console
   - Select your instance
   - Go to the 'Networking' tab
   - Add a firewall rule for TCP port 5175
   - Save the changes and wait a few minutes for them to take effect

3. **Test the connection**:
   ```bash
   curl -I http://YOUR_PUBLIC_IP:5175
   ```
   
4. **Run the ecosystem check script**:
   ```bash
   cd /home/ubuntu/Sandeep/projects && ./ecosystem-check.sh
   ```
   This will provide a comprehensive check of all applications and their accessibility.

### Issue 5: Using the Debug Panel

The NFTGen application includes a built-in Debug panel to help troubleshoot connection issues:

1. **Open the application** (if possible) and click the "Debug" button in the bottom-right corner.
2. **Use the Network Status section** to test different connection methods.
3. **Test CORS** to check for cross-origin issues.
4. **Check Server Status** to verify expected URLs.

## Detailed Troubleshooting Steps

### Step 1: Verify Vite Configuration

Ensure your `vite.config.ts` has the following settings:

```typescript
server: {
  host: '0.0.0.0',
  port: 5175,
  strictPort: true,
  hmr: {
    clientPort: 5175
  }
}
```

### Step 2: Check Network Interfaces

Run the network diagnostics tool to check your network interfaces:

```bash
npm run network:check
```

This will show all available network interfaces and their IP addresses.

### Step 3: Test Local and Network Connections

The network diagnostics tool will test connections to:
- `http://localhost:5175`
- `http://YOUR_IP:5175`

If either test fails, follow the recommendations provided by the tool.

### Step 4: Check for Port Conflicts

If port 5175 is already in use by another application:

```bash
sudo lsof -i :5175
```

You can either:
- Kill the conflicting process: `kill -9 PID`
- Change NFTGen's port in `vite.config.ts`

### Step 5: Check Firewall Status

On Linux systems with UFW:

```bash
sudo ufw status
```

If the firewall is active, ensure port 5175 is allowed:

```bash
sudo ufw allow 5175/tcp
```

### Step 6: Testing CORS Issues

CORS issues can prevent the browser from accessing the application. Use the Debug panel's "Test CORS" button to check for CORS-related issues.

You can also try accessing the application from an incognito/private browser window to rule out browser extension interference.

### Step 7: Restart with Correct Settings

When all else fails, use the restart script to reset everything:

```bash
npm run network:restart
```

This script will:
1. Check if port 5175 is in use and kill any conflicting processes
2. Verify firewall settings
3. Start the server with the correct host and port settings

## Integration with Nwallet

If you're specifically having issues connecting NFTGen with Nwallet:

1. **Ensure Nwallet is running** on port 5174
2. **Check browser console** for cross-origin issues
3. **Verify NFTGen is configured** to connect to the correct Nwallet URL 

Both applications should be running simultaneously for proper integration:
- Nwallet on port 5174
- NFTGen on port 5175
- SCGen (if needed) on its configured port

## Need More Help?

If you continue to experience issues after following these steps:

1. Check the terminal output for any error messages
2. Examine the browser console for JavaScript errors
3. Use the Debug panel to gather more diagnostic information
4. Try running with verbose logging: `npm run dev:network -- --debug` 