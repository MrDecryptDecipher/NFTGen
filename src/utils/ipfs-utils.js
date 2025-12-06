/**
 * IPFS URL Handling Utilities
 * 
 * This module provides helper functions for working with IPFS URLs
 * following Alchemy's best practices for NFT metadata.
 */

// IPFS Gateways in order of preference
const IPFS_GATEWAYS = [
  'https://ipfs.alchemy.com/ipfs/',  // Alchemy (preferred for its reliability)
  'https://ipfs.io/ipfs/',           // IPFS.io (good general purpose gateway)
  'https://cloudflare-ipfs.com/ipfs/', // Cloudflare (fast and reliable)
  'https://gateway.pinata.cloud/ipfs/', // Pinata
  'https://dweb.link/ipfs/',         // Protocol Labs
  'https://nftstorage.link/ipfs/'    // NFT.Storage
];

// Cache successful gateway lookups
const gatewayCache = {};

/**
 * Normalizes any IPFS URL to the canonical ipfs:// format
 * 
 * @param {string} url - URL to normalize (may be ipfs://, /ipfs/, or gateway URL)
 * @returns {string} - Canonical ipfs:// URL or the original if not IPFS
 */
export function formatIPFSUrl(url) {
  if (!url) return '';
  
  // Already in canonical form
  if (url.startsWith('ipfs://')) {
    return url;
  }
  
  // Handle gateway URLs
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      return `ipfs://${parts[1]}`;
    }
  }
  
  // Handle bare CID
  if (/^[a-zA-Z0-9]{46,59}$/.test(url)) {
    return `ipfs://${url}`;
  }
  
  // Not an IPFS URL
  return url;
}

/**
 * Converts an IPFS URL to a gateway URL for display
 * 
 * @param {string} ipfsUrl - IPFS URL (ipfs://CID)
 * @param {number} [gatewayIndex=0] - Index of gateway to use (defaults to first)
 * @returns {string} - HTTP URL for accessing the content
 */
export function ipfsToHttpUrl(ipfsUrl, gatewayIndex = 0) {
  if (!ipfsUrl) return '';
  
  // Normalize URL first
  const normalizedUrl = formatIPFSUrl(ipfsUrl);
  
  // If not an IPFS URL, return as is
  if (!normalizedUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = normalizedUrl.replace('ipfs://', '');
  
  // Use specified gateway or default to first
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return gateway + cid;
}

/**
 * Finds a working gateway for a specific CID
 * 
 * @param {string} ipfsUrl - IPFS URL (ipfs://CID)
 * @returns {Promise<string>} - HTTP URL using a working gateway
 */
export async function findWorkingGateway(ipfsUrl) {
  if (!ipfsUrl) return '';
  
  // Normalize URL first
  const normalizedUrl = formatIPFSUrl(ipfsUrl);
  
  // If not an IPFS URL, return as is
  if (!normalizedUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = normalizedUrl.replace('ipfs://', '');
  
  // Check cache first (valid for 1 hour)
  if (gatewayCache[cid] && 
      gatewayCache[cid].timestamp > Date.now() - 3600000) {
    return gatewayCache[cid].url;
  }
  
  // Try each gateway until one works
  for (const gateway of IPFS_GATEWAYS) {
    const gatewayUrl = gateway + cid;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(gatewayUrl, { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Cache the successful gateway
        gatewayCache[cid] = {
          url: gatewayUrl,
          timestamp: Date.now()
        };
        
        return gatewayUrl;
      }
    } catch (error) {
      // Continue to next gateway
      console.warn(`Gateway ${gateway} failed for ${cid}`);
    }
  }
  
  // If all gateways fail, use the first one
  const fallbackUrl = IPFS_GATEWAYS[0] + cid;
  
  // Cache the fallback
  gatewayCache[cid] = {
    url: fallbackUrl,
    timestamp: Date.now()
  };
  
  return fallbackUrl;
}

/**
 * Gets multiple gateway URLs for a CID to enable client-side fallback
 * 
 * @param {string} ipfsUrl - IPFS URL (ipfs://CID)
 * @param {number} [count=3] - Number of gateway URLs to return
 * @returns {string[]} - Array of HTTP gateway URLs
 */
export function getMultipleGateways(ipfsUrl, count = 3) {
  if (!ipfsUrl) return [];
  
  // Normalize URL first
  const normalizedUrl = formatIPFSUrl(ipfsUrl);
  
  // If not an IPFS URL, return as is in an array
  if (!normalizedUrl.startsWith('ipfs://')) {
    return [ipfsUrl];
  }
  
  const cid = normalizedUrl.replace('ipfs://', '');
  
  // Return the requested number of gateway URLs
  return IPFS_GATEWAYS
    .slice(0, Math.min(count, IPFS_GATEWAYS.length))
    .map(gateway => gateway + cid);
}

/**
 * Determines if a URL is an IPFS URL
 * 
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's an IPFS URL
 */
export function isIPFSUrl(url) {
  if (!url) return false;
  
  return url.startsWith('ipfs://') || 
         url.includes('/ipfs/') || 
         /^[a-zA-Z0-9]{46,59}$/.test(url);
}

/**
 * Loads an image from IPFS with gateway fallback
 * 
 * @param {string} ipfsUrl - IPFS URL to the image
 * @param {Function} onSuccess - Callback when image loads successfully
 * @param {Function} onError - Callback when all gateways fail
 */
export function loadIPFSImage(ipfsUrl, onSuccess, onError) {
  if (!ipfsUrl) {
    onError && onError(new Error('No IPFS URL provided'));
    return;
  }
  
  // Get multiple gateway URLs
  const gatewayUrls = getMultipleGateways(ipfsUrl);
  let currentIndex = 0;
  
  function tryNextGateway() {
    if (currentIndex >= gatewayUrls.length) {
      onError && onError(new Error('All gateways failed'));
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      // Successfully loaded
      onSuccess && onSuccess(gatewayUrls[currentIndex]);
      
      // Cache this successful gateway
      const cid = formatIPFSUrl(ipfsUrl).replace('ipfs://', '');
      gatewayCache[cid] = {
        url: gatewayUrls[currentIndex],
        timestamp: Date.now()
      };
    };
    
    img.onerror = () => {
      // Try next gateway
      currentIndex++;
      tryNextGateway();
    };
    
    img.src = gatewayUrls[currentIndex];
  }
  
  // Start trying gateways
  tryNextGateway();
}

/**
 * Extracts CID from any IPFS URL format
 * 
 * @param {string} url - IPFS URL in any format
 * @returns {string} - Just the CID
 */
export function extractCID(url) {
  if (!url) return '';
  
  // Handle ipfs:// URLs
  if (url.startsWith('ipfs://')) {
    return url.substring(7);
  }
  
  // Handle gateway URLs
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/');
    if (parts.length > 1) {
      return parts[1];
    }
  }
  
  // Handle bare CID
  if (/^[a-zA-Z0-9]{46,59}$/.test(url)) {
    return url;
  }
  
  return '';
} 