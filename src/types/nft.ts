/**
 * NFT Asset information
 */
export interface NFTAsset {
  imageUrl: string;
  metadataUrl: string;
  name?: string;
}

/**
 * NFT Details
 */
export interface NFTDetails {
  name: string;
  description: string;
  fractions: number;
  royaltyFee: number;
  asset: NFTAsset;
  status?: string;
  timestamp?: number;
  confirmationTime?: number;
}

/**
 * NFT Activity types
 */
export type NFTActivityType = 'mint' | 'transfer' | 'fractionalize' | 'sell' | 'buy';

/**
 * NFT Activity status
 */
export type NFTActivityStatus = 'pending' | 'success' | 'failed';

/**
 * NFT Activity
 */
export interface NFTActivity {
  type: NFTActivityType;
  hash: string;
  status: NFTActivityStatus;
  timestamp?: number;

  // Optional fields that might be in various activity types
  tokenId?: string;
  tokenURI?: string;
  to?: string;
  from?: string;
  name?: string;
  description?: string;
  image?: string;
  price?: string;
  quantity?: number;

  // Fields for compatibility with NFTGen
  id?: string;
  transactionHash?: string;
  externalUrl?: string;
  nftgenUrl?: string;

  // Fields for Nwallet integration
  details?: {
    name?: string;
    tokenId?: string;
    asset?: {
      imageUrl?: string;
      metadataUrl?: string;
    };
    fractions?: number;
    royaltyFee?: number;
  };
  source?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * NFT type for rendering
 */
export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  creator: string;
  tokenURI?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * NFT collection
 */
export interface NFTCollection {
  id: string;
  name: string;
  description: string;
  image: string;
  nfts: NFT[];
  owner: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * NFT mint request payload
 */
export interface NFTMintRequest {
  name: string;
  description?: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  recipient: string;
}

/**
 * NFT mint response
 */
export interface NFTMintResponse {
  tokenId: string;
  hash: string;
  tokenURI: string;
  success: boolean;
  error?: string;
}

/**
 * NFT Fractionalization
 */
export interface NFTFractionalizationRequest {
  nftId: string;
  supply: number;
  pricePerFraction: number;
  minimumPurchase: number;
}

export interface NFTFractionalizationResponse {
  nftId: string;
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * NFT Fraction Purchase
 */
export interface NFTFractionPurchaseRequest {
  nftId: string;
  amount: number;
}

export interface NFTFractionPurchaseResponse {
  nftId: string;
  amount: number;
  success: boolean;
  transactionHash?: string;
  error?: string;
}