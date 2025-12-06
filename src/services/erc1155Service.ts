import { ethers } from 'ethers';
import { Alchemy, Network, AssetTransfersCategory, NftTokenType } from 'alchemy-sdk';
import { FRACTIONAL_NFT_ABI, FractionalNFTContract } from '../contracts/FractionalNFT';
import { ERC1155_ABI } from '../constants/abis';
import { NFT, FractionData } from '../types';
import { getTransactionUrl } from '../utils/etherscanUtils';

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || 'gRcliAnQ2ysaJacOBBlOCd7eT9NxGLd0';
const FRACTIONAL_NFT_CONTRACT_ADDRESS = '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A';

// Sepolia testnet contract addresses
// This is the deployed FractionalNFT contract address
const ERC1155_CONTRACT_ADDRESS = FRACTIONAL_NFT_CONTRACT_ADDRESS; // Use the same address for ERC1155 operations
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // Sepolia chain ID (11155111)

interface ERC1155Transfer {
  tokenId: string;
  contractAddress: string;
  toAddress: string;
  fromAddress: string;
  amount: string;
  blockNumber: string;
  hash: string;
  timestamp: number;
}

/**
 * Service for handling ERC-1155 fractionalized NFTs 
 * using Alchemy API for Sepolia network
 */
export class ERC1155Service {
  private static instance: ERC1155Service | null = null;
  private alchemy: Alchemy;
  private provider: ethers.providers.Web3Provider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;
  
  private constructor(provider?: ethers.providers.Web3Provider) {
    // Initialize Alchemy
    this.alchemy = new Alchemy({
      apiKey: ALCHEMY_API_KEY,
      network: Network.ETH_SEPOLIA
    });
    
    if (provider) {
      this.provider = provider;
      this.initialize();
    }
  }
  
  /**
   * Get singleton instance of the service
   */
  public static getInstance(): ERC1155Service {
    if (!ERC1155Service.instance) {
      ERC1155Service.instance = new ERC1155Service();
    }
    return ERC1155Service.instance;
  }

  /**
   * Initialize the contract with a signer
   * @param signer Ethers signer
   */
  public async initializeContract(signer: ethers.Signer): Promise<void> {
    try {
      this.signer = signer;
      this.contract = new ethers.Contract(
        ERC1155_CONTRACT_ADDRESS,
        ERC1155_ABI,
        this.signer
      );
      console.log('ERC1155Service initialized with contract:', ERC1155_CONTRACT_ADDRESS);
    } catch (error) {
      console.error('Error initializing ERC1155 contract:', error);
      throw error;
    }
  }

  /**
   * Initialize the service
   */
  private initialize() {
    try {
      if (this.provider) {
        // Get the signer from the provider
        this.signer = this.provider.getSigner();
        this.contract = new ethers.Contract(
          ERC1155_CONTRACT_ADDRESS,
          ERC1155_ABI,
          this.signer
        );
        console.log('ERC1155Service initialized with contract:', ERC1155_CONTRACT_ADDRESS);
      } else {
        console.error('ERC1155Service: No provider available');
      }
    } catch (error) {
      console.error('Error initializing ERC1155Service:', error);
    }
  }

  /**
   * Get ERC-1155 transfers for an address
   * @param address Ethereum address to search for
   * @returns Array of ERC-1155 transfers
   */
  public async getERC1155Transfers(address: string): Promise<ERC1155Transfer[]> {
    try {
      // Get asset transfers for the address
      const transfers = await this.alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: [AssetTransfersCategory.ERC1155],
        maxCount: 100,
      });
      
      // Also check for incoming transfers
      const incomingTransfers = await this.alchemy.core.getAssetTransfers({
        toAddress: address,
        category: [AssetTransfersCategory.ERC1155],
        maxCount: 100,
      });
      
      // Combine and format the transfers
      const allTransfers = [...transfers.transfers, ...incomingTransfers.transfers]
        .filter(transfer => transfer.erc1155Metadata && transfer.erc1155Metadata.length > 0)
        .map(transfer => ({
          tokenId: transfer.erc1155Metadata![0].tokenId,
          contractAddress: transfer.rawContract.address || '',
          toAddress: transfer.to || '',
          fromAddress: transfer.from || '',
          amount: transfer.erc1155Metadata![0].value || '1',
          blockNumber: transfer.blockNum,
          hash: transfer.hash,
          timestamp: Date.now(),
        }));
      
      return allTransfers;
    } catch (error) {
      console.error('Error fetching ERC-1155 transfers:', error);
      return [];
    }
  }
  
  /**
   * Get balances of all ERC-1155 tokens owned by an address
   * @param address Ethereum address to check
   * @returns Object mapping contract address and token ID to balance
   */
  public async getERC1155Balances(address: string): Promise<Record<string, Record<string, number>>> {
    try {
      // Get NFTs for the address - using the correct options format for Alchemy API
      const nfts = await this.alchemy.nft.getNftsForOwner(address, {
        excludeFilters: [] // Not filtering by token type in options
      });
      
      // Format the balances
      const balances: Record<string, Record<string, number>> = {};
      
      // Filter for ERC1155 tokens only after fetching
      nfts.ownedNfts
        .filter(nft => nft.tokenType === 'ERC1155')
        .forEach(nft => {
          if (!balances[nft.contract.address]) {
            balances[nft.contract.address] = {};
          }
          
          balances[nft.contract.address][nft.tokenId] = Number(nft.balance || 1);
        });
      
      return balances;
    } catch (error) {
      console.error('Error fetching ERC-1155 balances:', error);
      return {};
    }
  }
  
  /**
   * Get metadata for an ERC-1155 token
   * @param contractAddress Contract address of the ERC-1155 token
   * @param tokenId Token ID
   * @returns Metadata for the token
   */
  public async getERC1155Metadata(contractAddress: string, tokenId: string): Promise<any> {
    try {
      // Using the correct parameter format for Alchemy API
      const nft = await this.alchemy.nft.getNftMetadata(
        contractAddress,
        tokenId
      );
      
      return nft;
    } catch (error) {
      console.error('Error fetching ERC-1155 metadata:', error);
      return null;
    }
  }
  
  /**
   * Fractionalize an NFT into ERC-1155 tokens
   * @param nftContractAddress The contract address of the NFT
   * @param nftTokenId Original NFT token ID
   * @param fractions Number of fractions to create
   * @param tokenURI Token URI for the fractions metadata
   * @param receiverAddress Address to receive the fractions
   * @param royaltyPercentage Royalty percentage in basis points (100 = 1%)
   * @returns Transaction hash
   */
  public async fractionalize(
    nftContractAddress: string,
    nftTokenId: string,
    fractions: number,
    tokenURI: string,
    royaltyRecipient: string,
    royaltyPercentage: number = 500
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initializeContract first');
    }

    try {
      // Ensure the royalty recipient is valid (Ethers.js v6 syntax)
      if (!ethers.isAddress(royaltyRecipient)) {
        throw new Error('Invalid royalty recipient address');
      }
      
      // Estimate gas for transaction
      const gasEstimate = await this.contract.estimateGas.fractionalize(
        nftContractAddress,
        nftTokenId,
        fractions,
        tokenURI,
        royaltyRecipient,
        royaltyPercentage
      );
      
      // Add buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);
      
      // Execute transaction
      const tx = await this.contract.fractionalize(
        nftContractAddress,
        nftTokenId,
        fractions,
        tokenURI,
        royaltyRecipient,
        royaltyPercentage,
        { gasLimit }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      console.log('Fractionalization transaction successful:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error fractionalizing NFT:', error);
      throw error;
    }
  }
  
  /**
   * Transfer fractions to multiple recipients
   * @param fractionId The ID of the fractionalized NFT
   * @param recipients Array of recipient addresses
   * @param amounts Array of amounts to send to each recipient
   * @returns Transaction hash
   */
  public async transferToMultipleRecipients(
    fractionId: string,
    recipients: string[],
    amounts: number[]
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initializeContract first');
    }
    
    try {
      // Validate inputs
      if (recipients.length !== amounts.length) {
        throw new Error('Recipients and amounts arrays must have the same length');
      }
      
      if (recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }
      
      // Filter out invalid entries
      const validRecipients: string[] = [];
      const validAmounts: number[] = [];
      
      for (let i = 0; i < recipients.length; i++) {
        if (ethers.isAddress(recipients[i]) && amounts[i] > 0) {
          validRecipients.push(recipients[i]);
          validAmounts.push(amounts[i]);
        }
      }
      
      if (validRecipients.length === 0) {
        throw new Error('No valid recipients provided');
      }
      
      // Estimate gas for transaction
      const gasEstimate = await this.contract.estimateGas.transferToMultipleRecipients(
        fractionId,
        validRecipients,
        validAmounts
      );
      
      // Add buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);
      
      // Execute transaction
      const tx = await this.contract.transferToMultipleRecipients(
        fractionId,
        validRecipients,
        validAmounts,
        { gasLimit }
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      console.log('Transfer to multiple recipients successful:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error transferring fractions to multiple recipients:', error);
      throw error;
    }
  }
  
  /**
   * Get fraction details
   * @param fractionId ID of the fraction
   * @returns Fractionalized NFT details
   */
  public async getFractionDetails(fractionId: string): Promise<any> {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call initializeContract first');
    }
    
    try {
      const details = await this.contract.fractionDetails(fractionId);
      return {
        originalContract: details.originalContract,
        originalTokenId: details.originalTokenId.toString(),
        fractionSupply: details.fractionSupply.toString(),
        tokenURI: details.tokenURI,
        locked: details.locked,
        originalOwner: details.originalOwner
      };
    } catch (error) {
      console.error('Error getting fraction details:', error);
      throw error;
    }
  }

  /**
   * Fractionalize an NFT into ERC1155 tokens
   * 
   * @param nft The NFT to fractionalize
   * @param receiverAddress Address that will receive the fractions
   * @param totalSupply Total number of fraction tokens to create
   * @param pricePerFraction Price per fraction in ETH
   * @returns Transaction hash
   */
  async fractionalizeNFT(
    nft: NFT,
    receiverAddress: string,
    totalSupply: number,
    pricePerFraction: string
  ): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('ERC1155Service not initialized');
    }

    try {
      // Ensure we're on Sepolia testnet
      if (this.provider) {
        const network = await this.provider.getNetwork();
        console.log('Current network:', network);
        
        if (network.chainId !== 11155111) { // Sepolia chain ID
          throw new Error('Please connect to Sepolia testnet to fractionalize NFTs');
        }
      }

      // Validate the receiver address (Ethers.js v6 syntax)
      if (!ethers.isAddress(receiverAddress)) {
        throw new Error('Invalid receiver address');
      }

      // Generate a unique token ID based on the original NFT ID
      // This creates a deterministic token ID that can be referenced later
      const tokenIdBasis = nft.id.replace(/^0x/, '');
      const tokenId = (BigInt(`0x${tokenIdBasis}`) % BigInt(1000000)).toString();
      
      console.log(`Fractionalizing NFT ${nft.id} into token ID ${tokenId}`);
      console.log(`Creating ${totalSupply} tokens for receiver ${receiverAddress}`);
      
      // Format price per fraction as wei (Ethers.js v6 syntax)
      const priceInWei = ethers.parseEther(pricePerFraction);
      
      // Log the real transaction parameters
      console.log('Sending fractionalization transaction with parameters:');
      console.log('- NFT Contract:', nft.contractAddress);
      console.log('- NFT Token ID:', nft.tokenId);
      console.log('- Fraction Token ID:', tokenId);
      console.log('- Supply:', totalSupply);
      console.log('- Receiver:', receiverAddress);
      console.log('- Price per fraction:', priceInWei.toString(), 'wei');
      
      // Estimate gas for the transaction to avoid failures
      const gasEstimate = await this.contract.estimateGas.fractionalize(
        nft.contractAddress,
        nft.tokenId,
        tokenId,
        totalSupply,
        receiverAddress,
        priceInWei
      );
      
      // Add 20% buffer to gas estimate to account for fluctuations
      const gasLimit = gasEstimate.mul(120).div(100);
      
      // Execute the actual blockchain transaction
      const tx = await this.contract.fractionalize(
        nft.contractAddress,
        nft.tokenId,
        tokenId,
        totalSupply,
        receiverAddress,
        priceInWei,
        { gasLimit }
      );
      
      console.log('Transaction sent, waiting for confirmation...', tx.hash);
      
      // Wait for transaction to be mined and confirmed
      const receipt = await tx.wait(1); // Wait for 1 confirmation
      
      // Store fractional data in the NFT object for UI updates
      const fractionData: FractionData = {
        tokenId,
        supply: totalSupply,
        available: totalSupply,
        pricePerFraction,
        receiver: receiverAddress,
        status: 'FRACTIONALIZED',
        txHash: tx.hash
      };
      
      nft.fractionData = fractionData;
      
      // Create activity data for Nwallet synchronization
      this.createFractionalizationActivity(nft, tx.hash, tokenId, totalSupply, receiverAddress);
      
      console.log('Fractionalization complete, transaction hash:', tx.hash);
      console.log('Etherscan URL:', this.getEtherscanLink(tx.hash));
      
      return tx.hash;
    } catch (error: any) {
      console.error('Error fractionalizing NFT:', error);
      throw new Error(`Failed to fractionalize NFT: ${error.message || error}`);
    }
  }

  /**
   * Create activity data for Nwallet synchronization after fractionalization
   * @param nft The NFT that was fractionalized
   * @param txHash Transaction hash
   * @param fractionId Fraction token ID
   * @param totalSupply Total number of fraction tokens created
   * @param receiverAddress Address that received the fractions
   */
  private createFractionalizationActivity(nft: NFT, txHash: string, fractionId: string, totalSupply: number, receiverAddress: string): void {
    try {
      // Create a unique key for this fractionalization activity
      // The key format should match what Nwallet expects for NFT activities
      const activityKey = `nftgen_fraction_${txHash}`;
      
      // Create the activity data object
      const activityData = {
        hash: txHash,
        type: 'fractionalize',
        tokenId: nft.tokenId,
        fractionId,
        totalSupply,
        receiver: receiverAddress,
        name: nft.name,
        description: `Fractionalized into ${totalSupply} tokens`,
        image: nft.image,
        timestamp: Date.now(),
        status: 'success',
        source: 'nftgen',
        contractAddress: nft.contractAddress,
        originalTokenId: nft.tokenId,
        chainId: '11155111', // Sepolia chain ID
        externalUrl: `http://${window.location.hostname}:7103/nft/${nft.tokenId}/fractions`,
      };
      
      // Store activity in localStorage for Nwallet to detect
      localStorage.setItem(activityKey, JSON.stringify(activityData));
      
      // Dispatch custom event to notify NFTGen components
      window.dispatchEvent(new CustomEvent('nftgen_activity_update', {
        detail: activityData
      }));
      
      // Also dispatch a storage event to ensure Nwallet detects the change
      window.dispatchEvent(new Event('storage'));
      
      console.log('Fractionalization activity data stored and events dispatched:', activityData);
    } catch (error) {
      console.error('Error creating fractionalization activity:', error);
      // Non-critical error - don't throw, just log
    }
  }

  /**
   * Get the URI for a token
   * @param tokenId Token ID
   * @returns Token URI
   */
  async getTokenURI(tokenId: string): Promise<string> {
    if (!this.contract) {
      throw new Error('ERC1155Service not initialized');
    }

    try {
      const uri = await this.contract.uri(tokenId);
      return uri;
    } catch (error) {
      console.error('Error getting token URI:', error);
      throw error;
    }
  }
  
  /**
   * Get the Etherscan link for a transaction
   * @param txHash Transaction hash
   * @returns Etherscan URL
   */
  getEtherscanLink(txHash: string): string {
    return getTransactionUrl(txHash, 'sepolia');
  }
  
  /**
   * Check if the user is connected to Sepolia testnet
   * @returns boolean indicating if connected to Sepolia
   */
  async isConnectedToSepolia(): Promise<boolean> {
    try {
      if (!this.provider) return false;
      
      const { chainId } = await this.provider.getNetwork();
      return chainId === 11155111; // Sepolia chain ID
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }
} 