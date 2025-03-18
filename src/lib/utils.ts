/**
 * Utility functions for the NFTGen application
 */

/**
 * Converts an IPFS URL to a gateway URL
 * @param url The IPFS URL to convert
 * @returns The gateway URL
 */
export function formatIpfsUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return url;
} 