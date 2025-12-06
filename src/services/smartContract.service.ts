/**
 * Smart Contract Service
 * 
 * Handles interactions with both ERC721 (MyNFT) and ERC1155 (FractionalNFT) contracts
 * Supports minting, batch minting, and fractionalization
 */

import { ethers } from 'ethers';
import { toast } from 'react-toastify';

// Contract addresses
const ERC721_CONTRACT_ADDRESS = '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A';
const ERC1155_CONTRACT_ADDRESS = process.env.REACT_APP_FRACTIONAL_CONTRACT_ADDRESS || '';

// ERC721 (MyNFT) ABI - Essential functions
const ERC721_ABI = [
  'function mintNFT(address recipient, string memory tokenURI, tuple(string name, string description, string image, string external_url, string[] attributes) memory metadata) public returns (uint256)',
  'function batchMintNFT(address recipient, string[] memory tokenURIs, tuple(string name, string description, string image, string external_url, string[] attributes)[] memory metadataArray) public returns (uint256[])',
  'function tokenURI(uint256 tokenId) public view returns (string memory)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function getTokenMetadata(uint256 tokenId) public view returns (tuple(string name, string description, string image, string external_url, string[] attributes))',
  'event TokenMinted(address indexed to, uint256 indexed tokenId, string tokenURI)',
  'event BatchMinted(address indexed to, uint256 startTokenId, uint256 count)'
];

// ERC1155 (FractionalNFT) ABI - Essential functions
const ERC1155_ABI = [
  'function fractionalize(address nftContract, uint256 tokenId, uint256 totalSupply, string memory metadataURI) public returns (uint256)',
  'function mint(address to, uint256 id, uint256 amount, bytes memory data) public',
  'function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public',
  'function balanceOf(address account, uint256 id) public view returns (uint256)',
  'function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view returns (uint256[] memory)',
  'function uri(uint256 id) public view returns (string memory)',
  'function redeem(uint256 fractionId) public',
  'function getFractionInfo(uint256 fractionId) public view returns (tuple(address originalContract, uint256 originalTokenId, uint256 totalSupply, address creator, bool isRedeemable))',
  'event Fractionalized(uint256 indexed fractionId, address indexed nftContract, uint256 indexed tokenId, uint256 totalSupply)',
  'event NFTRedeemed(uint256 indexed fractionId, address indexed redeemer, address indexed nftContract, uint256 tokenId)'
];

export interface TokenMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: string[];
}

export interface MintResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  error?: string;
}

export interface BatchMintResult {
  success: boolean;
  tokenIds?: string[];
  transactionHash?: string;
  error?: string;
}

export interface FractionalizeResult {
  success: boolean;
  fractionId?: string;
  transactionHash?: string;
  error?: string;
}

class SmartContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private erc721Contract: ethers.Contract | null = null;
  private erc1155Contract: ethers.Contract | null = null;

  /**
   * Initialize the service with wallet connection
   */
  async initialize(): Promise<void> {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask or compatible wallet not found');
      }

      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      await this.provider.send('eth_requestAccounts', []);
      this.signer = this.provider.getSigner();

      // Initialize contracts
      this.erc721Contract = new ethers.Contract(
        ERC721_CONTRACT_ADDRESS,
        ERC721_ABI,
        this.signer
      );

      if (ERC1155_CONTRACT_ADDRESS) {
        this.erc1155Contract = new ethers.Contract(
          ERC1155_CONTRACT_ADDRESS,
          ERC1155_ABI,
          this.signer
        );
      }

      console.log('✅ Smart Contract Service initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize Smart Contract Service:', error);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Mint a single ERC721 NFT
   */
  async mintERC721(
    recipient: string,
    tokenURI: string,
    metadata: TokenMetadata
  ): Promise<MintResult> {
    if (!this.erc721Contract) {
      await this.initialize();
    }

    try {
      console.log('🔨 Minting ERC721 NFT...');
      console.log('📍 Recipient:', recipient);
      console.log('📄 Token URI:', tokenURI);
      console.log('📋 Metadata:', metadata);

      // Estimate gas
      const gasEstimate = await this.erc721Contract!.estimateGas.mintNFT(
        recipient,
        tokenURI,
        metadata
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      // Execute the transaction
      const tx = await this.erc721Contract!.mintNFT(
        recipient,
        tokenURI,
        metadata,
        { gasLimit }
      );

      console.log('📤 Transaction submitted:', tx.hash);
      toast.info('Transaction submitted, waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Extract token ID from events
      const event = receipt.events?.find((e: any) => e.event === 'TokenMinted');
      const tokenId = event?.args?.tokenId?.toString();

      if (!tokenId) {
        throw new Error('Failed to extract token ID from transaction');
      }

      toast.success(`NFT minted successfully! Token ID: ${tokenId}`);

      return {
        success: true,
        tokenId,
        transactionHash: tx.hash
      };

    } catch (error: any) {
      console.error('❌ ERC721 minting failed:', error);
      toast.error(`Minting failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch mint multiple ERC721 NFTs
   */
  async batchMintERC721(
    recipient: string,
    tokenURIs: string[],
    metadataArray: TokenMetadata[]
  ): Promise<BatchMintResult> {
    if (!this.erc721Contract) {
      await this.initialize();
    }

    try {
      console.log('🔨 Batch minting ERC721 NFTs...');
      console.log('📍 Recipient:', recipient);
      console.log('📄 Count:', tokenURIs.length);

      if (tokenURIs.length !== metadataArray.length) {
        throw new Error('Token URIs and metadata arrays must have the same length');
      }

      // Estimate gas
      const gasEstimate = await this.erc721Contract!.estimateGas.batchMintNFT(
        recipient,
        tokenURIs,
        metadataArray
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      // Execute the transaction
      const tx = await this.erc721Contract!.batchMintNFT(
        recipient,
        tokenURIs,
        metadataArray,
        { gasLimit }
      );

      console.log('📤 Batch transaction submitted:', tx.hash);
      toast.info('Batch transaction submitted, waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Batch transaction confirmed:', receipt);

      // Extract token IDs from events
      const event = receipt.events?.find((e: any) => e.event === 'BatchMinted');
      const startTokenId = event?.args?.startTokenId?.toNumber();
      const count = event?.args?.count?.toNumber();

      if (!startTokenId || !count) {
        throw new Error('Failed to extract token IDs from transaction');
      }

      // Generate token ID array
      const tokenIds = Array.from({ length: count }, (_, i) => 
        (startTokenId + i).toString()
      );

      toast.success(`${count} NFTs minted successfully!`);

      return {
        success: true,
        tokenIds,
        transactionHash: tx.hash
      };

    } catch (error: any) {
      console.error('❌ ERC721 batch minting failed:', error);
      toast.error(`Batch minting failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fractionalize an ERC721 NFT into ERC1155 tokens
   */
  async fractionalizeNFT(
    nftContract: string,
    tokenId: string,
    totalSupply: string,
    metadataURI: string
  ): Promise<FractionalizeResult> {
    if (!this.erc1155Contract) {
      throw new Error('ERC1155 contract not available');
    }

    try {
      console.log('🔨 Fractionalizing NFT...');
      console.log('🏭 NFT Contract:', nftContract);
      console.log('🎫 Token ID:', tokenId);
      console.log('📊 Total Supply:', totalSupply);

      // Estimate gas
      const gasEstimate = await this.erc1155Contract.estimateGas.fractionalize(
        nftContract,
        tokenId,
        totalSupply,
        metadataURI
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      // Execute the transaction
      const tx = await this.erc1155Contract.fractionalize(
        nftContract,
        tokenId,
        totalSupply,
        metadataURI,
        { gasLimit }
      );

      console.log('📤 Fractionalization transaction submitted:', tx.hash);
      toast.info('Fractionalization submitted, waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Fractionalization confirmed:', receipt);

      // Extract fraction ID from events
      const event = receipt.events?.find((e: any) => e.event === 'Fractionalized');
      const fractionId = event?.args?.fractionId?.toString();

      if (!fractionId) {
        throw new Error('Failed to extract fraction ID from transaction');
      }

      toast.success(`NFT fractionalized successfully! Fraction ID: ${fractionId}`);

      return {
        success: true,
        fractionId,
        transactionHash: tx.hash
      };

    } catch (error: any) {
      console.error('❌ Fractionalization failed:', error);
      toast.error(`Fractionalization failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the current signer address
   */
  async getSignerAddress(): Promise<string | null> {
    if (!this.signer) {
      return null;
    }

    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('❌ Failed to get signer address:', error);
      return null;
    }
  }

  /**
   * Check if contracts are available
   */
  getContractStatus(): {
    erc721: boolean;
    erc1155: boolean;
    signer: boolean;
  } {
    return {
      erc721: this.erc721Contract !== null,
      erc1155: this.erc1155Contract !== null,
      signer: this.signer !== null
    };
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();
export default smartContractService;
