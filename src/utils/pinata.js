import axios from 'axios';

const JWT = process.env.REACT_APP_PINATA_JWT || '';
const baseURL = 'https://api.pinata.cloud';

/**
 * Check if Pinata service is connected and credentials are valid
 * @returns {Promise<boolean>} True if connected
 */
export const checkPinataConnection = async () => {
  try {
    const response = await axios.get(`${baseURL}/data/testAuthentication`, {
      headers: {
        Authorization: `Bearer ${JWT}`
      }
    });
    return response.status === 200;
  } catch (error) {
    console.error('Pinata connection failed:', error);
    return false;
  }
};

/**
 * Upload a file to IPFS via Pinata
 * @param {File} file - The file to upload 
 * @param {Object} metadata - Optional metadata for the file
 * @returns {Promise<Object>} Response with IPFS hash
 */
export const uploadFileToIPFS = async (file, metadata = {}) => {
  try {
    // Check file
    if (!file) throw new Error('No file provided');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Metadata for the file
    const metadataObj = {
      name: file.name,
      ...metadata
    };
    
    formData.append('pinataMetadata', JSON.stringify(metadataObj));
    
    // Pinning options
    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);
    
    // Upload to Pinata
    const response = await axios.post(
      `${baseURL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Content-Type': `multipart/form-data;`,
          Authorization: `Bearer ${JWT}`
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Failed to upload to Pinata: ${response.statusText}`);
    }
    
    // Return pinned data
    return {
      success: true,
      pinataUrl: `ipfs://${response.data.IpfsHash}`,
      pinataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp,
      isDuplicate: response.data.isDuplicate
    };
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    return {
      success: false,
      message: error.message,
      status: error.response?.status
    };
  }
};

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param {Object} jsonData - The metadata to upload
 * @returns {Promise<Object>} Response with IPFS hash 
 */
export const uploadJSONToIPFS = async (jsonData) => {
  try {
    // Check data
    if (!jsonData) throw new Error('No JSON data provided');
    
    // Upload to Pinata
    const response = await axios.post(
      `${baseURL}/pinning/pinJSONToIPFS`,
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JWT}`
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Failed to upload JSON to Pinata: ${response.statusText}`);
    }
    
    // Return pinned data
    return {
      success: true,
      pinataUrl: `ipfs://${response.data.IpfsHash}`,
      pinataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      ipfsHash: response.data.IpfsHash,
      timestamp: response.data.Timestamp,
      isDuplicate: response.data.isDuplicate
    };
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    return {
      success: false,
      message: error.message,
      status: error.response?.status
    };
  }
};

/**
 * Create and upload NFT metadata to IPFS 
 * @param {string} name - NFT name
 * @param {string} description - NFT description
 * @param {string} imageUrl - IPFS URL for the NFT image
 * @param {Array} attributes - Optional attributes array
 * @returns {Promise<Object>} Response with metadata URL
 */
export const uploadNFTMetadata = async (name, description, imageUrl, attributes = []) => {
  // Prepare metadata according to OpenSea metadata standards
  // https://docs.opensea.io/docs/metadata-standards
  const metadata = {
    name,
    description,
    image: imageUrl,
    attributes
  };
  
  return await uploadJSONToIPFS(metadata);
};

/**
 * MOCK DATA DISABLED - Use real Alchemy API data only
 *
 * This function has been disabled to enforce Alchemy-only NFT data usage.
 * All NFT data must come from real blockchain sources via Alchemy API.
 */
export const getMockIPFSUrl = (type = 'image') => {
  throw new Error(
    'Mock IPFS URLs have been disabled. Use real NFT data from Alchemy API only. ' +
    'NFTGen now operates as a read-only NFT viewer using blockchain data.'
  );
};