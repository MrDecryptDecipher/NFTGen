import { Alchemy, Network, AssetTransfersCategory, AssetTransfersResult, Nft as AlchemyNft } from 'alchemy-sdk';
import { toast } from 'react-toastify';
import { formatIpfsUrl } from './utils';
import { NFT, TransferEvent } from '../types';

// Initialize Alchemy SDK
const config = {
  apiKey: process.env.VITE_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

export async function getNFTTransfers(address: string): Promise<TransferEvent[]> {
  try {
    const transfers = await alchemy.core.getAssetTransfers({
      fromBlock: "0x0",
      toAddress: address as `0x${string}`,
      excludeZeroValue: true,
      category: [
        AssetTransfersCategory.ERC721,
        AssetTransfersCategory.ERC1155
      ],
    });

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
  }>;
  rawMetadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<NFT | null> {
  try {
    const response = await alchemy.nft.getNftMetadata(
      contractAddress,
      tokenId
    ) as unknown as AlchemyMetadata;

    if (!response) {
      throw new Error('No metadata found');
    }

    // Convert Alchemy response to our NFT type
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
      owner: response.owner || '',
      status: 'UNLISTED',
      metadata: {
        attributes: response.rawMetadata?.attributes?.map(attr => ({
          trait_type: attr.trait_type,
          value: attr.value,
        })) || [],
      },
      media: response.media?.map(m => ({
        gateway: m.gateway || '',
        raw: m.raw || '',
      })) || [],
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
        pricePerFraction: 0, // This would need to be fetched from your contract
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

export async function getNFTsForOwner(ownerAddress: string): Promise<NFT[]> {
  try {
    const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
    
    const processedNFTs = await Promise.all(
      nfts.ownedNfts.map(async nft => {
        try {
          return await getNFTMetadata(
            nft.contract.address,
            nft.tokenId
          );
        } catch {
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

export function calculateTotalRoyalties(nfts: NFT[]): number {
  return nfts.reduce((sum, nft) => {
    const royaltyValue = typeof nft.royalties === 'object' && nft.royalties !== null
      ? nft.royalties.percentage
      : 0;
    return sum + royaltyValue;
  }, 0);
} 