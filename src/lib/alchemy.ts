import { Alchemy, Network, AssetTransfersCategory, AssetTransfersResult, Nft as AlchemyNft, NftTokenType } from 'alchemy-sdk';
import { toast } from 'react-toastify';
import { formatIpfsUrl } from './utils';
import { NFT, TransferEvent } from '../types';

// Import API key from constants
import { ALCHEMY_API_KEY } from '../config/constants';

// Initialize Alchemy SDK with proper configuration
const config = {
  apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || "_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5", // Use environment variable or fallback
  network: Network.ETH_SEPOLIA, // Using Sepolia for testing
  maxRetries: 5,
  requestTimeout: 30000 // 30 second timeout for better reliability
};

// Create a singleton instance for reuse
let alchemy: Alchemy;

try {
  alchemy = new Alchemy(config);
  console.log("Alchemy SDK initialized successfully with API key:", config.apiKey);
} catch (error) {
  console.error("Failed to initialize Alchemy SDK:", error);
  // Fallback to basic configuration if initialization fails
  alchemy = new Alchemy({
    apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || "_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5", // Use environment variable or fallback
    network: Network.ETH_SEPOLIA,
  });
  console.log("Alchemy SDK initialized with fallback configuration");
}

// Export the Alchemy SDK instance for use elsewhere
export { alchemy };

/**
 * Fetches NFT transfers for a specific address
 * @param address The address to fetch transfers for
 * @returns List of transfer events
 */
export async function getNFTTransfers(address: string): Promise<TransferEvent[]> {
  try {
    console.log(`Fetching NFT transfers for address: ${address}`);

    const transfers = await alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      toAddress: address as `0x${string}`,
      excludeZeroValue: true,
      category: [
        AssetTransfersCategory.ERC721,
        AssetTransfersCategory.ERC1155
      ],
      maxCount: 100,
      // Remove order parameter since it's causing type mismatch
    });

    console.log(`Found ${transfers.transfers.length} NFT transfers`);

    return transfers.transfers.map(transfer => ({
      hash: transfer.hash,
      from: transfer.from,
      to: transfer.to || transfer.from, // Ensure we always have a valid 'to' address
      tokenId: transfer.tokenId || '',
      timestamp: Date.now(), // Alchemy doesn't provide timestamp, using current time
      blockNumber: parseInt(transfer.blockNum),
      value: transfer.value?.toString() || '0',
      asset: transfer.rawContract ? {
        tokenId: transfer.tokenId || '',
        contractAddress: transfer.rawContract.address || '',
      } : undefined,
    }));
  } catch (error: any) {
    console.error('Error fetching NFT transfers:', error);
    toast.error('Failed to fetch NFT transfers');
    return [];
  }
}

interface AlchemyMetadata {
  name?: string;
  title?: string;
  description?: string;
  image?: string;
  owner?: string;
  media?: Array<{
    gateway?: string;
    raw?: string;
    format?: string;
    thumbnail?: string;
  }>;
  rawMetadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    creator?: string;
    artist?: string;
    external_url?: string;
    animation_url?: string;
    properties?: Record<string, any>;
  };
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
  contract?: {
    address?: string;
    tokenType?: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
  };
  rarity?: {
    score?: number;
    rank?: number;
  };
  tokenType?: string;
}

/**
 * Fetches NFT metadata for a specific token
 * @param contractAddress The contract address of the NFT
 * @param tokenId The token ID
 * @returns NFT object with metadata
 */
export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFT | null> {
  try {
    console.log(`Fetching NFT metadata for contract: ${contractAddress}, token: ${tokenId}`);

    // Use proper options for better results
    const response = await alchemy.nft.getNftMetadata(
      contractAddress,
      tokenId,
      {
        tokenType: 'ERC721' as NftTokenType,
        refreshCache: false, // Don't refresh cache for better performance
      }
    ) as unknown as AlchemyMetadata;

    if (!response) {
      throw new Error('No metadata found');
    }

    // Convert Alchemy response to our enhanced NFT type
    const nft: NFT = {
      id: `${contractAddress}-${tokenId}`,
      name: response.name || response.title || 'Unknown NFT',
      description: response.description || '',
      image: formatIpfsUrl(
        response.media?.[0]?.gateway ||
        response.media?.[0]?.raw ||
        response.image ||
        ''
      ),
      contractAddress: contractAddress,
      tokenId: tokenId,
      owner: response.owner || '',
      status: 'MINTED',
      metadata: {
        attributes: response.rawMetadata?.attributes?.map(attr => ({
          trait_type: attr.trait_type,
          value: attr.value,
        })) || [],
        collection: response.contract?.name ? {
          name: response.contract.name,
          family: response.contract.symbol || undefined
        } : undefined,
        creator: response.rawMetadata?.creator || response.rawMetadata?.artist || undefined,
        external_url: response.rawMetadata?.external_url || undefined,
        animation_url: response.rawMetadata?.animation_url || undefined,
        tokenStandard: response.contract?.tokenType || undefined,
        properties: response.rawMetadata?.properties || undefined,
      },
      media: response.media?.map(m => ({
        gateway: m.gateway || '',
        raw: m.raw || '',
        format: m.format || undefined,
        thumbnail: m.thumbnail || undefined
      })) || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tokenType: response.contract?.tokenType || undefined,
      tokenUri: response.tokenUri ? {
        gateway: response.tokenUri.gateway || '',
        raw: response.tokenUri.raw || ''
      } : undefined
    };

    // Extract fractions and royalties from attributes if they exist
    const fractionAttr = response.rawMetadata?.attributes?.find(
      attr => attr.trait_type === 'Fractions'
    );
    const royaltyAttr = response.rawMetadata?.attributes?.find(
      attr => attr.trait_type === 'Royalty' || attr.trait_type === 'Royalties'
    );

    if (fractionAttr) {
      nft.fractions = {
        id: `${nft.id}-fraction`,
        supply: Number(fractionAttr.value) || 0,
        remaining: Number(fractionAttr.value) || 0,
        pricePerFraction: '0', // This would need to be fetched from your contract
      };
    }

    if (royaltyAttr) {
      nft.royalties = {
        id: `${nft.id}-royalty`,
        percentage: Number(royaltyAttr.value) || 0,
        beneficiary: response.owner || '',
      };
    }

    return nft;
  } catch (error: any) {
    console.error('Error fetching NFT metadata:', error);
    toast.error('Failed to fetch NFT metadata');
    return null;
  }
}

/**
 * Fetches all NFTs owned by an address
 * @param ownerAddress The owner's address
 * @returns List of NFTs owned by the address
 */
export async function getNFTsForOwner(ownerAddress: string): Promise<NFT[]> {
  try {
    console.log(`Fetching NFTs for owner: ${ownerAddress}`);

    // Use pagination for better performance
    const nfts = await alchemy.nft.getNftsForOwner(
      ownerAddress,
      {
        pageSize: 100, // Limit results per page
        omitMetadata: false, // Include metadata for complete info
        // Remove excludeFilters parameter as it requires a paid plan
      }
    );

    console.log(`Found ${nfts.ownedNfts.length} NFTs for owner`);

    // Process all NFTs in parallel for better performance
    const processedNFTs = await Promise.all(
      nfts.ownedNfts.map(async nft => {
        try {
          // Use the data already provided in the response when possible with enhanced metadata
          return {
            id: `${nft.contract.address}-${nft.tokenId}`,
            name: nft.title || 'Unknown NFT',
            description: nft.description || '',
            image: formatIpfsUrl(nft.media?.[0]?.gateway || ''),
            contractAddress: nft.contract.address,
            tokenId: nft.tokenId,
            owner: ownerAddress,
            status: 'MINTED' as const,
            metadata: {
              attributes: nft.rawMetadata?.attributes?.map(attr => ({
                trait_type: attr.trait_type,
                value: attr.value,
              })) || [],
              collection: nft.contract?.name ? {
                name: nft.contract.name,
                family: nft.contract.symbol || undefined
              } : undefined,
              creator: nft.rawMetadata?.creator || nft.rawMetadata?.artist || undefined,
              external_url: nft.rawMetadata?.external_url || undefined,
              animation_url: nft.rawMetadata?.animation_url || undefined,
              tokenStandard: nft.tokenType || undefined,
              properties: nft.rawMetadata?.properties || undefined,
              rarity: nft.rarity ? {
                score: nft.rarity.score,
                rank: nft.rarity.rank,
                totalSupply: nft.contract?.totalSupply ? Number(nft.contract.totalSupply) : undefined
              } : undefined
            },
            media: nft.media?.map(m => ({
              gateway: m.gateway || '',
              raw: m.raw || '',
              format: m.format || undefined,
              thumbnail: m.thumbnail || undefined
            })) || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tokenType: nft.tokenType || undefined,
            tokenUri: nft.tokenUri ? {
              gateway: nft.tokenUri.gateway || '',
              raw: nft.tokenUri.raw || ''
            } : undefined
          } as NFT;
        } catch (error) {
          console.error(`Error processing NFT ${nft.contract.address}-${nft.tokenId}:`, error);
          return null;
        }
      })
    );

    return processedNFTs.filter((nft): nft is NFT => nft !== null);
  } catch (error: any) {
    console.error('Error fetching NFTs for owner:', error);
    toast.error('Failed to fetch NFTs');
    return [];
  }
}

/**
 * Calculates total royalties from a list of NFTs
 * @param nfts List of NFTs
 * @returns Total royalty percentage
 */
export function calculateTotalRoyalties(nfts: NFT[]): number {
  return nfts.reduce((sum, nft) => {
    const royaltyValue = typeof nft.royalties === 'object' && nft.royalties !== null
      ? nft.royalties.percentage
      : 0;
    return sum + royaltyValue;
  }, 0);
}