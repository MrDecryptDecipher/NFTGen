# NFTGen Troubleshooting Guide

This guide addresses common issues encountered when using the NFTGen application, including browser extension conflicts, connection issues, and IPFS upload problems.

## Table of Contents

- [Browser Extension Issues](#browser-extension-issues)
- [Wallet Connection Problems](#wallet-connection-problems)
- [IPFS Upload Errors](#ipfs-upload-errors)
- [Network Connection Issues](#network-connection-issues)
- [Smart Contract Interaction Failures](#smart-contract-interaction-failures)
- [Sentry Connection Issues](#sentry-connection-issues)
- [React and Development Warnings](#react-and-development-warnings)

## Browser Extension Issues

### Chrome Extension Loading Error

**Error**: `Denying load of chrome-extension://... Resources must be listed in the web_accessible_resources manifest key in order to be loaded by pages outside the extension.`

**Solution**:
1. This error occurs when a Chrome extension tries to load resources that aren't properly configured in its manifest file.
2. Try the following steps:
   - Update your MetaMask extension to the latest version
   - Temporarily disable other blockchain/crypto-related extensions
   - Clear your browser cache and cookies
   - Restart your browser
   - If using Chrome version 91+, use a compatible wallet extension version

### TypeError: Cannot redefine property 'ethereum'

**Error**: `Uncaught TypeError: Cannot redefine property: ethereum`

**Solution**:
1. This error occurs when multiple wallet extensions try to inject their own 'ethereum' object into the page.
2. To resolve:
   - Disable all wallet extensions except the one you're using (MetaMask, Coinbase Wallet, etc.)
   - If using multiple wallets, try using them in different browsers
   - Check for conflicts between the Nija Wallet application and browser extensions
   - Clear local storage by executing in browser console: `localStorage.clear()`
   - In a private/incognito window, access NFTGen without any extensions
   - If using the NFTGen application with Nija Wallet, ensure that you don't have another wallet extension active

### Removing Unpermitted Intrinsics Warning

**Error**: `lockdown-install.js:1 Removing unpermitted intrinsics`

**Solution**:
1. This warning occurs due to security restrictions in some browser extensions or SES (Secure ECMAScript) environments.
2. This is often just a warning and not an error.
3. If it causes functionality issues:
   - Try using the application in an incognito/private browser window
   - Disable browser extensions one by one to identify the conflicting one
   - Update all extensions to their latest versions

## Wallet Connection Problems

### Connection Timeout with Nija Wallet

**Error**: `Connection timeout with Nija Wallet` or `Wallet connection heartbeat is stale`

**Solution**:
1. Ensure the Nija Wallet application is running (check PM2 status with `pm2 list`)
2. Verify the wallet is running on the correct port (default: 5174)
3. Check network connectivity between NFTGen and Nija Wallet
4. Restart both applications using PM2:
   ```
   pm2 restart nwallet
   pm2 restart nftgen
   ```
5. Clear browser local storage:
   - Open developer tools (F12)
   - Go to Application > Storage > Local Storage
   - Clear all items with `nija_` prefix
6. Refresh the heartbeat interval by running in console:
   ```javascript
   localStorage.setItem('nija_wallet_heartbeat', Date.now().toString());
   ```

### WebSocket Connection Failed

**Error**: `WebSocket connection timed out` or `WebSocket connection to 'ws://13.126.230.108:5174/nija-wallet' failed`

**Solution**:
1. The application is trying to communicate with Nija Wallet via WebSockets but cannot establish a connection.
2. Check if the Nija Wallet application is running correctly.
3. Verify that port 5174 is accessible and not blocked by firewalls.
4. Note that the application has a fallback mechanism: `Using custom event fallback for activity sync`.
5. If the fallback is working, this error can be ignored.
6. To fix permanent WebSocket issues:
   - Ensure both applications are on the same network
   - Check firewall settings
   - Verify WebSocket support in your environment
   - Try using a secure WebSocket connection (wss:// instead of ws://)

### Failed to Connect to Wallet

**Error**: `Failed to connect to wallet` or `No Ethereum provider found`

**Solution**:
1. Ensure MetaMask or another compatible wallet is installed and unlocked
2. Check if the wallet is connected to the correct network (Ethereum Mainnet, Sepolia, etc.)
3. Try refreshing the page
4. Check browser console for specific error messages
5. Ensure you've granted permission for the site to connect to your wallet
6. For Nija Wallet integration, check the connection status with:
   ```javascript
   console.log(localStorage.getItem('nija_wallet_connection'));
   ```

## IPFS Upload Errors

### Missing API Keys

**Error**: `Skipping https://ipfs.alchemy.com/api/v1/upload due to missing API key`

**Solution**:
1. Configure your Alchemy API key correctly:
   - Create a `.env` file in the root directory of your project
   - Add your Alchemy API key: `REACT_APP_ALCHEMY_API_KEY=your_api_key`
   - Restart the application
2. Alternatively, configure other IPFS providers like Pinata:
   - Add to `.env`: `REACT_APP_PINATA_KEY=your_pinata_key` and `REACT_APP_PINATA_SECRET=your_pinata_secret`
   - Restart the application

### API Request Failures for IPFS

**Error**: `Failed to load resource: the server responded with a status of 400 ()` or `Failed to load resource: the server responded with a status of 401 ()`

**Solution**:
1. Status 400 errors typically indicate a bad request:
   - Check that your request payload matches the API requirements
   - Verify file size is within limits (typically <100MB)
   - Ensure proper content type headers are set
2. Status 401 errors indicate unauthorized access:
   - Verify your API keys are correct and active
   - Check if your account has the necessary permissions
   - For NFT.Storage, generate a new API key if needed
3. According to the Alchemy guide, ensure metadata follows the correct format:
   ```json
   {
     "name": "NFT Name",
     "description": "Description of the NFT",
     "image": "ipfs://QmHash/image.png",
     "attributes": [...]
   }
   ```

### Invalid Metadata URI

**Error**: `Invalid metadata IPFS URI returned` or `Error uploading metadata`

**Solution**:
1. Ensure the metadata follows the correct format as shown in the Alchemy guide:
   ```json
   {
     "name": "NFT Name",
     "description": "Description of the NFT",
     "image": "ipfs://QmHash/image.png",
     "attributes": [...]
   }
   ```
2. Verify that the image was successfully uploaded to IPFS before attempting to upload metadata
3. Check that the image URI in the metadata is correctly formatted
4. For multiple IPFS provider failures, check your network connection
5. Note that the application has a fallback: `Using mock API upload for metadata`
6. If you need to use this fallback in production, add to `.env`:
   ```
   REACT_APP_ENABLE_MOCK_IPFS=true
   ```

## Network Connection Issues

### Failed to Load Resource

**Error**: `Failed to load resource: net::ERR_CONNECTION_REFUSED` or `net::ERR_CONNECTION_TIMED_OUT` or `net::ERR_NAME_NOT_RESOLVED`

**Solution**:
1. `ERR_CONNECTION_REFUSED`: The server is unreachable
   - Check if the server is running and accessible
   - Verify firewall settings are not blocking connections
   - Ensure the correct ports are open (5177 for NFTGen, 5174 for Nija Wallet)
2. `ERR_CONNECTION_TIMED_OUT`: Request took too long to complete
   - Check your internet connection
   - Try a different network
   - The server might be overloaded or down
3. `ERR_NAME_NOT_RESOLVED`: DNS failed to resolve domain name
   - Check if you're using the correct URL
   - Verify DNS settings
   - Try using IP address instead of domain name if possible

### 404 Not Found Errors

**Error**: `Failed to load resource: the server responded with a status of 404 (Not Found)`

**Solution**:
1. The requested resource does not exist at the specified path
2. Check for typos in URLs
3. Verify API endpoints are correctly configured
4. For IPFS API endpoints, ensure you're using the latest URLs as they might have changed
5. If using custom API paths, check server routes configuration

## Smart Contract Interaction Failures

### Transaction Underpriced

**Error**: `Transaction underpriced` or `insufficient funds for gas`

**Solution**:
1. Increase the gas price for your transaction
2. Ensure your wallet has sufficient funds for the transaction and gas fees
3. Check current network gas prices and adjust accordingly
4. If on a testnet, ensure you have sufficient testnet ETH
5. According to the Alchemy guide, you can use the following code to get current gas prices:
   ```javascript
   async function getGasPrices() {
     const gasPrice = await alchemy.core.getGasPrice();
     // Convert to gwei and create price options
     const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, "gwei");
     return {
       slow: (parseFloat(gasPriceInGwei) * 0.8).toFixed(2),
       average: gasPriceInGwei,
       fast: (parseFloat(gasPriceInGwei) * 1.2).toFixed(2),
       fastest: (parseFloat(gasPriceInGwei) * 1.5).toFixed(2),
     };
   }
   ```

### Contract Execution Reverted

**Error**: `Transaction has been reverted by the EVM` or `execution reverted`

**Solution**:
1. Check the contract function requirements and ensure your call meets them
2. Verify you have the correct permissions to call the function
3. Check if the contract has sufficient funds (if applicable)
4. Look for specific revert reasons in the error message
5. Test the contract interaction on a testnet first
6. According to the Alchemy guide, you can simulate transactions before sending:
   ```javascript
   async function simulateTransaction(transaction) {
     try {
       const result = await alchemy.core.call(transaction);
       return { success: true, result };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }
   ```

## Sentry Connection Issues

### Failed to Connect to Sentry

**Error**: `Failed to load resource: net::ERR_CONNECTION_TIMED_OUT` for Sentry API connections

**Solution**:
1. Sentry is an error monitoring service that is optional for the application
2. If Sentry is unreachable, you may see these errors, but they won't affect core functionality
3. To resolve or disable Sentry:
   - Check if Sentry is accessible from your network
   - Verify that Sentry DSN is correctly configured
   - To disable Sentry, add to your `.env`: `REACT_APP_DISABLE_SENTRY=true`
   - Alternatively, to use a direct connection, add: `REACT_APP_SENTRY_DIRECT=true`
   - Restart the application after making changes

## React and Development Warnings

### React DevTools Message

**Warning**: `Download the React DevTools for a better development experience`

**Solution**:
1. This is just a helpful message, not an error
2. You can install React DevTools extension for a better debugging experience
3. This won't affect the functionality of your application

### React Router Future Flag Warnings

**Warning**: `⚠️ React Router Future Flag Warning:`

**Solution**:
1. These are warnings about upcoming changes in React Router v7
2. They don't affect current functionality
3. If you want to prepare for v7, follow the links in the warnings
4. To suppress these warnings, add to `.env`:
   ```
   REACT_APP_SUPPRESS_ROUTER_WARNINGS=true
   ```

### React Minified Error #130

**Error**: `Error: Minified React error #130`

**Solution**:
1. This error occurs when attempting to render null, undefined, or invalid React elements
2. Check your component rendering logic for null values
3. Ensure that all components have proper return values
4. Add null checks before rendering dynamic content:
   ```jsx
   {data && data.map(item => <Component key={item.id} item={item} />)}
   ```
5. For detailed error information, use the non-minified development build of React

## Additional Resources

If you continue to experience issues after trying these solutions, please:

1. Check the application logs:
   ```
   pm2 logs nftgen --lines 100
   pm2 logs nwallet --lines 100
   ```

2. Check browser console errors by opening Developer Tools (F12)

3. Restart both applications with clean state:
   ```
   pm2 delete nftgen
   pm2 delete nwallet
   cd /home/ubuntu/Sandeep/projects/NFTGen
   pm2 start npm --name nftgen -- run dev:network -- --port 5177
   cd /home/ubuntu/Sandeep/projects/Nwallet
   pm2 start npm --name nwallet -- run dev -- --port 5174
   pm2 save
   ```

4. Clear your browser cache and local storage:
   ```javascript
   localStorage.clear();
   ```

5. For IPFS issues, ensure you're following the metadata standards as outlined in the [Alchemy API Integration Guide](./alchemy-guide.md#metadata-standards)

6. For smart contract interactions, reference the [Contract Interaction section](./alchemy-guide.md#contract-interaction) of the Alchemy guide

7. Report the issue with detailed information about:
   - Browser and version
   - Wallet extension and version
   - Network you're connected to
   - Exact error messages
   - Steps to reproduce the issue 