/**
 * IPFS URL Handler Utilities
 * Following Alchemy best practices from the NFT API documentation
 */

// IPFS Gateway list in order of preference
const IPFS_GATEWAYS = [
  'https://ipfs.alchemy.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/'
];

// Cache working gateways
const gatewayCache = {};

/**
 * Standardize IPFS URL to canonical form
 */
export function standardizeIpfsUrl(url) {
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
 * Convert IPFS URL to HTTP gateway URL
 */
export function ipfsToHttpUrl(ipfsUrl) {
  if (!ipfsUrl) return '';
  
  // Standardize URL format
  const stdUrl = standardizeIpfsUrl(ipfsUrl);
  
  // If not an IPFS URL, return as is
  if (!stdUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = stdUrl.replace('ipfs://', '');
  
  // Check cache for a known working gateway
  if (gatewayCache[cid] && gatewayCache[cid].timestamp > Date.now() - 3600000) {
    return gatewayCache[cid].url;
  }
  
  // Default to first gateway
  return IPFS_GATEWAYS[0] + cid;
}

/**
 * Find a working gateway for a CID
 */
export async function findWorkingGateway(ipfsUrl) {
  if (!ipfsUrl) return '';
  
  // Standardize URL format
  const stdUrl = standardizeIpfsUrl(ipfsUrl);
  
  // If not an IPFS URL, return as is
  if (!stdUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = stdUrl.replace('ipfs://', '');
  
  // Check cache
  if (gatewayCache[cid] && gatewayCache[cid].timestamp > Date.now() - 3600000) {
    return gatewayCache[cid].url;
  }
  
  // Try each gateway
  for (const gateway of IPFS_GATEWAYS) {
    const gatewayUrl = gateway + cid;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(gatewayUrl, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Cache successful gateway
        gatewayCache[cid] = {
          url: gatewayUrl,
          timestamp: Date.now()
        };
        
        return gatewayUrl;
      }
    } catch (error) {
      // Try next gateway
    }
  }
  
  // All gateways failed, use default
  return IPFS_GATEWAYS[0] + cid;
}

/**
 * Check if a URL is an IPFS URL
 */
export function isIpfsUrl(url) {
  if (!url) return false;
  
  return url.startsWith('ipfs://') || 
         url.includes('/ipfs/') || 
         /^[a-zA-Z0-9]{46,59}$/.test(url);
}

/**
 * Load an image from IPFS with fallback
 */
export function loadIpfsImage(ipfsUrl, onSuccess, onError) {
  // Get multiple gateways
  const cid = standardizeIpfsUrl(ipfsUrl).replace('ipfs://', '');
  const gatewayUrls = IPFS_GATEWAYS.map(gateway => gateway + cid);
  
  let currentIndex = 0;
  
  function tryNextGateway() {
    if (currentIndex >= gatewayUrls.length) {
      onError && onError(new Error('All gateways failed'));
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      // Cache successful gateway
      gatewayCache[cid] = {
        url: gatewayUrls[currentIndex],
        timestamp: Date.now()
      };
      
      onSuccess && onSuccess(gatewayUrls[currentIndex]);
    };
    
    img.onerror = () => {
      currentIndex++;
      tryNextGateway();
    };
    
    img.src = gatewayUrls[currentIndex];
  }
  
  tryNextGateway();
} 