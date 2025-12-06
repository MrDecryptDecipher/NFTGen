/**
 * Utility functions for generating standardized Etherscan links
 */

export type EtherscanNetwork = 'mainnet' | 'sepolia' | 'goerli';

// Default network for the application
export const DEFAULT_NETWORK = 'sepolia';

/**
 * Get the base URL for a specific Etherscan network
 * @param network The Ethereum network
 * @returns Base URL for the Etherscan instance
 */
export function getEtherscanBaseUrl(network: EtherscanNetwork = DEFAULT_NETWORK): string {
  switch (network) {
    case 'mainnet':
      return 'https://etherscan.io';
    case 'sepolia':
      return 'https://sepolia.etherscan.io';
    case 'goerli':
      return 'https://goerli.etherscan.io';
    default:
      return 'https://sepolia.etherscan.io';
  }
}

/**
 * Get an Etherscan URL for a transaction
 * @param txHash Transaction hash
 * @param network The Ethereum network
 * @returns Etherscan URL for the transaction
 */
export function getTransactionUrl(txHash: string, network?: EtherscanNetwork): string {
  if (!txHash) return '';
  return `${getEtherscanBaseUrl(network)}/tx/${txHash}`;
}

/**
 * Get an Etherscan URL for a token
 * @param contractAddress Contract address of the token
 * @param tokenId Token ID (for ERC-721/ERC-1155)
 * @param network The Ethereum network
 * @returns Etherscan URL for the token
 */
export function getTokenUrl(contractAddress: string, tokenId: string, network?: EtherscanNetwork): string {
  if (!contractAddress) return '';
  return `${getEtherscanBaseUrl(network)}/token/${contractAddress}?a=${tokenId}`;
}

/**
 * Get an Etherscan URL for an address
 * @param address Ethereum address
 * @param network The Ethereum network
 * @returns Etherscan URL for the address
 */
export function getAddressUrl(address: string, network?: EtherscanNetwork): string {
  if (!address) return '';
  return `${getEtherscanBaseUrl(network)}/address/${address}`;
}

/**
 * Generate an Etherscan verification badge HTML
 * @param contractAddress Contract address to verify
 * @param network The Ethereum network
 * @returns HTML string for the verification badge
 */
export function getVerificationBadge(contractAddress: string, network?: EtherscanNetwork): string {
  if (!contractAddress) return '';
  const baseUrl = getEtherscanBaseUrl(network);
  return `<a href="${baseUrl}/address/${contractAddress}#code" target="_blank" rel="noopener noreferrer">
    <img src="${baseUrl}/images/svg/brands/icon-ethereum-verified.svg" alt="Verified on Etherscan" width="20" height="20" />
  </a>`;
}

/**
 * Check if a transaction is confirmed by its hash
 * @param txHash Transaction hash
 * @param network The Ethereum network
 * @returns Promise resolving to a boolean indicating if the transaction is confirmed
 */
export async function isTransactionConfirmed(txHash: string, network?: EtherscanNetwork): Promise<boolean> {
  try {
    // In a real implementation, this would make an API call to check the transaction status
    // For demo purposes, we're just returning true if the hash exists
    return Boolean(txHash && txHash.startsWith('0x'));
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return false;
  }
} 