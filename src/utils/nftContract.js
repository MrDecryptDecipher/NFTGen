import { ethers } from 'ethers';

const NFT_CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890'; 
const NFT_CONTRACT_ABI = [
  "function mint(address to, string memory tokenURI) public returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function totalSupply() public view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)"
];

/**
 * Gets an instance of the NFT contract
 * @param {ethers.providers.JsonRpcSigner | null} signer - The signer to use for transactions
 * @param {ethers.providers.JsonRpcProvider | null} provider - The provider to use for read-only operations
 * @returns {ethers.Contract} The NFT contract instance
 */
export const getNFTContract = (signer = null, provider = null) => {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT contract address not set');
  }

  if (signer) {
    return new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer);
  } else if (provider) {
    return new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
  } else {
    throw new Error('Either signer or provider must be provided');
  }
};

/**
 * Mints an NFT to the specified address
 * @param {ethers.providers.JsonRpcSigner} signer - The signer to use for the transaction
 * @param {string} to - The address to mint the NFT to
 * @param {string} tokenURI - The URI of the NFT metadata
 * @returns {Promise<string>} The transaction hash
 */
export const mintNFT = async (signer, to, tokenURI) => {
  console.log('Minting NFT with params:', { to, tokenURI });
  
  if (!signer) {
    throw new Error('Signer is required to mint NFT');
  }

  try {
    const contract = getNFTContract(signer);
    
    // Estimate gas for the transaction
    const gasEstimate = await contract.estimateGas.mint(to, tokenURI);
    console.log('Gas estimate for mint:', gasEstimate.toString());

    // Increase gas limit by 20% to account for potential variations
    const gasLimit = gasEstimate.mul(120).div(100);
    
    const tx = await contract.mint(to, tokenURI, {
      gasLimit
    });
    
    console.log('Mint transaction submitted:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Mint transaction confirmed:', receipt);
    
    return tx.hash;
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
};

/**
 * Gets the tokenURI for a specific token ID
 * @param {ethers.providers.JsonRpcProvider} provider - The provider to use for the query
 * @param {number} tokenId - The ID of the token to query
 * @returns {Promise<string>} The token URI
 */
export const getTokenURI = async (provider, tokenId) => {
  if (!provider) {
    throw new Error('Provider is required to get token URI');
  }

  try {
    const contract = getNFTContract(null, provider);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Error getting token URI:', error);
    throw error;
  }
};

export default {
  getNFTContract,
  mintNFT,
  getTokenURI
}; 