import axios from 'axios';
import { Buffer } from 'buffer';

// Configuration constants
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Base delay between retries (1 second)

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
const IPFS_PROTOCOL = 'ipfs://';

// IPFS Gateway URLs in order of preference
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

/**
 * Normalize an IPFS URL to ensure it follows the proper format
 * @param url IPFS URL or CID
 * @returns Normalized IPFS URL
 */
export const normalizeIpfsUrl = (url: string): string => {
  if (!url) return '';
  
  // Already in proper ipfs:// format
  if (url.startsWith(IPFS_PROTOCOL)) {
    return url;
  }
  
  // If it's a gateway URL, extract the CID
  for (const gateway of IPFS_GATEWAYS) {
    if (url.startsWith(gateway)) {
      const cid = url.substring(gateway.length);
      return `${IPFS_PROTOCOL}${cid}`;
    }
  }
  
  // If it's just a CID (Qm...), convert to ipfs:// format
  if (/^(Qm[1-9A-Za-z]{44}|bafy[A-Za-z2-7]{55})$/.test(url)) {
    return `${IPFS_PROTOCOL}${url}`;
  }
  
  // Return original if no transformation needed
  return url;
};

/**
 * Convert an IPFS URL to an HTTP gateway URL for browser compatibility
 * @param ipfsUrl IPFS URL (ipfs://...)
 * @returns HTTP Gateway URL
 */
export const ipfsToHttpUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl) return '';
  
  // Already a HTTP URL
  if (ipfsUrl.startsWith('http')) {
    return ipfsUrl;
  }
  
  // Convert ipfs:// URL to HTTP gateway
  if (ipfsUrl.startsWith(IPFS_PROTOCOL)) {
    const cid = ipfsUrl.substring(IPFS_PROTOCOL.length);
    return `${PINATA_GATEWAY}${cid}`;
  }
  
  // If it's just a CID, prefix with gateway
  if (/^(Qm[1-9A-Za-z]{44}|bafy[A-Za-z2-7]{55})$/.test(ipfsUrl)) {
    return `${PINATA_GATEWAY}${ipfsUrl}`;
  }
  
  return ipfsUrl;
};

/**
 * Generate a consistent delay with exponential backoff for retries
 * @param retryAttempt Current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
const getRetryDelay = (retryAttempt: number): number => {
  return RETRY_DELAY_MS * Math.pow(2, retryAttempt) + Math.random() * 1000;
};

/**
 * Test connection to Pinata API to ensure credentials are valid
 * @param apiKey Pinata API key
 * @param apiSecret Pinata API secret
 * @returns Whether connection is successful
 */
export const testPinataConnection = async (
  apiKey: string = process.env.REACT_APP_PINATA_API_KEY || process.env.VITE_PINATA_API_KEY || '',
  apiSecret: string = process.env.REACT_APP_PINATA_SECRET_KEY || process.env.VITE_PINATA_SECRET_KEY || ''
): Promise<boolean> => {
  try {
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': apiSecret
      },
      timeout: DEFAULT_TIMEOUT
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Pinata connection test failed:', error);
    return false;
  }
};

/**
 * Get Pinata authentication headers for API requests
 * @param jwt JWT token (optional)
 * @returns Headers object for axios
 */
export const getPinataHeaders = (jwt?: string) => {
  if (jwt) {
      return { 
      'Authorization': `Bearer ${jwt}`
      };
    }
    
  // Fallback to API key authentication
  const apiKey = process.env.REACT_APP_PINATA_API_KEY || process.env.VITE_PINATA_API_KEY || '';
  const apiSecret = process.env.REACT_APP_PINATA_SECRET_KEY || process.env.VITE_PINATA_SECRET_KEY || '';
    
    return {
    'pinata_api_key': apiKey,
    'pinata_secret_api_key': apiSecret
  };
};

/**
 * Sleep for a specified amount of time
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Standardize metadata to conform to OpenSea and Alchemy NFT metadata standards
 * @param metadata Raw metadata object
 * @returns Standardized metadata object
 */
export const standardizeMetadata = (metadata: any): any => {
  // Start with the existing metadata
  const standardized = { ...metadata };
  
  // Ensure required fields exist per OpenSea & Alchemy standards
  if (!standardized.name) {
    standardized.name = 'Untitled NFT';
  }
  
  if (!standardized.description) {
    standardized.description = 'NFT created with NFTGen';
  }
  
  // Make sure image field is populated and normalized
  if (standardized.image) {
    standardized.image = normalizeIpfsUrl(standardized.image);
  }
  
  // Ensure attributes is an array
  if (!standardized.attributes || !Array.isArray(standardized.attributes)) {
    standardized.attributes = [];
  }
  
  // Add NFTGen attribution if not present
  const hasGenerator = standardized.attributes.some(
    (attr: any) => attr.trait_type === 'Generator' || attr.trait_type === 'generator'
  );
  
  if (!hasGenerator) {
    standardized.attributes.push({
      trait_type: 'Generator',
      value: 'NFTGen'
    });
  }
  
  // Add creation date if not present
  const hasCreationDate = standardized.attributes.some(
    (attr: any) => attr.trait_type === 'Creation Date' || attr.trait_type === 'creation_date'
  );
  
  if (!hasCreationDate) {
    standardized.attributes.push({
      trait_type: 'Creation Date',
      value: new Date().toISOString()
    });
  }
  
  // Add external_url if not present
  if (!standardized.external_url) {
    standardized.external_url = 'https://nftgen.nija.io';
  }
  
  return standardized;
};

/**
 * Upload a file to IPFS using Pinata with retries and proper error handling
 * @param file File to upload
 * @param metadata Additional metadata for the file
 * @returns IPFS URL (ipfs://{CID})
 */
export const uploadFileToIPFS = async (
  file: File, 
  metadata: { name?: string; keyvalues?: Record<string, string> } = {}
): Promise<string> => {
  let retryCount = 0;
  
  while (retryCount <= MAX_RETRIES) {
    try {
      console.log(`[IPFS] Uploading file (Attempt ${retryCount + 1}/${MAX_RETRIES + 1}): ${file.name} (${file.size} bytes)`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
      // Add Pinata metadata
      const pinataMetadata = JSON.stringify({
        name: metadata.name || file.name,
        keyvalues: {
          source: 'NFTGen',
          timestamp: Date.now().toString(),
          ...(metadata.keyvalues || {})
        }
      });
      formData.append('pinataMetadata', pinataMetadata);
      
      // Add Pinata options - use CIDv1 as recommended by Alchemy
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', pinataOptions);
      
      // Get authentication headers
      const headers = {
        ...getPinataHeaders(),
        'Content-Type': `multipart/form-data;`
      };
      
      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      // Make request to Pinata
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers,
          signal: controller.signal,
          maxBodyLength: Infinity, // Required for large files
          timeout: DEFAULT_TIMEOUT
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (response.status === 200 && response.data?.IpfsHash) {
        const ipfsHash = response.data.IpfsHash;
        const ipfsUrl = `${IPFS_PROTOCOL}${ipfsHash}`;
        console.log(`[IPFS] File uploaded successfully: ${ipfsUrl}`);
        return ipfsUrl;
      } else {
        throw new Error(`Pinata returned unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      // Handle timeout or network errors
      if (axios.isCancel(error)) {
        console.warn(`[IPFS] Upload timed out after ${DEFAULT_TIMEOUT}ms`);
    } else {
        console.error(`[IPFS] Upload error:`, error.message);
      }
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(retryCount);
        console.log(`[IPFS] Retrying upload in ${delay}ms...`);
        await sleep(delay);
        retryCount++;
    } else {
        // All retries failed, try falling back to Nwallet IPFS service if available
        try {
          return await fallbackToNwalletIPFS(file);
        } catch (fallbackError) {
          console.error('[IPFS] Fallback to Nwallet failed:', fallbackError);
          throw new Error(`Failed to upload to IPFS after ${MAX_RETRIES + 1} attempts: ${error.message}`);
        }
      }
    }
  }
  
  // This should never happen but TypeScript needs a return value
  throw new Error('Failed to upload to IPFS: All retries exhausted');
};

/**
 * Upload JSON data to IPFS via Pinata with retries and proper error handling
 * @param jsonData Object to be uploaded as JSON
 * @param name Optional name for the file
 * @returns IPFS URL (ipfs://{CID})
 */
export const uploadJSONToIPFS = async (
  jsonData: any,
  name: string = 'metadata.json'
): Promise<string> => {
  let retryCount = 0;
  
  // Standardize metadata according to OpenSea and Alchemy best practices
  const standardizedData = standardizeMetadata(jsonData);
  console.log('[IPFS] Uploading standardized metadata:', standardizedData);
  
  // Create a JSON file from the data
  const jsonBlob = new Blob([JSON.stringify(standardizedData, null, 2)], { type: 'application/json' });
  const jsonFile = new File([jsonBlob], name, { type: 'application/json' });
  
  while (retryCount <= MAX_RETRIES) {
    try {
      console.log(`[IPFS] Uploading JSON (Attempt ${retryCount + 1}/${MAX_RETRIES + 1}): ${name}`);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', jsonFile);
      
      // Add Pinata metadata
      const pinataMetadata = JSON.stringify({
        name,
        keyvalues: {
          source: 'NFTGen',
          timestamp: Date.now().toString(),
          type: 'metadata'
        }
      });
      formData.append('pinataMetadata', pinataMetadata);
      
      // Add Pinata options - use CIDv1 for better compatibility
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', pinataOptions);
      
      // Get authentication headers
      const headers = {
        ...getPinataHeaders(),
        'Content-Type': `multipart/form-data;`
      };
      
      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      // Make request to Pinata
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers,
          signal: controller.signal,
          maxBodyLength: Infinity,
          timeout: DEFAULT_TIMEOUT
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (response.status === 200 && response.data?.IpfsHash) {
        const ipfsHash = response.data.IpfsHash;
        const ipfsUrl = `${IPFS_PROTOCOL}${ipfsHash}`;
        console.log(`[IPFS] JSON uploaded successfully: ${ipfsUrl}`);
        return ipfsUrl;
    } else {
        throw new Error(`Pinata returned unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
      // Handle timeout or network errors
      if (axios.isCancel(error)) {
        console.warn(`[IPFS] Upload timed out after ${DEFAULT_TIMEOUT}ms`);
      } else {
        console.error(`[IPFS] JSON upload error:`, error.message);
      }
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(retryCount);
        console.log(`[IPFS] Retrying JSON upload in ${delay}ms...`);
        await sleep(delay);
        retryCount++;
      } else {
        // All retries failed, try falling back to Nwallet IPFS service if available
        try {
          return await fallbackToNwalletJSONUpload(standardizedData, name);
        } catch (fallbackError) {
          console.error('[IPFS] Fallback to Nwallet JSON upload failed:', fallbackError);
          throw new Error(`Failed to upload JSON to IPFS after ${MAX_RETRIES + 1} attempts: ${error.message}`);
        }
      }
    }
  }
  
  // This should never happen but TypeScript needs a return value
  throw new Error('Failed to upload JSON to IPFS: All retries exhausted');
};

/**
 * Fallback to Nwallet IPFS service for file uploads when Pinata fails
 * @param file File to upload
 * @returns IPFS URL from Nwallet service
 */
const fallbackToNwalletIPFS = async (file: File): Promise<string> => {
  try {
    console.log('[IPFS] Falling back to Nwallet IPFS service for file upload');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Send to Nwallet IPFS service
    const response = await axios.post(
      'http://3.111.22.56:5174/api/ipfs/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    if (response.data?.success && response.data?.ipfsUrl) {
      return normalizeIpfsUrl(response.data.ipfsUrl);
    } else {
      throw new Error(`Nwallet IPFS service returned error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error('[IPFS] Nwallet IPFS fallback error:', error);
    throw new Error(`Nwallet IPFS fallback failed: ${error.message}`);
  }
};

/**
 * Fallback to Nwallet IPFS service for JSON uploads when Pinata fails
 * @param jsonData Object to be uploaded as JSON
 * @param name Optional name for the file
 * @returns IPFS URL from Nwallet service
 */
const fallbackToNwalletJSONUpload = async (
  jsonData: any,
  name: string = 'metadata.json'
): Promise<string> => {
  try {
    console.log('[IPFS] Falling back to Nwallet IPFS service for JSON upload');
    
    // Send to Nwallet IPFS service
    const response = await axios.post(
      'http://3.111.22.56:5174/api/ipfs/upload/json',
      {
        data: jsonData,
        filename: name
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      }
    );
    
    if (response.data?.success && response.data?.ipfsUrl) {
      return normalizeIpfsUrl(response.data.ipfsUrl);
    } else {
      throw new Error(`Nwallet IPFS service returned error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error('[IPFS] Nwallet JSON IPFS fallback error:', error);
    throw new Error(`Nwallet JSON IPFS fallback failed: ${error.message}`);
  }
}; 