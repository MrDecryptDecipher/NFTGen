/**
 * IPFS Adapter Module
 *
 * This module provides a consistent interface for IPFS storage operations
 * using Alchemy's NFT API for reliable storage and retrieval.
 * Includes robust fallback mechanisms for handling network issues.
 */

import axios from 'axios';
import { alchemy } from '../lib/alchemy';
// Removed unused import: NFT_API_BASE_URL

// Import API keys from constants
import { ALCHEMY_API_KEY } from '../config/constants';

// Helper extension for string
declare global {
  interface String {
    hashCode(): number;
  }
}

// Removed unused constant: PUBLIC_IPFS_UPLOAD_URL

// Pinata (requires valid API keys)
const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || '';

// Infura IPFS (requires valid credentials)
const INFURA_IPFS_URL = "https://ipfs.infura.io:5001/api/v0/add";
const INFURA_PROJECT_ID = import.meta.env.VITE_INFURA_PROJECT_ID || '';
const INFURA_PROJECT_SECRET = import.meta.env.VITE_INFURA_PROJECT_SECRET || '';

// Web3.Storage (requires valid API key)
const WEB3_STORAGE_UPLOAD_URL = "https://api.web3.storage/upload";
const WEB3_STORAGE_API_KEY = import.meta.env.VITE_WEB3_STORAGE_API_KEY || '';

// Validate IPFS configuration
// Removed unused function: validateIPFSConfiguration

// IPFS Gateways for retrieval, in order of preference
// Based on recommendations from nftalchemyref.md
const IPFS_GATEWAYS = [
  {
    url: 'https://ipfs.alchemy.com/ipfs/',
    auth: ALCHEMY_API_KEY,
    name: 'Alchemy',
    cdnUrl: 'https://res.cloudinary.com/alchemyapi/image/upload/thumbnailv2/',
    priority: 10 // Highest priority
  },
  {
    url: 'https://cloudflare-ipfs.com/ipfs/',
    auth: null,
    name: 'Cloudflare',
    priority: 8
  },
  {
    url: 'https://ipfs.io/ipfs/',
    auth: null,
    name: 'IPFS.io',
    priority: 7
  },
  {
    url: 'https://dweb.link/ipfs/',
    auth: null,
    name: 'dweb.link',
    priority: 6
  },
  {
    url: 'https://nftstorage.link/ipfs/',
    auth: null,
    name: 'NFT.Storage',
    priority: 5
  },
  {
    url: 'https://ipfs.filebase.io/ipfs/',
    auth: null,
    name: 'Filebase',
    priority: 4
  },
  {
    url: 'https://gateway.pinata.cloud/ipfs/',
    auth: null,
    name: 'Pinata',
    priority: 3
  }
];

// Performance tracking for gateways
const gatewayPerformance = new Map<string, {
  successCount: number;
  failureCount: number;
  avgResponseTime: number;
  lastUsed: number;
  lastSuccess: number;
}>();

// Initialize performance tracking for each gateway
IPFS_GATEWAYS.forEach(gateway => {
  gatewayPerformance.set(gateway.url, {
    successCount: 0,
    failureCount: 0,
    avgResponseTime: 0,
    lastUsed: 0,
    lastSuccess: 0
  });
});

/**
 * Check network connectivity to a specific host with retry and caching
 * @param url URL to check
 * @param options Optional configuration
 * @returns True if host is reachable, false otherwise
 */
// Removed unused function: isHostReachable

/**
 * Convert a File object to a base64 string
 * @param file The file to convert
 * @returns Promise that resolves to the base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

/**
 * Upload a file to IPFS using Alchemy's IPFS API
 * NO MOCK DATA - Real IPFS upload only
 *
 * @param file The file to upload
 * @returns IPFS URL in the format ipfs://CID
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  console.error(`ALCHEMY-ONLY MODE: IPFS upload disabled for file: ${file.name} (${file.size} bytes)`);
  console.error('NFTGen operates in Alchemy-only mode for NFT data retrieval only.');

  // Always throw error - no IPFS uploads in Alchemy-only mode
  throw new Error(
    'IPFS uploads are disabled in Alchemy-only mode. ' +
    'Alchemy provides NFT data retrieval only, not IPFS storage services. ' +
    'NFTGen operates as a read-only NFT viewer using real blockchain data.'
  );

  // Try Web3.Storage as primary option (if configured)
  if (WEB3_STORAGE_API_KEY && WEB3_STORAGE_API_KEY !== 'your_web3_storage_api_key_here') {
    try {
      console.log("Attempting upload via Web3.Storage...");
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(WEB3_STORAGE_UPLOAD_URL, formData, {
        headers: {
          'Authorization': `Bearer ${WEB3_STORAGE_API_KEY}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout for larger files
      });

      if (response.data && response.data.cid) {
        const ipfsUrl = `ipfs://${response.data.cid}`;
        console.log("Successfully uploaded to IPFS via Web3.Storage:", ipfsUrl);

        // Store the mapping between file name and IPFS hash for future reference
        try {
          const fileMapping = JSON.parse(localStorage.getItem('nftgen_file_ipfs_mapping') || '{}');
          fileMapping[file.name] = {
            ipfsUrl,
            timestamp: Date.now(),
            size: file.size,
            type: file.type,
            source: 'web3.storage'
          };
          localStorage.setItem('nftgen_file_ipfs_mapping', JSON.stringify(fileMapping));
        } catch (mappingError) {
          console.warn("Failed to store file mapping:", mappingError);
        }

        return ipfsUrl;
      } else {
        throw new Error('No CID in Web3.Storage response');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Web3.Storage upload failed:", errorMsg);
      // Continue to Pinata fallback
    }
  } else {
    console.log("Web3.Storage API key not configured, skipping");
  }

  // Try Pinata as backup if API keys are available
  if (PINATA_API_KEY && PINATA_SECRET_KEY) {
    try {
      console.log("Attempting upload via Pinata API...");
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(PINATA_UPLOAD_URL, formData, {
        headers: {
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.IpfsHash) {
        const ipfsUrl = `ipfs://${response.data.IpfsHash}`;
        console.log("Successfully uploaded to IPFS via Pinata:", ipfsUrl);

        // Store the mapping
        try {
          const fileMapping = JSON.parse(localStorage.getItem('nftgen_file_ipfs_mapping') || '{}');
          fileMapping[file.name] = {
            ipfsUrl,
            timestamp: Date.now(),
            size: file.size,
            type: file.type,
            source: 'pinata'
          };
          localStorage.setItem('nftgen_file_ipfs_mapping', JSON.stringify(fileMapping));
        } catch (mappingError) {
          console.warn("Failed to store Pinata file mapping:", mappingError);
        }

        return ipfsUrl;
      } else {
        throw new Error('No IPFS hash in Pinata response');
      }
    } catch (pinataError) {
      const errorMsg = pinataError instanceof Error ? pinataError.message : String(pinataError);
      console.error("Pinata IPFS upload failed:", errorMsg);
    }
  } else {
    console.log("Pinata API keys not available, skipping Pinata upload");
  }

  // Try Infura IPFS as final backup
  if (INFURA_PROJECT_ID && INFURA_PROJECT_SECRET) {
    try {
      console.log("Attempting upload via Infura IPFS...");
      const formData = new FormData();
      formData.append('file', file);

      const auth = btoa(`${INFURA_PROJECT_ID}:${INFURA_PROJECT_SECRET}`);
      const response = await axios.post(INFURA_IPFS_URL, formData, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.Hash) {
        const ipfsUrl = `ipfs://${response.data.Hash}`;
        console.log("Successfully uploaded to IPFS via Infura:", ipfsUrl);

        // Store the mapping
        try {
          const fileMapping = JSON.parse(localStorage.getItem('nftgen_file_ipfs_mapping') || '{}');
          fileMapping[file.name] = {
            ipfsUrl,
            timestamp: Date.now(),
            size: file.size,
            type: file.type,
            source: 'infura'
          };
          localStorage.setItem('nftgen_file_ipfs_mapping', JSON.stringify(fileMapping));
        } catch (mappingError) {
          console.warn("Failed to store Infura file mapping:", mappingError);
        }

        return ipfsUrl;
      } else {
        throw new Error('No hash in Infura response');
      }
    } catch (infuraError) {
      const errorMsg = infuraError instanceof Error ? infuraError.message : String(infuraError);
      console.error("Infura IPFS upload failed:", errorMsg);
    }
  } else {
    console.log("Infura IPFS credentials not available, skipping Infura upload");
  }

  // All IPFS upload methods failed - throw error instead of creating mock data
  console.error("All IPFS upload methods failed");
  throw new Error(
    'IPFS upload failed. All upload services are currently unavailable. ' +
    'Please check your network connection and try again later. ' +
    'If the problem persists, please contact support.'
  );
}

// No longer using mock IPFS URLs

// Using the exported fileToBase64 function defined earlier

/**
 * Upload metadata object to IPFS
 * @param metadata The metadata object to store
 * @returns IPFS URL in the format ipfs://CID
 */
export async function uploadMetadataToIPFS(metadata: Record<string, unknown>): Promise<string> {
  console.error("ALCHEMY-ONLY MODE: Metadata upload disabled for:", metadata.name);
  console.error('NFTGen operates in Alchemy-only mode for NFT data retrieval only.');

  // Always throw error - no metadata uploads in Alchemy-only mode
  throw new Error(
    'Metadata uploads are disabled in Alchemy-only mode. ' +
    'Alchemy provides NFT data retrieval only, not IPFS storage services. ' +
    'NFTGen operates as a read-only NFT viewer using real blockchain data.'
  );

  // Add timestamp to metadata if not present
  if (!metadata.created) {
    metadata.created = new Date().toISOString();
  }

  // Add unique identifier to metadata if not present
  if (!metadata.id) {
    metadata.id = `nftgen-${Date.now().toString(16)}-${Math.random().toString(36).substring(2, 10)}`;
  }

  // Ensure image URL is properly formatted
  if (metadata.image && typeof metadata.image === 'string') {
    // If image is already an IPFS URL, make sure it's properly formatted
    if (metadata.image.startsWith('ipfs://')) {
      // It's already an IPFS URL, no need to change
      console.log("Metadata already contains IPFS image URL:", metadata.image);

      // Store a reference to this image URL for future use
      try {
        const imageMapping = JSON.parse(localStorage.getItem('nftgen_image_ipfs_mapping') || '{}');
        const cid = metadata.image.replace('ipfs://', '');
        imageMapping[cid] = {
          metadataName: metadata.name,
          timestamp: Date.now()
        };
        localStorage.setItem('nftgen_image_ipfs_mapping', JSON.stringify(imageMapping));
      } catch (mappingError) {
        console.warn("Failed to store image mapping:", mappingError);
      }
    }
    // If image is a gateway URL, convert to IPFS URL if possible
    else if (metadata.image.includes('/ipfs/')) {
      const parts = metadata.image.split('/ipfs/');
      if (parts.length > 1) {
        const cid = parts[1];
        metadata.image = `ipfs://${cid}`;
        console.log("Converted gateway URL to IPFS URL:", metadata.image);
      }
    }
    // Otherwise, it's likely a direct URL or data URL, keep as is
  }

  try {
    // Convert metadata to a JSON string
    const metadataStr = JSON.stringify(metadata, null, 2);

    // Create a JSON file from the metadata
    const metadataBlob = new Blob([metadataStr], { type: 'application/json' });
    const fileName = metadata.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
    const metadataFile = new File([metadataBlob], fileName, { type: 'application/json' });

    // Store a copy of the metadata in storage before uploading
    const metadataKey = `nft_metadata_${String(metadata.name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(16)}`;
    import('./safeStorage').then(storage => {
      storage.setStorageItem(metadataKey, metadataStr);
      console.log("Metadata backed up to storage with key:", metadataKey);
    }).catch(err => {
      console.warn("Failed to import safeStorage, falling back to direct localStorage", err);
      try {
        localStorage.setItem(metadataKey, metadataStr);
        console.log("Metadata backed up to localStorage with key:", metadataKey);
      } catch (e) {
        console.warn("Failed to store metadata in localStorage", e);
      }
    });

    // Use the file upload function which already has fallback mechanisms
    const ipfsUrl = await uploadFileToIPFS(metadataFile);

    // Store a mapping between metadata name and IPFS URL
    try {
      import('./safeStorage').then(async storage => {
        const mappingStr = storage.getStorageItem('nftgen_metadata_ipfs_mapping') || '{}';
        const metadataMapping = JSON.parse(mappingStr);
        const metadataNameStr = String(metadata.name || 'unnamed');

        metadataMapping[metadataNameStr] = {
          ipfsUrl,
          timestamp: Date.now(),
          id: metadata.id,
          imageUrl: metadata.image
        };

        storage.setStorageItem('nftgen_metadata_ipfs_mapping', JSON.stringify(metadataMapping));
      }).catch(err => {
        console.warn("Failed to import safeStorage, falling back to direct localStorage", err);
        try {
          const metadataMapping = JSON.parse(localStorage.getItem('nftgen_metadata_ipfs_mapping') || '{}');
          const metadataNameStr = String(metadata.name || 'unnamed');

          metadataMapping[metadataNameStr] = {
            ipfsUrl,
            timestamp: Date.now(),
            id: metadata.id,
            imageUrl: metadata.image
          };

          localStorage.setItem('nftgen_metadata_ipfs_mapping', JSON.stringify(metadataMapping));
        } catch (e) {
          console.warn("Failed to store metadata mapping in localStorage", e);
        }
      });
    } catch (mappingError) {
      console.warn("Failed to store metadata mapping:", mappingError);
    }

    return ipfsUrl;
  } catch (error) {
    console.error("Error uploading metadata to IPFS:", error);

    // No more mock implementation - throw a clear error
    throw new Error(`Failed to upload NFT metadata to IPFS. Please try again or contact support.`);
  }
}

/**
 * Validate metadata format according to Alchemy standards
 * @param metadata The metadata object to validate
 */
// Removed unused function: validateMetadataFormat

// Removed generateHashCode function - no longer needed without mock CIDs

/**
 * Get a gateway URL for an IPFS hash with intelligent fallback
 * @param ipfsUrl IPFS URL (ipfs://CID)
 * @returns HTTP gateway URL
 */
export function getGatewayUrl(ipfsUrl: string): string {
  if (!ipfsUrl) return '';

  // If it's already an HTTP URL, return as is
  if (ipfsUrl.startsWith('http')) {
    return ipfsUrl;
  }

  // If it's a data URL, return as is
  if (ipfsUrl.startsWith('data:')) {
    return ipfsUrl;
  }

  // No longer using mock data

  // Extract the CID from the IPFS URL
  let cid = '';

  if (ipfsUrl.startsWith('ipfs://')) {
    cid = ipfsUrl.replace('ipfs://', '');
  } else if (ipfsUrl.startsWith('ipfs:/ipfs/')) {
    cid = ipfsUrl.replace('ipfs:/ipfs/', '');
  } else if (ipfsUrl.includes('/ipfs/')) {
    // If it's already a gateway URL, extract the CID
    const parts = ipfsUrl.split('/ipfs/');
    if (parts.length > 1) {
      cid = parts[1];
    } else {
      // Return as is for other URLs
      return ipfsUrl;
    }
  } else if (ipfsUrl.match(/^[a-zA-Z0-9]{46,59}$/)) {
    // If it's just a CID, use it directly
    cid = ipfsUrl;
  } else {
    // For unknown formats, try to create a local fallback image
    try {
      // Check if we have a fallback image stored
      const fallbackImage = localStorage.getItem('nft_fallback_image');
      if (fallbackImage) {
        return fallbackImage;
      }

      // Return a data URL of a simple SVG as a last resort
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTAiIGhlaWdodD0iMjUwIiB2aWV3Qm94PSIwIDAgMjUwIDI1MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjI1MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNnB4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
    } catch (e) {
      // Return as is for other formats if fallback fails
      return ipfsUrl;
    }
  }

  // Try multiple gateways with fallback
  const workingGateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];

  // Return the first gateway in our list (most reliable)
  return workingGateways[0];
}

/**
 * Get the best-performing gateway based on success rate and response time
 */
function getBestGateway() {
  // Start with the default (first) gateway
  let bestGateway = IPFS_GATEWAYS[0];

  // Get current time for cooldown calculations
  const now = Date.now();

  // If we have performance data, use it to select the best gateway
  if (gatewayPerformance.size > 0) {
    let bestScore = -1;

    for (const gateway of IPFS_GATEWAYS) {
      const perf = gatewayPerformance.get(gateway.url);
      if (!perf) continue;

      // Skip gateways that have failed too many times recently
      if (perf.failureCount > 5 && (now - perf.lastSuccess) > 300000) {
        continue;
      }

      // Calculate a score based on success rate and response time
      // Higher success count and lower response time = better score
      const successRate = perf.successCount / (perf.successCount + perf.failureCount + 1);
      const responseTimeFactor = 1000 / (perf.avgResponseTime + 100); // Avoid division by zero
      const recencyFactor = Math.max(0.1, Math.min(1, 60000 / (now - perf.lastSuccess + 1000)));

      const score = successRate * responseTimeFactor * recencyFactor;

      if (score > bestScore) {
        bestScore = score;
        bestGateway = gateway;
      }
    }
  }

  // Update the lastUsed timestamp
  const perf = gatewayPerformance.get(bestGateway.url);
  if (perf) {
    perf.lastUsed = Date.now();
    gatewayPerformance.set(bestGateway.url, perf);
  }

  return bestGateway;
}

/**
 * Test all gateways with a specific CID and update performance metrics
 */
async function testAllGateways(cid: string) {
  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway.url}${cid}${gateway.auth ? `?auth=${gateway.auth}` : ''}`;

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Update performance metrics
      const perf = gatewayPerformance.get(gateway.url) || {
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        lastUsed: 0,
        lastSuccess: 0
      };

      perf.successCount++;
      perf.lastSuccess = Date.now();

      // Update average response time with exponential moving average
      perf.avgResponseTime = perf.avgResponseTime * 0.7 + responseTime * 0.3;

      gatewayPerformance.set(gateway.url, perf);

    } catch (error) {
      // Update failure count
      const perf = gatewayPerformance.get(gateway.url);
      if (perf) {
        perf.failureCount++;
        gatewayPerformance.set(gateway.url, perf);
      }
    }
  }
}

/**
 * Find a working gateway for a specific CID
 * @param cid IPFS content identifier
 * @returns URL to the content via a working gateway
 */
export async function findWorkingGateway(cid: string): Promise<string> {
  // Try all gateways in parallel and return the first one that works
  const gatewayPromises = IPFS_GATEWAYS.map(async (gateway) => {
    const url = `${gateway.url}${cid}${gateway.auth ? `?auth=${gateway.auth}` : ''}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        // Update performance metrics
        const perf = gatewayPerformance.get(gateway.url) || {
          successCount: 0,
          failureCount: 0,
          avgResponseTime: 0,
          lastUsed: 0,
          lastSuccess: 0
        };

        perf.successCount++;
        perf.lastSuccess = Date.now();
        perf.avgResponseTime = perf.avgResponseTime * 0.7 + responseTime * 0.3;

        gatewayPerformance.set(gateway.url, perf);

        return url;
      }
      throw new Error(`Gateway returned ${response.status}`);
    } catch (error) {
      // Update failure metrics
      const perf = gatewayPerformance.get(gateway.url);
      if (perf) {
        perf.failureCount++;
        gatewayPerformance.set(gateway.url, perf);
      }

      throw error;
    }
  });

  try {
    // Use a try-catch with Promise.race to implement our own Promise.any equivalent
    // This avoids the TypeScript error since Promise.any is not available in older versions
    let lastError: any;

    return await new Promise<string>((resolve, reject) => {
      let pending = gatewayPromises.length;
      const rejectErrors: Error[] = [];

      gatewayPromises.forEach(promise => {
        promise.then(resolve, error => {
          rejectErrors.push(error);
          pending--;

          if (pending === 0) {
            // All promises rejected
            reject(new Error(`All gateways failed: ${rejectErrors.map(e => e.message).join(', ')}`));
          }
        });
      });
    });
  } catch (error) {
    // All gateways failed, use the default
    console.error("All gateways failed for CID:", cid);
    const defaultGateway = IPFS_GATEWAYS[0];
    return `${defaultGateway.url}${cid}${defaultGateway.auth ? `?auth=${defaultGateway.auth}` : ''}`;
  }
}

/**
 * Fetch metadata from IPFS with automatic gateway fallback
 * @param ipfsUrl IPFS URL to fetch metadata from
 * @returns Parsed metadata object
 */
export async function getMetadataFromIPFS(ipfsUrl: string): Promise<Record<string, any>> {
  if (!ipfsUrl) {
    throw new Error('Invalid IPFS URL provided');
  }

  console.log("Fetching metadata from IPFS URL:", ipfsUrl);

  // Standardize to ipfs:// format
  let cid = ipfsUrl;
  if (ipfsUrl.startsWith('ipfs://')) {
    cid = ipfsUrl.substring(7);
  } else if (ipfsUrl.includes('/ipfs/')) {
    cid = ipfsUrl.split('/ipfs/')[1];
  }

  // No longer using mock data

  // Check if we have a cached entry for this CID
  const cachedData = localStorage.getItem(`ipfs_cache_${cid}`);
  if (cachedData) {
    try {
      console.log('Using cached metadata for CID:', cid);
      return JSON.parse(cachedData);
    } catch (parseError) {
      console.warn('Error parsing cached metadata:', parseError);
    }
  }

  // Check if we have a mapping for this CID
  try {
    const metadataMapping = JSON.parse(localStorage.getItem('nftgen_metadata_ipfs_mapping') || '{}');
    for (const name in metadataMapping) {
      const entry = metadataMapping[name];
      if (entry.ipfsUrl === `ipfs://${cid}`) {
        console.log('Found metadata mapping for CID:', cid);

        // Check if we have the metadata stored
        const metadataKeys = Object.keys(localStorage).filter(key =>
          key.startsWith('nft_metadata_') && key.includes(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
        );

        if (metadataKeys.length > 0) {
          // Use the most recent metadata
          const latestKey = metadataKeys.sort().pop();
          if (latestKey) {
            const storedMetadata = localStorage.getItem(latestKey);
            if (storedMetadata) {
              console.log('Using stored metadata for CID:', cid);
              return JSON.parse(storedMetadata);
            }
          }
        }
      }
    }
  } catch (mappingError) {
    console.warn('Error checking metadata mapping:', mappingError);
  }

  // Try to find a working gateway
  try {
    const gatewayUrl = await findWorkingGateway(cid);
    console.log("Fetching metadata from gateway URL:", gatewayUrl);

    const response = await axios.get(gatewayUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      console.log("Successfully fetched metadata from IPFS gateway");

      // Cache the metadata in localStorage for future use
      try {
        localStorage.setItem(`ipfs_cache_${cid}`, JSON.stringify(response.data));
      } catch (cacheError) {
        console.warn('Error caching metadata:', cacheError);
      }

      return response.data;
    }

    throw new Error(`Failed to retrieve metadata from ${gatewayUrl}: ${response.status}`);
  } catch (error) {
    console.error(`Error fetching metadata from IPFS (${cid}):`, error);

    // Try using Alchemy NFT API as a last resort
    try {
      console.log("Attempting to get metadata through Alchemy NFT API...");
      const alchemyResponse = await alchemy.nft.getNftMetadataBatch([
        { contractAddress: "0x0000000000000000000000000000000000000000", tokenId: cid }
      ]);

      // Safely access the response data using Object access pattern
      // This avoids TypeScript errors when the exact response type is not known
      const responseData = alchemyResponse as unknown;
      if (responseData && typeof responseData === 'object') {
        // Access the first item if it exists
        const firstItem = Object.values(responseData)[0];
        if (firstItem && typeof firstItem === 'object' && 'rawMetadata' in firstItem) {
          const metadata = firstItem.rawMetadata || {};

          // Cache the metadata in localStorage for future use
          try {
            localStorage.setItem(`ipfs_cache_${cid}`, JSON.stringify(metadata));
          } catch (cacheError) {
            console.warn('Error caching metadata:', cacheError);
          }

          return metadata;
        }
      }
    } catch (alchemyError) {
      console.error("Alchemy API fallback failed:", alchemyError);
    }

    // Last resort: create a minimal metadata object
    console.warn('Creating minimal metadata object as fallback');
    const fallbackMetadata = {
      name: 'Unknown NFT',
      description: 'Metadata could not be retrieved',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTAiIGhlaWdodD0iMjUwIiB2aWV3Qm94PSIwIDAgMjUwIDI1MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjI1MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNnB4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIj5NZXRhZGF0YSB1bmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=',
      attributes: [
        {
          trait_type: 'Error',
          value: 'Metadata retrieval failed'
        },
        {
          trait_type: 'IPFS URL',
          value: `ipfs://${cid}`
        },
        {
          trait_type: 'Timestamp',
          value: new Date().toISOString()
        }
      ]
    };

    return fallbackMetadata;
  }
}

/**
 * Fetch image from IPFS with reliable gateway fallback
 * Implements Alchemy's CDN and gateway recommendations from nftalchemyref.md
 *
 * @param ipfsUrl IPFS URL to fetch image from
 * @returns HTTP URL to the image
 */
export async function getImageFromIPFS(ipfsUrl: string): Promise<string> {
  if (!ipfsUrl) return '';

  console.log("Fetching image from IPFS URL:", ipfsUrl);

  // If it's not an IPFS URL, return as is
  if (!ipfsUrl.startsWith('ipfs://') && !ipfsUrl.includes('/ipfs/')) {
    return ipfsUrl;
  }

  // If it's a data URL, return as is
  if (ipfsUrl.startsWith('data:')) {
    return ipfsUrl;
  }

  // Extract CID
  let cid = ipfsUrl;
  if (ipfsUrl.startsWith('ipfs://')) {
    cid = ipfsUrl.substring(7);
  } else if (ipfsUrl.includes('/ipfs/')) {
    cid = ipfsUrl.split('/ipfs/')[1];
  }

  // First check if we have a data URL stored for this CID
  // This is our most reliable fallback mechanism
  try {
    const dataUrl = localStorage.getItem(`ipfs_data_${cid}`);
    if (dataUrl && dataUrl.startsWith('data:')) {
      console.log("Using stored data URL for CID:", cid);
      return dataUrl;
    }
  } catch (dataUrlError) {
    console.warn("Failed to retrieve data URL from localStorage:", dataUrlError);
  }

  // Check if we have a file mapping with a data URL for this CID
  try {
    const fileMapping = JSON.parse(localStorage.getItem('nftgen_file_ipfs_mapping') || '{}');
    if (fileMapping) {
      // Look for entries with this CID
      const fileEntries = Object.entries(fileMapping).filter(([_, entry]) => {
        const typedEntry = entry as {
          ipfsUrl: string;
          dataUrl?: string;
          timestamp?: number;
        };

        return (typedEntry.ipfsUrl === `ipfs://${cid}` ||
                typedEntry.ipfsUrl === ipfsUrl) &&
               typedEntry.dataUrl &&
               typedEntry.dataUrl.startsWith('data:');
      });

      if (fileEntries.length > 0) {
        // Use the most recent file with a data URL
        const latestEntry = fileEntries.sort(([_, a], [__, b]) => {
          const typedA = a as { timestamp?: number };
          const typedB = b as { timestamp?: number };
          return (typedB.timestamp || 0) - (typedA.timestamp || 0);
        })[0];

        if (latestEntry) {
          const typedEntry = latestEntry[1] as { dataUrl: string };
          if (typedEntry.dataUrl) {
            console.log('Using data URL from file mapping for CID:', cid);

            // Also store it directly for easier access next time
            try {
              localStorage.setItem(`ipfs_data_${cid}`, typedEntry.dataUrl);
            } catch (storeError) {
              console.warn("Failed to store data URL for future use:", storeError);
            }

            return typedEntry.dataUrl;
          }
        }
      }
    }
  } catch (mappingError) {
    console.warn('Error checking file mapping for data URL:', mappingError);
  }

  // Check if we have a cached image URL for this CID
  const cachedImageUrl = localStorage.getItem(`ipfs_image_cache_${cid}`);
  if (cachedImageUrl) {
    console.log('Using cached image URL for CID:', cid);
    return cachedImageUrl;
  }

  // Try to use Alchemy's CDN for better performance
  try {
    const alchemyGateway = IPFS_GATEWAYS.find(gateway => gateway.name === 'Alchemy');
    if (alchemyGateway && alchemyGateway.cdnUrl) {
      const cdnUrl = `${alchemyGateway.cdnUrl}${cid}`;
      console.log("Trying Alchemy CDN URL for image:", cdnUrl);

      // Check if the CDN URL is accessible
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(cdnUrl, {
          method: 'HEAD',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log("Alchemy CDN URL is accessible");

          // Cache this working URL
          try {
            localStorage.setItem(`ipfs_image_cache_${cid}`, cdnUrl);
          } catch (cacheError) {
            console.warn('Error caching CDN URL:', cacheError);
          }

          return cdnUrl;
        }
      } catch (cdnError) {
        console.warn("Alchemy CDN URL is not accessible");
      }
    }
  } catch (alchemyError) {
    console.warn("Failed to use Alchemy CDN");
  }

  // Try Nwallet IPFS service
  try {
    const nwalletUrl = `http://3.111.22.56:6102/api/ipfs/gateway/${cid}`;
    console.log("Trying Nwallet IPFS gateway:", nwalletUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(nwalletUrl, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("Nwallet IPFS gateway is accessible");

      // Cache this working URL
      try {
        localStorage.setItem(`ipfs_image_cache_${cid}`, nwalletUrl);
      } catch (cacheError) {
        console.warn('Error caching Nwallet URL:', cacheError);
      }

      return nwalletUrl;
    }
  } catch (nwalletError) {
    console.warn("Nwallet IPFS gateway is not accessible");
  }

  // Try to find a working gateway
  try {
    // Sort gateways by priority before finding a working one
    const sortedGateways = [...IPFS_GATEWAYS].sort((a, b) =>
      (b.priority || 0) - (a.priority || 0)
    );

    // Try each gateway in order of priority
    for (const gateway of sortedGateways) {
      const gatewayUrl = `${gateway.url}${cid}${gateway.auth ? `?auth=${gateway.auth}` : ''}`;

      try {
        // Check if the gateway URL is accessible
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(gatewayUrl, {
          method: 'HEAD',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`Gateway ${gateway.name} is accessible for CID ${cid}`);

          // Cache this working URL
          try {
            localStorage.setItem(`ipfs_image_cache_${cid}`, gatewayUrl);
          } catch (cacheError) {
            console.warn('Error caching gateway URL:', cacheError);
          }

          return gatewayUrl;
        }
      } catch (gatewayError) {
        console.warn(`Gateway ${gateway.name} is not accessible for CID ${cid}`);
        continue;
      }
    }

    // If we get here, none of the gateways worked
    throw new Error("No working gateway found");
  } catch (error) {
    console.error(`Error finding working gateway for ${cid}:`, error);

    // Create a fallback SVG with the CID as text
    try {
      const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" fill="none">
        <rect width="250" height="250" fill="#333"/>
        <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="16px" font-family="system-ui, sans-serif">Image unavailable</text>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="12px" font-family="monospace">${cid.substring(0, 16)}...</text>
      </svg>`;

      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svgText);

      // Store this as a fallback for future use
      try {
        localStorage.setItem(`ipfs_data_${cid}`, svgDataUrl);
      } catch (storeError) {
        console.warn("Failed to store fallback SVG:", storeError);
      }

      return svgDataUrl;
    } catch (svgError) {
      console.error("Failed to create fallback SVG:", svgError);

      // Last resort: return a default gateway URL
      const defaultGateway = IPFS_GATEWAYS[0];
      return `${defaultGateway.url}${cid}${defaultGateway.auth ? `?auth=${defaultGateway.auth}` : ''}`;
    }
  }
}

// Removed generateConsistentCID function - no mock CIDs allowed

// No need for additional exports as we're already exporting the functions individually