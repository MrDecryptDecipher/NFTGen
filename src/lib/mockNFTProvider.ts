/**
 * Mock NFT Provider - DISABLED
 *
 * This module has been disabled to enforce real data usage only.
 * All mock data functionality has been removed.
 */

import { NFT } from '../types';

// Mock data has been disabled - use real Alchemy API data only

/**
 * Mock functions disabled - use real Alchemy API data only
 */
export function getMockNFTs(_ownerAddress: string): NFT[] {
  throw new Error('Mock NFT data has been disabled. Use real Alchemy API data only.');
}

export function getMockNFTById(_id: string, _ownerAddress: string): NFT | null {
  throw new Error('Mock NFT data has been disabled. Use real Alchemy API data only.');
}

export function createMockNFT(
  _name: string,
  _description: string,
  _imageUrl: string,
  _ownerAddress: string
): NFT {
  throw new Error('Mock NFT creation has been disabled. Use real NFT minting only.');
}

export function getStoredNFTs(_ownerAddress: string): NFT[] {
  throw new Error('Mock NFT data has been disabled. Use real Alchemy API data only.');
}

export function getAllNFTs(_ownerAddress: string): NFT[] {
  throw new Error('Mock NFT data has been disabled. Use real Alchemy API data only.');
}

export default {
  getMockNFTs,
  getMockNFTById,
  createMockNFT,
  getStoredNFTs,
  getAllNFTs
};
