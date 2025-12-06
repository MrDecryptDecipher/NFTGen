require('dotenv').config({ path: __dirname + '/../.env' });
const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const { ethers, formatUnits, parseUnits, parseEther } = require('ethers');

class AlchemyNFTService {
  constructor() {
    this.alchemy = null;
    this.initialized = false;
    this.apiKey = process.env.ALCHEMY_API_KEY;
    this.network = Network.ETH_SEPOLIA; // Using Sepolia testnet as specified
    this.contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('⚗️ Initializing Alchemy NFT service...');
      
      if (!this.apiKey) {
        throw new Error('ALCHEMY_API_KEY not found in environment variables');
      }
      
      // Configure Alchemy SDK
      const settings = {
        apiKey: this.apiKey,
        network: this.network,
      };
      
      this.alchemy = new Alchemy(settings);
      
      this.initialized = true;
      console.log('✅ Alchemy NFT service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Alchemy NFT service:', error);
      throw error;
    }
  }

  async mintNFT(userWallet, metadataUrl, userPrivateKey) {
    await this.initialize();

    try {
      console.log(`🎨 Minting NFT for wallet: ${userWallet}`);
      console.log(`📄 Metadata URL: ${metadataUrl}`);

      if (!this.contractAddress) {
        console.log('⚠️ No NFT contract deployed, simulating mint...');

        // Return simulated mint result
        return {
          success: true,
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          tokenId: Math.floor(Math.random() * 10000).toString(),
          contractAddress: '0x' + '0'.repeat(40), // Placeholder
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: '21000',
          status: 'simulated',
          timestamp: new Date().toISOString()
        };
      }

      // Use the user's private key - they have the ETH to pay for gas
      const wallet = new Wallet(userPrivateKey);
      
      // Get current nonce
      const nonce = await this.alchemy.core.getTransactionCount(
        wallet.address,
        "latest"
      );
      
      // Prepare mint transaction
      // Note: This would need to be customized based on your actual NFT contract ABI
      const mintTransaction = {
        to: this.contractAddress,
        value: parseEther("0"), // Free mint
        gasLimit: "100000",
        maxPriorityFeePerGas: parseUnits("2", "gwei"),
        maxFeePerGas: parseUnits("20", "gwei"),
        nonce: nonce,
        type: 2,
        chainId: 11155111, // Sepolia chain ID
        data: this.encodeMintFunction(userWallet, metadataUrl)
      };
      
      // Sign transaction
      const rawTransaction = await wallet.signTransaction(mintTransaction);
      
      // Send transaction
      const tx = await this.alchemy.core.sendTransaction(rawTransaction);
      console.log(`✅ NFT mint transaction sent: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await this.alchemy.core.waitForTransaction(tx.hash);

      // Check if transaction actually succeeded
      if (receipt.status === 0) {
        console.error(`❌ Transaction failed: ${tx.hash}`);
        console.error(`📊 Gas used: ${receipt.gasUsed.toString()}`);
        console.error(`🔍 Block number: ${receipt.blockNumber}`);
        throw new Error(`Transaction failed with status 0. Hash: ${tx.hash}. This usually indicates the smart contract call reverted.`);
      }

      console.log(`✅ NFT minted successfully: ${tx.hash}`);

      // Extract token ID from logs (this would depend on your contract's event structure)
      const tokenId = this.extractTokenIdFromLogs(receipt.logs);

      return {
        success: true,
        transactionHash: tx.hash,
        tokenId: tokenId,
        contractAddress: this.contractAddress,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: 'confirmed',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ NFT minting failed:', error);

      // Provide detailed error information
      let errorMessage = 'NFT minting failed: ';

      if (error.message.includes('Transaction failed with status 0')) {
        errorMessage += 'Smart contract execution reverted. This could be due to: access control restrictions, invalid parameters, insufficient gas, or contract logic errors.';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient funds to pay for gas fees.';
      } else if (error.code === 'NONCE_EXPIRED') {
        errorMessage += 'Transaction nonce expired. Please retry.';
      } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
        errorMessage += 'Gas price too low. Please increase gas price and retry.';
      } else if (error.message.includes('execution reverted')) {
        errorMessage += 'Smart contract execution reverted. Check contract requirements and parameters.';
      } else {
        errorMessage += error.message;
      }

      const detailedError = new Error(errorMessage);
      detailedError.originalError = error;
      detailedError.timestamp = new Date().toISOString();

      throw detailedError;
    }
  }

  encodeMintFunction(to, tokenURI) {
    // Updated for SimpleNFT ERC721 contract
    // mint(address to, string uri) public returns (uint256)
    const iface = new ethers.Interface([
      "function mint(address to, string uri) public returns (uint256)"
    ]);

    return iface.encodeFunctionData("mint", [to, tokenURI]);
  }

  encodePublicMintFunction(to, tokenURI) {
    // Try alternative public mint functions that might exist
    // Common ERC1155 mint patterns
    const iface = new ethers.Interface([
      "function publicMint(address to, string memory tokenURI) public returns (uint256)",
      "function safeMint(address to, string memory tokenURI) public returns (uint256)",
      "function mintTo(address to, string memory tokenURI) public returns (uint256)"
    ]);

    // Try publicMint first
    try {
      return iface.encodeFunctionData("publicMint", [to, tokenURI]);
    } catch {
      try {
        return iface.encodeFunctionData("safeMint", [to, tokenURI]);
      } catch {
        return iface.encodeFunctionData("mintTo", [to, tokenURI]);
      }
    }
  }

  extractTokenIdFromLogs(logs) {
    // This is a placeholder - you would need to implement based on your contract's event structure
    // Example for extracting token ID from Transfer event logs
    try {
      const transferTopic = ethers.id("Transfer(address,address,uint256)");
      const transferLog = logs.find(log => log.topics[0] === transferTopic);
      
      if (transferLog) {
        // Token ID is typically the third topic in Transfer events
        return BigInt(transferLog.topics[3]).toString();
      }
      
      // Fallback to random token ID if we can't extract from logs
      return Math.floor(Math.random() * 10000).toString();
    } catch (error) {
      console.warn('⚠️ Could not extract token ID from logs:', error.message);
      return Math.floor(Math.random() * 10000).toString();
    }
  }

  async getNFTMetadata(contractAddress, tokenId) {
    await this.initialize();
    
    try {
      console.log(`🔍 Getting NFT metadata for ${contractAddress}:${tokenId}`);
      
      const metadata = await this.alchemy.nft.getNftMetadata(contractAddress, tokenId);
      
      return {
        success: true,
        metadata: {
          name: metadata.title,
          description: metadata.description,
          image: metadata.rawMetadata?.image,
          attributes: metadata.rawMetadata?.attributes || [],
          tokenType: metadata.tokenType,
          tokenUri: metadata.tokenUri?.gateway,
          contract: {
            address: metadata.contract.address,
            name: metadata.contract.name,
            symbol: metadata.contract.symbol
          }
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get NFT metadata:', error);
      throw error;
    }
  }

  async getNFTsForOwner(ownerAddress) {
    await this.initialize();
    
    try {
      console.log(`🔍 Getting NFTs for owner: ${ownerAddress}`);
      
      const nfts = await this.alchemy.nft.getNftsForOwner(ownerAddress);
      
      return {
        success: true,
        totalCount: nfts.totalCount,
        nfts: nfts.ownedNfts.map(nft => ({
          contractAddress: nft.contract.address,
          tokenId: nft.tokenId,
          name: nft.title,
          description: nft.description,
          image: nft.rawMetadata?.image,
          tokenType: nft.tokenType,
          tokenUri: nft.tokenUri?.gateway
        })),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get NFTs for owner:', error);
      throw error;
    }
  }

  async getTransactionStatus(transactionHash) {
    await this.initialize();
    
    try {
      console.log(`🔍 Checking transaction status: ${transactionHash}`);
      
      const receipt = await this.alchemy.core.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return {
          success: true,
          status: 'pending',
          message: 'Transaction is still pending or unknown'
        };
      }
      
      return {
        success: true,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get transaction status:', error);
      throw error;
    }
  }

  async estimateGasFee() {
    await this.initialize();
    
    try {
      console.log('⛽ Estimating gas fees...');
      
      const feeData = await this.alchemy.core.getFeeData();
      
      return {
        success: true,
        gasPrice: feeData.gasPrice ? formatUnits(feeData.gasPrice.toString(), 'gwei') : null,
        maxFeePerGas: feeData.maxFeePerGas ? formatUnits(feeData.maxFeePerGas.toString(), 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? formatUnits(feeData.maxPriorityFeePerGas.toString(), 'gwei') : null,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to estimate gas fees:', error);
      throw error;
    }
  }
}

module.exports = AlchemyNFTService;