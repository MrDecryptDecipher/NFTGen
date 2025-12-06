import { Alchemy, Network, Wallet, Utils } from 'alchemy-sdk';
import { ethers } from 'ethers';

// Alchemy configuration
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5';
const NETWORK = Network.ETH_SEPOLIA;

// Initialize Alchemy
const settings = {
  apiKey: ALCHEMY_API_KEY,
  network: NETWORK,
};

const alchemy = new Alchemy(settings);

// Contract configuration
const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A';
const CONTRACT_ABI = [
  // ERC1155 standard functions
  "function mintNFT(address recipient, uint256 amount, string memory tokenURI, tuple(string name, string description, string image, string external_url, string[] attributes) memory metadata) public returns (uint256)",
  "function balanceOf(address account, uint256 id) public view returns (uint256)",
  "function uri(uint256 id) public view returns (string memory)",
  "function getCurrentTokenId() public view returns (uint256)",
  "function getTokenMetadata(uint256 tokenId) public view returns (tuple(string name, string description, string image, string external_url, string[] attributes))",
  "function owner() public view returns (address)",
  "function supportsInterface(bytes4 interfaceId) public view returns (bool)"
];

export interface MintNFTParams {
  recipientAddress: string;
  amount?: number;
  tokenURI: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes?: string[];
  };
}

export interface MintResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  error?: string;
}

export interface NFTData {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  tokenUri: string;
  balance: string;
}

/**
 * Get Alchemy provider for Sepolia network
 */
export function getAlchemyProvider() {
  return alchemy.core;
}

/**
 * Get contract instance
 */
export function getContract(signerOrProvider?: any) {
  const provider = signerOrProvider || new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
  return new ethers.Contract(NFT_CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Mint NFT using Alchemy and smart contract
 */
export async function mintNFT(params: MintNFTParams, privateKey?: string): Promise<MintResult> {
  try {
    console.log('Minting NFT with Alchemy...', params);

    if (!privateKey) {
      throw new Error('Private key required for minting');
    }

    // Create wallet with private key (Ethers.js v6 syntax)
    const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get contract instance with signer
    const contract = getContract(wallet);

    // Prepare metadata tuple
    const metadataTuple = [
      params.metadata.name,
      params.metadata.description,
      params.metadata.image,
      params.metadata.external_url || '',
      params.metadata.attributes || []
    ];

    // Call mint function
    const tx = await contract.mintNFT(
      params.recipientAddress,
      params.amount || 1,
      params.tokenURI,
      metadataTuple
    );

    console.log('Transaction submitted:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);

    // Extract token ID from events
    let tokenId = '';
    if (receipt.events && receipt.events.length > 0) {
      const mintEvent = receipt.events.find((event: any) => event.event === 'TokenMinted');
      if (mintEvent && mintEvent.args) {
        tokenId = mintEvent.args.tokenId.toString();
      }
    }

    return {
      success: true,
      tokenId,
      transactionHash: tx.hash
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get NFTs owned by an address
 */
export async function getNFTsForOwner(ownerAddress: string): Promise<NFTData[]> {
  try {
    console.log('Getting NFTs for owner:', ownerAddress);

    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
      contractAddresses: [NFT_CONTRACT_ADDRESS]
    });

    const nftData: NFTData[] = nfts.ownedNfts.map((nft: any) => ({
      tokenId: nft.tokenId,
      name: nft.title || nft.name || 'Unnamed NFT',
      description: nft.description || '',
      image: nft.media?.[0]?.gateway || nft.rawMetadata?.image || nft.image || '',
      tokenUri: nft.tokenUri?.gateway || nft.tokenUri || '',
      balance: nft.balance || '1'
    }));

    console.log('Found NFTs:', nftData);
    return nftData;
  } catch (error) {
    console.error('Error getting NFTs for owner:', error);
    return [];
  }
}

/**
 * Get NFT metadata by token ID
 */
export async function getNFTMetadata(tokenId: string): Promise<NFTData | null> {
  try {
    console.log('Getting NFT metadata for token:', tokenId);

    const nft = await alchemy.nft.getNftMetadata(NFT_CONTRACT_ADDRESS, tokenId);

    if (!nft) {
      return null;
    }

    return {
      tokenId: nft.tokenId,
      name: (nft as any).title || (nft as any).name || 'Unnamed NFT',
      description: (nft as any).description || '',
      image: (nft as any).media?.[0]?.gateway || (nft as any).rawMetadata?.image || (nft as any).image || '',
      tokenUri: (nft as any).tokenUri?.gateway || (nft as any).tokenUri || '',
      balance: '1' // Default for ERC1155
    };
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    return null;
  }
}

/**
 * Check if address owns a specific NFT
 */
export async function checkNFTOwnership(ownerAddress: string, tokenId: string): Promise<boolean> {
  try {
    const contract = getContract();
    const balance = await contract.balanceOf(ownerAddress, tokenId);
    return balance.gt(0);
  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    return false;
  }
}

/**
 * Get current token ID from contract
 */
export async function getCurrentTokenId(): Promise<number> {
  try {
    const contract = getContract();
    const tokenId = await contract.getCurrentTokenId();
    return tokenId.toNumber();
  } catch (error) {
    console.error('Error getting current token ID:', error);
    return 0;
  }
}

/**
 * Verify contract deployment
 */
export async function verifyContract(): Promise<boolean> {
  try {
    const contract = getContract();
    const owner = await contract.owner();
    console.log('Contract owner:', owner);
    return !!owner;
  } catch (error) {
    console.error('Error verifying contract:', error);
    return false;
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(txHash: string) {
  try {
    const receipt = await alchemy.core.getTransactionReceipt(txHash);
    return {
      status: receipt?.status === 1 ? 'success' : 'failed',
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString()
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { status: 'unknown' };
  }
}

export default {
  getAlchemyProvider,
  getContract,
  mintNFT,
  getNFTsForOwner,
  getNFTMetadata,
  checkNFTOwnership,
  getCurrentTokenId,
  verifyContract,
  getTransactionStatus
};
