// NFT Attribute
export interface NFTAttribute {
  trait_type: string;
  value: string;
}

// NFT Upload Form Data
export interface NFTUploadFormData {
  name: string;
  description: string;
  file: File;
  fractions: number;
  royaltyPercentage: number;
  royaltyBeneficiary: string;
  attributes: NFTAttribute[];
}

// NFT Status
export type NFTStatus = 'LISTED' | 'SOLD' | 'UNLISTED' | 'FRACTIONALIZED';

// NFT Fractionalization
export interface NFTFractions {
  id: string;
  supply: number;
  remaining: number;
  available: number;
  pricePerFraction: string;
  minimumPurchase: number;
}

// NFT Metadata
export interface NFTMetadata {
  attributes: NFTAttribute[];
}

// NFT Royalty
export interface NFTRoyalty {
  id: string;
  percentage: number;
  beneficiary: string;
}

// NFT Base Interface
export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  status: NFTStatus;
  fractions: NFTFractions;
  royalties: NFTRoyalty;
  metadata: NFTMetadata;
}

// NFT Fractionalization Config
export interface NFTFractionalizationConfig {
  supply: number;
  pricePerFraction: string;
  minimumPurchase: number;
}

// NFT Royalty Config
export interface NFTRoyaltyConfig {
  percentage: number;
  beneficiary: string;
}

// Export all types
export type {
  NFTAttribute,
  NFTUploadFormData,
  NFTStatus,
  NFTFractions,
  NFTMetadata,
  NFTRoyalty,
  NFT,
  NFTFractionalizationConfig,
  NFTRoyaltyConfig,
}; 