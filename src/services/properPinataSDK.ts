/**
 * Comprehensive Pinata SDK Service
 * Following official Pinata documentation exactly with all features
 * Implements: File uploads, JSON uploads, Signed URLs, Metadata, Groups, Gateway operations
 */

import { PinataSDK } from 'pinata';

// Initialize Pinata SDK according to documentation
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT || '',
  pinataGateway: import.meta.env.VITE_PINATA_GATEWAY || 'rose-accepted-puma-897.mypinata.cloud'
});

// Types for Pinata operations
interface UploadOptions {
  name?: string;
  keyvalues?: Record<string, string>;
  groupId?: string;
}

interface SignedURLOptions {
  expires?: number; // seconds
}

/**
 * Convert IPFS CID to gateway URL using official Pinata SDK
 * Following documentation: pinata.gateways.public.convert(cid)
 */
export const convertCIDToURL = async (cid: string): Promise<string> => {
  try {
    // Extract CID from various formats
    let cleanCID = cid;

    // Handle IPFS URLs
    if (cid.startsWith('ipfs://')) {
      cleanCID = cid.replace('ipfs://', '');
    }

    // Handle gateway URLs - extract CID
    const ipfsMatch = cid.match(/\/ipfs\/([^/?]+)/);
    if (ipfsMatch) {
      cleanCID = ipfsMatch[1];
    }

    // Use official Pinata SDK method as documented
    const url = await pinata.gateways.public.convert(cleanCID);
    return url;
  } catch (error) {
    console.error('Error converting CID to URL:', error);
    // Fallback to direct gateway URL construction
    const cleanCID = cid.replace(/^(ipfs:\/\/|.*\/ipfs\/)/, '');
    return `https://${import.meta.env.VITE_PINATA_GATEWAY}/ipfs/${cleanCID}`;
  }
};

/**
 * Get file data from IPFS using official Pinata SDK
 * Following documentation: pinata.gateways.public.get(cid)
 */
export const getIPFSData = async (cid: string) => {
  try {
    const cleanCID = cid.replace(/^(ipfs:\/\/|.*\/ipfs\/)/, '');
    const data = await pinata.gateways.public.get(cleanCID);
    return data;
  } catch (error) {
    console.error('Error getting IPFS data:', error);
    throw error;
  }
};

/**
 * Upload file using official Pinata SDK with metadata support
 * Following documentation: pinata.upload.public.file(file).name().keyvalues()
 */
export const uploadFile = async (file: File, options?: UploadOptions) => {
  try {
    let upload = pinata.upload.public.file(file);

    // Add metadata if provided (following docs pattern)
    if (options?.name) {
      upload = upload.name(options.name);
    }

    if (options?.keyvalues) {
      upload = upload.keyvalues(options.keyvalues);
    }

    if (options?.groupId) {
      upload = upload.group(options.groupId);
    }

    const result = await upload;
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Upload JSON data using official Pinata SDK with metadata support
 * Following documentation: pinata.upload.public.json(data).name().keyvalues()
 */
export const uploadJSON = async (jsonData: object, options?: UploadOptions) => {
  try {
    let upload = pinata.upload.public.json(jsonData);

    // Add metadata if provided
    if (options?.name) {
      upload = upload.name(options.name);
    }

    if (options?.keyvalues) {
      upload = upload.keyvalues(options.keyvalues);
    }

    if (options?.groupId) {
      upload = upload.group(options.groupId);
    }

    const result = await upload;
    return result;
  } catch (error) {
    console.error('Error uploading JSON:', error);
    throw error;
  }
};

/**
 * Create signed URL for client-side uploads
 * Following documentation: pinata.upload.public.createSignedURL()
 * Used for secure client-side uploads without exposing admin keys
 */
export const createSignedURL = async (options?: SignedURLOptions) => {
  try {
    const url = await pinata.upload.public.createSignedURL({
      expires: options?.expires || 30 // Default 30 seconds as per docs
    });
    return url;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
};

/**
 * Upload file using signed URL for client-side uploads
 * Following documentation: pinata.upload.public.file(file).url(signedUrl)
 */
export const uploadFileWithSignedURL = async (file: File, signedUrl: string, options?: UploadOptions) => {
  try {
    let upload = pinata.upload.public.file(file).url(signedUrl);

    // Add metadata if provided
    if (options?.name) {
      upload = upload.name(options.name);
    }

    if (options?.keyvalues) {
      upload = upload.keyvalues(options.keyvalues);
    }

    if (options?.groupId) {
      upload = upload.group(options.groupId);
    }

    const result = await upload;
    return result;
  } catch (error) {
    console.error('Error uploading file with signed URL:', error);
    throw error;
  }
};

/**
 * Get signed URL from server endpoint
 * Following documentation pattern for client-side uploads
 */
export const getSignedURLFromServer = async (serverUrl: string = '/api/pinata/signed-url') => {
  try {
    const response = await fetch(serverUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting signed URL from server:', error);
    throw error;
  }
};

/**
 * Complete client-side upload flow using signed URLs
 * Following documentation pattern for secure client uploads
 */
export const clientSideUpload = async (file: File, options?: UploadOptions) => {
  try {
    // Step 1: Get signed URL from server
    const signedUrl = await getSignedURLFromServer();

    // Step 2: Upload file using signed URL
    const upload = await uploadFileWithSignedURL(file, signedUrl, options);

    // Step 3: Convert CID to gateway URL
    const fileUrl = await convertCIDToURL(upload.cid);

    return {
      ...upload,
      url: fileUrl
    };
  } catch (error) {
    console.error('Error in client-side upload:', error);
    throw error;
  }
};

/**
 * Validate IPFS CID format
 * Supports both CIDv0 (Qm...) and CIDv1 (bafy..., bafk...)
 */
export const isValidIPFSHash = (hash: string): boolean => {
  if (!hash || typeof hash !== 'string') return false;

  // Remove any protocol or path prefixes
  const cleanHash = hash.replace(/^(ipfs:\/\/|.*\/ipfs\/)/, '');

  // CIDv0 pattern: starts with Qm, 46 characters, base58
  const cidv0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

  // CIDv1 patterns: starts with bafy, bafk, etc.
  const cidv1Pattern = /^ba[a-z0-9]{56,}$/;

  return cidv0Pattern.test(cleanHash) || cidv1Pattern.test(cleanHash);
};

/**
 * Upload NFT metadata following ERC-721 standard
 * Following documentation for JSON uploads with proper metadata
 */
export const uploadNFTMetadata = async (metadata: {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  external_url?: string;
  background_color?: string;
  animation_url?: string;
}, options?: UploadOptions) => {
  try {
    const upload = await uploadJSON(metadata, {
      name: options?.name || `${metadata.name}_metadata.json`,
      keyvalues: {
        type: 'nft-metadata',
        nft_name: metadata.name,
        ...options?.keyvalues
      },
      groupId: options?.groupId
    });

    // Return both upload info and metadata URL
    const metadataUrl = await convertCIDToURL(upload.cid);

    return {
      ...upload,
      metadataUrl
    };
  } catch (error) {
    console.error('Error uploading NFT metadata:', error);
    throw error;
  }
};

/**
 * Batch upload multiple files with progress tracking
 * Following documentation patterns for multiple uploads
 */
export const batchUpload = async (
  files: File[],
  options?: UploadOptions,
  onProgress?: (completed: number, total: number) => void
) => {
  try {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upload = await uploadFile(file, {
        ...options,
        name: options?.name || file.name,
        keyvalues: {
          batch_index: i.toString(),
          batch_total: files.length.toString(),
          ...options?.keyvalues
        }
      });

      const url = await convertCIDToURL(upload.cid);
      results.push({ ...upload, url });

      // Report progress
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in batch upload:', error);
    throw error;
  }
};

// Export the configured Pinata SDK instance and all utilities
export { pinata };
export default pinata;
