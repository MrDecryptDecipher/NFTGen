# NFTGen Documentation

Welcome to the NFTGen documentation. This directory contains comprehensive guides and troubleshooting information for the NFTGen application.

## Available Documentation

- [Alchemy API Integration Guide](./alchemy-guide.md) - Comprehensive guide for integrating Alchemy APIs with NFTGen, including NFT minting, IPFS integration, and smart contract interactions.
- [Troubleshooting Guide](./troubleshooting-guide.md) - Solutions for common issues encountered when using NFTGen, including browser extension conflicts, wallet connection problems, and IPFS upload errors.

## Application Overview

NFTGen is a full-stack application for creating, minting, and managing NFTs (Non-Fungible Tokens). It provides a user-friendly interface for:

1. Creating and uploading digital assets to IPFS
2. Generating metadata for NFTs
3. Minting NFTs on various blockchain networks
4. Managing your NFT collection
5. Integrating with Nija Wallet for transaction signing

## Getting Started

To start using NFTGen:

1. Ensure both NFTGen and Nija Wallet applications are running:
   ```
   pm2 list
   ```

2. If not running, start them:
   ```
   cd /home/ubuntu/Sandeep/projects/NFTGen
   pm2 start npm --name nftgen -- run dev:network -- --port 5177
   
   cd /home/ubuntu/Sandeep/projects/Nwallet
   pm2 start npm --name nwallet -- run dev -- --port 5174
   
   pm2 save
   ```

3. Access the application at the configured port (default: 5177)

## Configuration

NFTGen requires the following configuration:

1. Alchemy API keys for blockchain interaction
2. IPFS service credentials (Pinata, Infura, etc.)
3. Network configuration for target blockchains
4. Integration settings for Nija Wallet

Configuration is typically stored in `.env` files. See the application source code for specific configuration options.

## Support

If you encounter issues not covered in the documentation, please:

1. Check the application logs:
   ```
   pm2 logs nftgen --lines 100
   ```

2. Consult the troubleshooting guide for common solutions

3. Report detailed information about your issue, including browser version, wallet extension, network, and exact error messages 