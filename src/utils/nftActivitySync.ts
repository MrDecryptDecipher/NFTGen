/**
 * NFT Activity Synchronization with Nija Wallet
 *
 * This module provides functions for synchronizing NFT activities
 * (especially minting) with Nija Wallet.
 *
 * It also handles local storage of NFT activities for history and gallery display.
 */

// Constants
const NFT_CONTRACT_ADDRESS = '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A';

import { syncActivityToNijaWallet } from './activitySync';
import { NFTActivity } from '../types/nft';

// Define the mint completion result type
export interface MintCompletionResult {
  transactionHash?: string;
  tokenId?: string;
  id?: string;
}

// Extended NFTActivity interface to handle both NFTGen and Nwallet formats
interface ExtendedNFTActivity extends Omit<NFTActivity, 'timestamp' | 'status'> {
  id?: string;
  hash: string;
  externalUrl?: string;
  nftgenUrl?: string;
  transactionHash?: string;
  contractAddress?: string;
  tokenURI?: string;
  status?: 'pending' | 'success' | 'failed' | string;
  source?: string;
  timestamp: number | string | undefined;
  details?: {
    name?: string;
    asset?: {
      imageUrl?: string;
      metadataUrl?: string;
    };
    fractions?: number;
    royaltyFee?: number;
    tokenId?: string;
  };
}

/**
 * Synchronize all existing NFT activities with Nwallet
 * Call this function when connecting to Nwallet to ensure all activities are synced
 */
export function syncAllActivitiesWithNwallet(): ExtendedNFTActivity[] {
  try {
    console.log('Synchronizing all NFT activities with Nwallet...');

    // Get all localStorage keys
    const keys = Object.keys(localStorage);

    // Filter keys that start with 'nftgen_tx_' but don't end with '_nwallet'
    const activityKeys = keys.filter(key =>
      key.startsWith('nftgen_tx_') && !key.endsWith('_nwallet')
    );

    console.log('Found NFT activity keys to sync:', activityKeys);

    // Parse activities from localStorage and convert to Nwallet format
    const activities: ExtendedNFTActivity[] = [];

    activityKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');

        if (data) {
          // Generate a consistent tokenId for gallery linking
          const tokenId = data.tokenId ||
                         (data.id ? (data.id.length > 8 ? data.id.substring(0, 8) : data.id) : null) ||
                         key.replace('nftgen_tx_', '').substring(0, 8);

          // Generate hash if needed
          const hash = data.hash || (data.id && data.id.startsWith('0x') ? data.id : `0x${data.id || key.replace('nftgen_tx_', '')}`);

          // Create a proper gallery URL
          const galleryUrl = `http://${window.location.hostname}:7103/gallery/${tokenId}`;

          // Check if the activity already has the Nwallet-compatible format
          if (!data.hash || !data.details) {
            // Create a combined format that works for both NFTGen and Nwallet
            const updatedData: ExtendedNFTActivity = {
              ...data,
              hash,
              tokenId,
              id: data.id || key.replace('nftgen_tx_', ''),
              status: data.status === 'success' ? 'confirmed' :
                     data.status === 'pending' ? 'pending' : 'failed',
              externalUrl: data.externalUrl || galleryUrl,
              nftgenUrl: galleryUrl,
              details: {
                name: data.name || 'NFT',
                tokenId,
                asset: {
                  imageUrl: data.image || '',
                  metadataUrl: data.tokenURI || ''
                },
                fractions: 1,
                royaltyFee: 2.5
              },
              source: 'nftgen'
            };

            // Update the activity in localStorage with the combined format
            localStorage.setItem(key, JSON.stringify(updatedData));

            // Add to activities array
            activities.push(updatedData);

            console.log(`Updated activity ${data.id || tokenId} with Nwallet-compatible format`);
          } else {
            // Activity already has the correct format, ensure it has tokenId and externalUrl
            const existingData = {...data};

            if (!existingData.tokenId) {
              existingData.tokenId = tokenId;
            }

            if (!existingData.externalUrl) {
              existingData.externalUrl = galleryUrl;
            }

            if (!existingData.source) {
              existingData.source = 'nftgen';
            }

            if (existingData.details && !existingData.details.tokenId) {
              existingData.details.tokenId = tokenId;
            }

            // Update the activity in localStorage if we made changes
            if (JSON.stringify(existingData) !== JSON.stringify(data)) {
              localStorage.setItem(key, JSON.stringify(existingData));
              console.log(`Enhanced existing activity ${existingData.id || tokenId} with proper format`);
            }

            activities.push(existingData as ExtendedNFTActivity);
          }
        }
      } catch (e) {
        console.error(`Error syncing activity from localStorage key ${key}:`, e);
      }
    });

    // If we found any activities, update the latest activity
    if (activities.length > 0) {
      // Sort by timestamp (newest first)
      activities.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : Number(a.timestamp);
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : Number(b.timestamp);
        return timeB - timeA;
      });

      // Get the latest activity
      const latestActivity = activities[0];

      // Store the latest activity for Nwallet
      localStorage.setItem('nftgen_latest_activity', JSON.stringify(latestActivity));

      console.log(`Set latest activity for Nwallet: ${latestActivity.id || latestActivity.hash}`);

      // Dispatch event for Nwallet integration
      const nijaWalletActivityEvent = new CustomEvent('nija_wallet_activity_update', {
        detail: latestActivity
      });
      window.dispatchEvent(nijaWalletActivityEvent);

      // Also sync to Nwallet using window.localStorage
      // This is a more reliable way to pass data between the apps
      try {
        // Store each activity in Nwallet-compatible localStorage format
        activities.forEach(activity => {
          const nwalletKey = `nftgen_tx_${activity.hash}_nwallet`;
          localStorage.setItem(nwalletKey, JSON.stringify(activity));
        });
      } catch (storageError) {
        console.error('Error storing activities for Nwallet:', storageError);
      }
    }

    return activities;
  } catch (error) {
    console.error('Error synchronizing activities with Nwallet:', error);
    return [];
  }
}

export function loadNFTActivitiesFromLocalStorage(address?: string): ExtendedNFTActivity[] {
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);

    // Filter keys that start with 'nftgen_tx_'
    const activityKeys = keys.filter(key => key.startsWith('nftgen_tx_'));

    console.log('Found activity keys in localStorage:', activityKeys);

    // Parse activities from localStorage
    const activities = activityKeys
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');

          // If address is provided, filter by address
          if (address && data.to !== address) {
            return null;
          }

          const activity: ExtendedNFTActivity = {
            id: data.id || key.replace('nftgen_tx_', ''),
            hash: data.hash || data.id || key.replace('nftgen_tx_', ''),
            type: data.type || 'mint',
            tokenId: data.tokenId || data.id?.substring(0, 8) || '',
            name: data.name || 'Untitled NFT',
            description: data.description || '',
            image: data.image || '/placeholder-nft.png',
            from: data.from || '0x0000000000000000000000000000000000000000',
            to: data.to || '',
            price: data.price,
            timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
            transactionHash: data.transactionHash || data.id || '',
            tokenURI: data.tokenURI || '',
            status: data.status || 'success'
          };

          return activity;
        } catch (e) {
          console.error(`Error parsing activity from localStorage key ${key}:`, e);
          return null;
        }
      })
      .filter(Boolean) as ExtendedNFTActivity[];

    // Sort by timestamp (newest first)
    activities.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : Number(a.timestamp);
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : Number(b.timestamp);
      return timeB - timeA;
    });

    return activities;
  } catch (error) {
    console.error('Error loading activities from localStorage:', error);
    return [];
  }
}

/**
 * Synchronize NFT minting activity with Nija Wallet
 *
 * Call this function after minting an NFT to ensure it's recorded in Nija Wallet
 *
 * @param hash Transaction hash
 * @param tokenId TokenId of the minted NFT
 * @param tokenURI IPFS URI of the NFT metadata
 * @param recipientAddress Address that received the NFT
 * @param metadata NFT metadata (name, description, image)
 * @returns Promise resolving to true if sync was successful
 */
export async function syncNFTMintToNijaWallet(
  hash: string,
  tokenId: string,
  tokenURI: string,
  recipientAddress: string,
  metadata: {
    name: string;
    description: string;
    image: string;
  }
): Promise<boolean> {
  console.log(`Syncing NFT mint activity to Nija Wallet: ${hash}`);

  try {
    // Create activity object in the format expected by Nija Wallet
    const activity: ExtendedNFTActivity = {
      type: 'mint',
      hash,
      id: tokenId,
      tokenId,
      tokenURI,
      to: recipientAddress,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      timestamp: Date.now(),
      status: 'success'
    };

    // Sync the activity to Nija Wallet
    // Convert to NFTActivity to satisfy type constraints
    // Use type assertion to bypass type checking
    const nftActivity = {
      type: activity.type,
      hash: activity.hash,
      status: activity.status || 'success',
      timestamp: typeof activity.timestamp === 'string'
        ? new Date(activity.timestamp).getTime()
        : activity.timestamp as number,
      tokenId: activity.tokenId,
      name: activity.name,
      description: activity.description,
      image: activity.image,
      from: activity.from,
      to: activity.to,
      transactionHash: activity.transactionHash,
      contractAddress: activity.contractAddress
    } as NFTActivity;

    const success = await syncActivityToNijaWallet(nftActivity);

    if (success) {
      console.log('Successfully synced mint activity to Nija Wallet');
      return true;
    } else {
      console.warn('Failed to sync mint activity to Nija Wallet');
      return false;
    }
  } catch (error) {
    console.error('Error syncing mint activity to Nija Wallet:', error);
    return false;
  }
}

/**
 * Handle minting complete and sync with Nija Wallet
 *
 * This function can be called after a successful mint to both notify the user and
 * synchronize the activity with Nija Wallet.
 *
 * @param response Mint response from the backend API
 * @param tokenURI IPFS URI of the NFT metadata
 * @param metadata NFT metadata
 * @param recipientAddress Address that received the NFT
 */
export async function handleMintComplete(
  response: MintCompletionResult,
  tokenURI: string,
  metadata: {
    name: string;
    description: string;
    image: string;
  },
  recipientAddress: string
): Promise<void> {
  console.log('Mint completed successfully:', response);

  try {
    // Create a unique ID for the activity
    const id = response.transactionHash || `local-${Date.now().toString(16)}`;
    const hash = id.startsWith('0x') ? id : `0x${id}`;
    const timestamp = Date.now();

    // Create a reliable tokenId for the NFT to ensure proper linking
    // Prefer using the tokenId from the response if available
    let uniqueId = '';
    if (response.tokenId && response.tokenId.length > 0) {
      uniqueId = response.tokenId;
    } else if (response.id && response.id.length > 0) {
      uniqueId = response.id;
    } else {
      // Create a standard format token ID with fixed length for consistency
      uniqueId = id.substring(0, 8);
    }

    // Create NFTGen gallery URL with the unique ID
    const nftgenUrl = `http://${window.location.hostname}:7103/gallery/${uniqueId}`;

    // Create Nwallet-compatible activity format that will work with both NFTGen and Nwallet
    const activityData: ExtendedNFTActivity = {
      // Fields needed by NFTGen
      id,
      type: 'mint',
      tokenId: uniqueId,
      name: metadata.name,
      image: metadata.image,
      from: '0x0000000000000000000000000000000000000000',
      to: recipientAddress,
      timestamp,
      transactionHash: response.transactionHash || id,
      tokenURI,
      description: metadata.description,
      status: 'success',
      nftgenUrl, // Add the NFTGen gallery URL
      contractAddress: NFT_CONTRACT_ADDRESS, // Add the contract address

      // Fields needed by Nwallet
      hash,
      details: {
        name: metadata.name,
        tokenId: uniqueId,
        asset: {
          imageUrl: metadata.image,
          metadataUrl: tokenURI
        },
        fractions: 1,
        royaltyFee: 2.5
      },
      externalUrl: nftgenUrl, // Use consistent naming for the URL
      source: 'nftgen'
    };

    // Store the image URL with a consistent key pattern that all components can find
    // This is critical for image display in the History and Gallery components
    localStorage.setItem(`nft_image_${uniqueId}`, metadata.image);

    // Also store with the transaction-specific key pattern used by the image utility
    localStorage.setItem(`nft_image_tx_${uniqueId}`, metadata.image);

    // Store NFT activity in localStorage with the key format that Nwallet expects
    const activityKey = `nftgen_tx_${id}`;
    localStorage.setItem(activityKey, JSON.stringify(activityData));

    // Also store with a special key that Nwallet will prioritize
    const nwalletKey = `nftgen_tx_${hash}_nwallet`;
    localStorage.setItem(nwalletKey, JSON.stringify(activityData));

    // Also store as latest activity for Nwallet
    localStorage.setItem('nftgen_latest_activity', JSON.stringify(activityData));

    // Dispatch an event to notify NFTGen components
    const activityEvent = new CustomEvent('nftgen_activity_update', {
      detail: activityData
    });
    window.dispatchEvent(activityEvent);

    // Dispatch event for Nwallet integration
    const nijaWalletActivityEvent = new CustomEvent('nija_wallet_activity_update', {
      detail: activityData
    });
    window.dispatchEvent(nijaWalletActivityEvent);

    console.log('NFT activity stored in localStorage for both NFTGen and Nwallet:', activityKey, activityData);

    // Send activity to Nwallet via WebSocket if possible
    try {
      // Check if WebSocket is defined (from activitySync.js)
      if (typeof window !== 'undefined' && window.nftGenWalletWs && window.nftGenWalletWs.readyState === WebSocket.OPEN) {
        window.nftGenWalletWs.send(JSON.stringify({
          type: 'NFT_ACTIVITY',
          data: activityData,
          timestamp: Date.now()
        }));
        console.log('Sent NFT activity to Nwallet via WebSocket');
      }
    } catch (wsError) {
      console.warn('Failed to send NFT activity via WebSocket:', wsError);
    }
  } catch (storageError) {
    console.warn('Failed to store NFT activity in localStorage:', storageError);
  }
}
