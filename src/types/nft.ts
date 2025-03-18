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
export type NFTActivityType = 'mint' | 'transfer' | 'sale' | 'burn';

/**
 * NFT Activity status
 */
export type NFTActivityStatus = 'pending' | 'confirmed' | 'failed';

/**
 * NFT Activity
 */
export interface NFTActivity {
  type: NFTActivityType;
  hash: string;
  status: NFTActivityStatus;
  timestamp: number;
  details: NFTDetails;
} 