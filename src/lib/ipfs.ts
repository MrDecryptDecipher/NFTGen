import axios, { AxiosRequestConfig } from 'axios';
import { ethers } from 'ethers';

// Define metadata interface following OpenSea standards
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
    trait_count?: number;
    order?: number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
      cdn?: boolean;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

// Environment variables with improved validation
const API_KEYS = {
  ALCHEMY: process.env.VITE_ALCHEMY_API_KEY || process.env.REACT_APP_ALCHEMY_API_KEY,
  PINATA_KEY: process.env.VITE_PINATA_KEY || process.env.REACT_APP_PINATA_KEY,
  PINATA_SECRET: process.env.VITE_PINATA_SECRET || process.env.REACT_APP_PINATA_SECRET,
  NFT_STORAGE: process.env.VITE_NFT_STORAGE_KEY || process.env.REACT_APP_NFT_STORAGE_KEY
};

// Validate required API keys
const validateAPIKeys = () => {
  const missingKeys = [];
  if (!API_KEYS.ALCHEMY) missingKeys.push('ALCHEMY');
  if (!API_KEYS.PINATA_KEY || !API_KEYS.PINATA_SECRET) missingKeys.push('PINATA');
  if (!API_KEYS.NFT_STORAGE) missingKeys.push('NFT_STORAGE');
  
  if (missingKeys.length > 0) {
    console.warn(`Missing API keys for: ${missingKeys.join(', ')}`);
    return false;
  }
  return true;
};

// IPFS Gateway configuration with health checks
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

// Check gateway health and response times
const checkGatewayHealth = async (gateway: string): Promise<number> => {
  try {
    const start = Date.now();
    await axios.head(`${gateway}QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx`, {
      timeout: 5000
    });
    return Date.now() - start;
  } catch {
    return Infinity;
  }
};

// Get fastest responding gateway
const getFastestGateway = async (): Promise<string> => {
  const responses = await Promise.all(
    IPFS_GATEWAYS.map(async gateway => ({
      gateway,
      responseTime: await checkGatewayHealth(gateway)
    }))
  );
  
  const fastest = responses.reduce((a, b) => 
    a.responseTime < b.responseTime ? a : b
  );
  
  return fastest.responseTime === Infinity ? IPFS_GATEWAYS[0] : fastest.gateway;
};

// Enhanced IPFS endpoints with Web3.Storage as primary provider
const ipfsEndpoints = [
  {
    name: 'Web3.Storage',
    uploadUrl: 'web3storage-service', // Special identifier for Web3.Storage service
    headers: {},
    parseResponse: (response: any) => {
      if (response?.url) {
        return response.url; // Already in ipfs:// format
      }
      throw new Error('Invalid Web3.Storage response format');
    },
    isWeb3Storage: true // Flag to identify Web3.Storage endpoint
  },
  {
    name: 'Alchemy',
    uploadUrl: 'https://ipfs.alchemy.com/api/v2/upload',
    headers: {
      'X-API-Key': API_KEYS.ALCHEMY
    },
    parseResponse: (response: any) => {
      if (response?.data?.ipfsHash) {
        return `ipfs://${response.data.ipfsHash}`;
      }
      throw new Error('Invalid Alchemy response format');
    }
  },
  {
    name: 'Pinata',
    uploadUrl: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    headers: {
      'pinata_api_key': API_KEYS.PINATA_KEY,
      'pinata_secret_api_key': API_KEYS.PINATA_SECRET
    },
    parseResponse: (response: any) => {
      if (response?.data?.IpfsHash) {
        return `ipfs://${response.data.IpfsHash}`;
      }
      throw new Error('Invalid Pinata response format');
    }
  }
];

// Improved metadata validation and normalization
const validateMetadata = (metadata: NFTMetadata): void => {
  if (!metadata.name || typeof metadata.name !== 'string') {
    throw new Error('Invalid metadata: name is required and must be a string');
  }
  if (!metadata.description || typeof metadata.description !== 'string') {
    throw new Error('Invalid metadata: description is required and must be a string');
  }
  if (!metadata.image || typeof metadata.image !== 'string') {
    throw new Error('Invalid metadata: image is required and must be a string');
  }
  if (!Array.isArray(metadata.attributes)) {
    throw new Error('Invalid metadata: attributes must be an array');
  }
};

// Enhanced metadata normalization with size checks
const normalizeMetadata = async (metadata: NFTMetadata): Promise<NFTMetadata> => {
  validateMetadata(metadata);
  
  // Ensure image is IPFS URI
  let imageUri = metadata.image;
  if (!imageUri.startsWith('ipfs://')) {
    if (imageUri.includes('ipfs/')) {
      const ipfsMatch = imageUri.match(/ipfs\/([a-zA-Z0-9]+)/);
      if (ipfsMatch?.[1]) {
        imageUri = `ipfs://${ipfsMatch[1]}`;
      }
    }
  }
  
  // Validate image size if it's a URL
  if (imageUri.startsWith('http')) {
    try {
      const response = await axios.head(imageUri);
      const sizeInMB = parseInt(response.headers['content-length']) / (1024 * 1024);
      if (sizeInMB > 100) {
        throw new Error('Image size exceeds 100MB limit');
      }
    } catch (error) {
      console.warn('Could not validate image size:', error);
    }
  }
  
  // Clean and normalize attributes
  const attributes = metadata.attributes.map(attr => ({
    trait_type: attr.trait_type,
    value: attr.value,
    ...(attr.display_type && { display_type: attr.display_type }),
    ...(attr.max_value && { max_value: attr.max_value }),
    ...(attr.trait_count && { trait_count: attr.trait_count }),
    ...(attr.order && { order: attr.order })
  }));
  
  return {
    name: metadata.name.trim(),
    description: metadata.description.trim(),
    image: imageUri,
    attributes,
    ...(metadata.external_url && { external_url: metadata.external_url }),
    ...(metadata.animation_url && { animation_url: metadata.animation_url }),
    ...(metadata.background_color && { background_color: metadata.background_color }),
    ...(metadata.properties && { properties: metadata.properties })
  };
};

// Improved upload function with retries and persistence checks
export const uploadToIPFS = async (
  file: File,
  options: { retries?: number; timeout?: number } = {}
): Promise<string> => {
  const { retries = 3, timeout = 30000 } = options;
  
  if (!validateAPIKeys()) {
    throw new Error('Missing required API keys');
  }
  
  // Validate file size
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 100MB limit');
  }
  
  const errors: Error[] = [];
  
  for (const endpoint of ipfsEndpoints) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Attempting upload to ${endpoint.name} (attempt ${attempt + 1}/${retries})`);

        // Handle Web3.Storage uploads differently
        if (endpoint.isWeb3Storage) {
          try {
            // Import Web3.Storage service dynamically
            const { web3StorageService } = await import('../services/web3Storage.service');

            // Ensure service is initialized
            if (!web3StorageService.isSpaceReady()) {
              await web3StorageService.initialize();
            }

            // Upload using Web3.Storage service
            const result = await web3StorageService.uploadFile(file, (progress) => {
              console.log(`Web3.Storage upload progress: ${progress.progress}%`);
            });

            console.log(`✅ Successfully uploaded to ${endpoint.name}: ${result.url}`);
            return result.url;

          } catch (web3Error) {
            console.warn(`Web3.Storage upload failed: ${web3Error}`);
            throw web3Error;
          }
        }

        // Handle traditional IPFS endpoints (Alchemy, Pinata)
        const formData = new FormData();
        formData.append('file', file);

        // Add Pinata-specific metadata
        if (endpoint.name === 'Pinata') {
          const metadata = JSON.stringify({
            name: file.name,
            keyvalues: {
              source: 'NFTGen',
              timestamp: Date.now()
            }
          });
          formData.append('pinataMetadata', metadata);

          const options = JSON.stringify({
            cidVersion: 1,
            wrapWithDirectory: true
          });
          formData.append('pinataOptions', options);
        }
        
        const response = await axios.post(endpoint.uploadUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...endpoint.headers
          },
          timeout
        });
        
        const ipfsUri = endpoint.parseResponse(response);
        
        // Verify the upload was successful
        if (ipfsUri && ipfsUri.startsWith('ipfs://')) {
          // Check content is accessible
          const gateway = await getFastestGateway();
          const cid = ipfsUri.replace('ipfs://', '');
          try {
            await axios.head(`${gateway}${cid}`, { timeout: 5000 });
          } catch {
            throw new Error('Content not accessible after upload');
          }
          
          console.log(`Successfully uploaded to ${endpoint.name}: ${ipfsUri}`);
          return ipfsUri;
        }
        
        throw new Error(`Invalid IPFS URI returned: ${ipfsUri}`);
      } catch (error) {
        console.error(`Upload attempt ${attempt + 1} to ${endpoint.name} failed:`, error);
        errors.push(error as Error);
        
        if (attempt < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
  }
  
  throw new Error(`All upload attempts failed: ${errors.map(e => e.message).join(', ')}`);
};

// Enhanced metadata upload with improved validation and persistence
export const uploadMetadata = async (
  metadata: NFTMetadata,
  options: { retries?: number; timeout?: number } = {}
): Promise<string> => {
  const normalizedMetadata = await normalizeMetadata(metadata);
  
  // Convert metadata to Blob
  const blob = new Blob([JSON.stringify(normalizedMetadata, null, 2)], {
    type: 'application/json'
  });
  const file = new File([blob], 'metadata.json', { type: 'application/json' });
  
  return uploadToIPFS(file, options);
};

// Helper function to convert IPFS URI to fastest gateway URL
export const ipfsToHTTP = async (ipfsUri: string): Promise<string> => {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  
  const gateway = await getFastestGateway();
  return `${gateway}${ipfsUri.replace('ipfs://', '')}`;
};