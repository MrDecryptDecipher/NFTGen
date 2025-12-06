/**
 * NFT Data Persistence Utility
 * 
 * This utility provides robust storage and retrieval of NFT data
 * with multiple fallback mechanisms to prevent data loss.
 */

import { getStorageItem, setStorageItem, hasStorageItem } from './safeStorage';

export interface NFTData {
  id: string;
  name: string;
  description: string;
  image: string;
  owner: string;
  creator: string;
  contractAddress: string;
  tokenId: string;
  transactionHash?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tokenURI?: string;
  royalties?: number;
  fractions?: number;
  ipfsUrl?: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

/**
 * Enhanced NFT storage with multiple redundant keys
 */
export function storeNFTData(nftData: NFTData): void {
  try {
    const nftJson = JSON.stringify(nftData);
    const timestamp = Date.now();
    
    // Store with multiple keys for redundancy
    const storageKeys = [
      `nft_data_${nftData.id}`,
      `nft_token_${nftData.id}`,
      `nftgen_nft_${nftData.id}`,
      `nft_backup_${nftData.id}_${timestamp}`
    ];
    
    storageKeys.forEach(key => {
      setStorageItem(key, nftJson);
    });
    
    // Store image data separately if it's a data URL
    if (nftData.image && nftData.image.startsWith('data:')) {
      const imageKeys = [
        `ipfs_data_${nftData.id}`,
        `nft_image_data_${nftData.id}`,
        `nftgen_image_data_${nftData.id}`,
        `image_backup_${nftData.id}_${timestamp}`
      ];
      
      imageKeys.forEach(key => {
        setStorageItem(key, nftData.image);
      });
    }
    
    // Store in user collection
    const userNftsKey = `user_nfts_${nftData.owner.toLowerCase()}`;
    const existingNfts = getUserNFTs(nftData.owner);
    const updatedNfts = existingNfts.filter(nft => nft.id !== nftData.id);
    updatedNfts.push(nftData);
    setStorageItem(userNftsKey, JSON.stringify(updatedNfts));
    
    // Store in global collection
    const globalNftsKey = 'nftgen_local_nfts';
    const globalNfts = getGlobalNFTs();
    const updatedGlobalNfts = globalNfts.filter(nft => nft.id !== nftData.id);
    updatedGlobalNfts.push(nftData);
    setStorageItem(globalNftsKey, JSON.stringify(updatedGlobalNfts));
    
    console.log(`✅ NFT data stored with ${storageKeys.length} redundant keys`);
  } catch (error) {
    console.error('Error storing NFT data:', error);
    throw error;
  }
}

/**
 * Retrieve NFT data with fallback mechanisms
 */
export function getNFTData(nftId: string): NFTData | null {
  try {
    // Try multiple storage keys
    const storageKeys = [
      `nft_data_${nftId}`,
      `nft_token_${nftId}`,
      `nftgen_nft_${nftId}`
    ];
    
    for (const key of storageKeys) {
      const nftJson = getStorageItem(key);
      if (nftJson) {
        const nftData = JSON.parse(nftJson);
        console.log(`✅ Found NFT data with key: ${key}`);
        return nftData;
      }
    }
    
    // Try backup keys
    const allKeys = getAllStorageKeys();
    const backupKeys = allKeys.filter(key => key.startsWith(`nft_backup_${nftId}_`));
    
    if (backupKeys.length > 0) {
      // Use the most recent backup
      const sortedBackupKeys = backupKeys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA;
      });
      
      const backupData = getStorageItem(sortedBackupKeys[0]);
      if (backupData) {
        const nftData = JSON.parse(backupData);
        console.log(`✅ Recovered NFT data from backup: ${sortedBackupKeys[0]}`);
        return nftData;
      }
    }
    
    console.log(`❌ No NFT data found for ID: ${nftId}`);
    return null;
  } catch (error) {
    console.error('Error retrieving NFT data:', error);
    return null;
  }
}

/**
 * Get user's NFT collection
 */
export function getUserNFTs(ownerAddress: string): NFTData[] {
  try {
    // Clear any mock data first
    clearMockData();

    const userNftsKey = `user_nfts_${ownerAddress.toLowerCase()}`;
    const nftsJson = getStorageItem(userNftsKey);

    if (nftsJson) {
      const nfts = JSON.parse(nftsJson);
      // Filter out any mock NFTs
      const realNfts = nfts.filter((nft: NFTData) =>
        !nft.id.includes('68211a82') &&
        !nft.name?.toLowerCase().includes('vande') &&
        !nft.name?.toLowerCase().includes('mataram') &&
        !nft.image?.includes('Flag_of_India')
      );
      return realNfts;
    }

    return [];
  } catch (error) {
    console.error('Error retrieving user NFTs:', error);
    return [];
  }
}

/**
 * Clear mock data from localStorage
 */
function clearMockData(): void {
  try {
    const keys = Object.keys(localStorage);
    const mockKeys = keys.filter(key => {
      const value = localStorage.getItem(key);
      return key.includes('68211a82') ||
             key.includes('vande') ||
             key.includes('mataram') ||
             value?.includes('Flag_of_India') ||
             value?.includes('Vande Mataram') ||
             value?.includes('68211a82');
    });

    if (mockKeys.length > 0) {
      console.log('Clearing mock data keys:', mockKeys);
      mockKeys.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Error clearing mock data:', error);
  }
}

/**
 * Get all NFTs from global collection
 */
export function getGlobalNFTs(): NFTData[] {
  try {
    const globalNftsKey = 'nftgen_local_nfts';
    const nftsJson = getStorageItem(globalNftsKey);

    if (nftsJson) {
      const nfts = JSON.parse(nftsJson);
      // Filter out any mock NFTs
      const realNfts = nfts.filter((nft: NFTData) =>
        !nft.id.includes('68211a82') &&
        !nft.name?.toLowerCase().includes('vande') &&
        !nft.name?.toLowerCase().includes('mataram') &&
        !nft.image?.includes('Flag_of_India')
      );
      return realNfts;
    }

    return [];
  } catch (error) {
    console.error('Error retrieving global NFTs:', error);
    return [];
  }
}

/**
 * Get all storage keys (fallback implementation)
 */
function getAllStorageKeys(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return Object.keys(localStorage);
    }
    return [];
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
}

/**
 * Restore NFT data from any available source
 */
export function restoreNFTData(nftId: string): NFTData | null {
  console.log(`🔄 Attempting to restore NFT data for ID: ${nftId}`);
  
  // First try normal retrieval
  const nftData = getNFTData(nftId);
  if (nftData) {
    return nftData;
  }
  
  // Try to find in user collections
  const allKeys = getAllStorageKeys();
  const userNftKeys = allKeys.filter(key => key.startsWith('user_nfts_'));
  
  for (const key of userNftKeys) {
    try {
      const userNftsJson = getStorageItem(key);
      if (userNftsJson) {
        const userNfts = JSON.parse(userNftsJson);
        const foundNft = userNfts.find((nft: NFTData) => nft.id === nftId);
        if (foundNft) {
          console.log(`✅ Restored NFT from user collection: ${key}`);
          // Re-store with proper keys
          storeNFTData(foundNft);
          return foundNft;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  // Try global collection
  const globalNfts = getGlobalNFTs();
  const foundInGlobal = globalNfts.find(nft => nft.id === nftId);
  if (foundInGlobal) {
    console.log(`✅ Restored NFT from global collection`);
    storeNFTData(foundInGlobal);
    return foundInGlobal;
  }
  
  console.log(`❌ Could not restore NFT data for ID: ${nftId}`);
  return null;
}

export default {
  storeNFTData,
  getNFTData,
  getUserNFTs,
  getGlobalNFTs,
  restoreNFTData
};
