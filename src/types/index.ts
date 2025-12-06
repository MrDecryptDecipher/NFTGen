// NFT Attribute
export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

// NFT Upload Form Data
export interface NFTUploadFormData {
  name: string;
  description: string;
  image: File;
  attributes: NFTAttribute[];
  royalties: number;
}

// NFT Status
export type NFTStatus = 'OWNED' | 'LISTED' | 'SOLD' | 'UNLISTED' | 'FRACTIONALIZED' | 'MINTED';

// NFT Fractionalization
export interface NFTFractions {
  id: string;
  supply: number;
  remaining: number;
  pricePerFraction: string;
}

// NFT Metadata
export interface NFTMetadata {
  attributes: NFTAttribute[];
  collection?: {
    name: string;
    family?: string;
  };
  rarity?: {
    score?: number;
    rank?: number;
    totalSupply?: number;
  };
  creator?: string;
  external_url?: string;
  animation_url?: string;
  properties?: Record<string, any>;
  tokenStandard?: string; // ERC721, ERC1155, etc.
}

// NFT Royalty
export interface NFTRoyalty {
  id: string;
  percentage: number;
  beneficiary: string;
}

// NFT Media
export interface NFTMedia {
  gateway: string;
  raw: string;
  format?: string;
  thumbnail?: string;
}

// NFT Base Interface
export interface NFT {
  id: string;
  name: string;
  image: string;
  description: string;
  owner: string;
  status: NFTStatus;
  contractAddress: string;
  tokenId: string;
  metadata: NFTMetadata;
  fractions?: NFTFractions;
  royalties?: NFTRoyalty;
  media?: NFTMedia[];
  createdAt?: string;
  updatedAt?: string;
  tokenType?: string;
  tokenUri?: {
    gateway: string;
    raw: string;
  };
}

// NFT Fractionalization Config
export interface NFTFractionalizationConfig {
  fractions: number;
  pricePerFraction: number;
}

// NFT Royalty Config
export interface NFTRoyaltyConfig {
  percentage: number;
  beneficiary: string;
}

// No need for re-export as these types are already exported above

export interface TransferEvent {
  from: string;
  to: string;
  tokenId: string;
  timestamp: number;
}

export interface Activity {
  type: 'TRANSFER' | 'LIST' | 'SALE' | 'FRACTIONALIZE';
  from: string;
  to?: string;
  tokenId: string;
  price?: number;
  timestamp: number;
}