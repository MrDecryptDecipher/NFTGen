import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { uploadMetadataToIPFS } from '../../utils/ipfs-adapter';
import { getNwalletProvider, getEthersSigner } from '../../providers/NwalletProvider';

// Constants
const NFT_CONTRACT_ADDRESS = '0x8101CFC4E0E932Ef8Ab180A90ec6E4DbE917B765'; // Current deployed contract address
const NFT_CONTRACT_ABI = [
  'function mintNFT(address recipient, string memory tokenURI, tuple(string name, string description, string image, string external_url, string[] attributes) memory metadata) returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string memory)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function owner() view returns (address)',
  'function name() view returns (string memory)',
  'function symbol() view returns (string memory)',
  'event TokenMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI)'
];

// Types
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface MintNFTParams {
  address: string;
  metadataUrl: string;
  metadataStruct: NFTMetadata;
}

export interface MintNFTResponse {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  error?: string;
}

/**
 * Service for interacting with NFTs through Nwallet
 */
export class NwalletNFTService {
  private static instance: NwalletNFTService;
  private contract: ethers.Contract | null = null;

  private constructor() {
    // Initialize the contract when the service is created
    this.initializeContract();
  }

  /**
   * Get the singleton instance of the service
   */
  public static getInstance(): NwalletNFTService {
    if (!NwalletNFTService.instance) {
      NwalletNFTService.instance = new NwalletNFTService();
    }
    return NwalletNFTService.instance;
  }

  /**
   * Initialize the NFT contract with the current signer
   */
  private async initializeContract(): Promise<void> {
    try {
      const signer = getEthersSigner();
      if (!signer) {
        console.warn('No signer available, contract will be initialized in read-only mode');
        const provider = getNwalletProvider();
        if (provider) {
          // Initialize with provider for read-only operations
          this.contract = new ethers.Contract(
            NFT_CONTRACT_ADDRESS,
            NFT_CONTRACT_ABI,
            new ethers.BrowserProvider(provider as any)
          );
        }
        return;
      }

      // Initialize with signer for read-write operations
      this.contract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        signer
      );

      console.log('NFT contract initialized with signer');
    } catch (error) {
      console.error('Failed to initialize NFT contract:', error);
    }
  }

  /**
   * Mint a new NFT using Nwallet as the provider
   */
  public async mintNFT(params: MintNFTParams): Promise<MintNFTResponse> {
    try {
      // Ensure we have a contract instance
      if (!this.contract) {
        await this.initializeContract();
        if (!this.contract) {
          throw new Error('Failed to initialize NFT contract');
        }
      }

      // Ensure we have a signer
      const signer = getEthersSigner();
      if (!signer) {
        throw new Error('No signer available. Please connect to Nwallet.');
      }

      // Prepare metadata for the contract
      const metadataArray = [
        params.metadataStruct.name,
        params.metadataStruct.description,
        params.metadataStruct.image,
        params.metadataStruct.external_url || '',
        params.metadataStruct.attributes ?
          params.metadataStruct.attributes.map(attr => `${attr.trait_type}:${attr.value}`).join(',') :
          ''
      ];

      console.log('Minting NFT with params:', {
        recipient: params.address,
        tokenURI: params.metadataUrl,
        metadata: metadataArray
      });

      // Estimate gas for the transaction
      const gasEstimate = await this.contract.estimateGas.mintNFT(
        params.address,
        params.metadataUrl,
        metadataArray
      );

      console.log('Gas estimate for mint:', gasEstimate.toString());

      // Increase gas limit by 20% to account for potential variations
      const gasLimit = gasEstimate.mul(120).div(100);

      // Send the transaction
      const tx = await this.contract.mintNFT(
        params.address,
        params.metadataUrl,
        metadataArray,
        { gasLimit }
      );

      console.log('Mint transaction submitted:', tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log('Mint transaction confirmed:', receipt);

      // Find the TokenMinted event
      const event = receipt.events?.find((e: any) => e.event === 'TokenMinted');
      if (!event) {
        throw new Error('TokenMinted event not found in transaction receipt');
      }

      // Get the token ID from the event
      const tokenId = event.args?.tokenId.toString();

      return {
        success: true,
        transactionHash: tx.hash,
        tokenId
      };
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload metadata to IPFS and mint an NFT
   */
  public async createAndMintNFT(
    address: string,
    metadata: NFTMetadata,
    onProgress?: (status: string) => void
  ): Promise<MintNFTResponse> {
    try {
      onProgress?.('Uploading metadata to IPFS...');

      // Upload metadata to IPFS
      const metadataUrl = await uploadMetadataToIPFS(metadata);

      onProgress?.('Metadata uploaded, initiating transaction...');

      // Mint the NFT
      return await this.mintNFT({
        address,
        metadataUrl,
        metadataStruct: metadata
      });
    } catch (error: any) {
      console.error('Error creating and minting NFT:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the owner of an NFT
   */
  public async getOwnerOf(tokenId: string): Promise<string> {
    try {
      // Ensure we have a contract instance
      if (!this.contract) {
        await this.initializeContract();
        if (!this.contract) {
          throw new Error('Failed to initialize NFT contract');
        }
      }

      return await this.contract.ownerOf(tokenId);
    } catch (error: any) {
      console.error('Error getting owner of NFT:', error);
      throw error;
    }
  }

  /**
   * Get the metadata URI of an NFT
   */
  public async getTokenURI(tokenId: string): Promise<string> {
    try {
      // Ensure we have a contract instance
      if (!this.contract) {
        await this.initializeContract();
        if (!this.contract) {
          throw new Error('Failed to initialize NFT contract');
        }
      }

      return await this.contract.tokenURI(tokenId);
    } catch (error: any) {
      console.error('Error getting token URI:', error);
      throw error;
    }
  }
}
