/**
 * Utility functions for handling image URLs and loading
 */

// List of CORS-friendly IPFS gateways to try (using dedicated Pinata gateway first)
const IPFS_GATEWAYS = [
  'https://rose-accepted-puma-897.mypinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://ipfs.eth.aragon.network/ipfs/'
];

// Default placeholder images
const PLACEHOLDER_IMAGES = [
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTAiIGhlaWdodD0iMjUwIiB2aWV3Qm94PSIwIDAgMjUwIDI1MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjI1MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNnB4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIj5JbWFnZSB1bmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=',
  '/assets/fallback-nft.svg',
  '/assets/placeholder.png'
];

const DEFAULT_PLACEHOLDER = PLACEHOLDER_IMAGES[0];

/**
 * Format an image URL for display
 * Handles IPFS URLs, HTTP URLs, and provides fallbacks
 * 
 * @param url The original image URL
 * @returns A properly formatted URL that can be used in <img> tags
 */
export function formatImageUrl(url: string): string {
  if (!url) {
    return PLACEHOLDER_IMAGES[0];
  }

  // If already a data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }

  // If it's an IPFS URL, use the getGatewayUrl function from ipfs-adapter
  if (url.startsWith('ipfs://') || url.includes('/ipfs/')) {
    try {
      // Dynamically import to avoid circular dependencies
      const { getGatewayUrl } = require('./ipfs-adapter');
      return getGatewayUrl(url);
    } catch (e) {
      // If import fails, use our own simple conversion
      const cid = url.startsWith('ipfs://') 
        ? url.substring(7) 
        : url.includes('/ipfs/') 
          ? url.split('/ipfs/')[1] 
          : url;
      
      return `${IPFS_GATEWAYS[0]}${cid}`;
    }
  }

  // Handle relative URLs
  if (url.startsWith('/')) {
    return url;
  }

  // If it's an HTTP URL, return as is
  if (url.startsWith('http')) {
    return url;
  }

  // For unknown formats, treat as plain text and return a data URL
  try {
    return createSVGDataUrl(`NFT: ${url}`);
  } catch (e) {
    return PLACEHOLDER_IMAGES[0];
  }
}

/**
 * Get a list of fallback image URLs for a given source
 * 
 * @param src The original image source URL
 * @returns Array of fallback URLs to try
 */
export function getImageFallbacks(src: string): string[] {
  const fallbacks: string[] = [];

  // If IPFS URL, try different gateways
  if (src && (src.startsWith('ipfs://') || src.includes('/ipfs/'))) {
    const cid = src.startsWith('ipfs://')
      ? src.substring(7)
      : src.includes('/ipfs/')
        ? src.split('/ipfs/')[1]
        : null;

    if (cid) {
      // Add other gateway URLs
      IPFS_GATEWAYS.forEach(gateway => {
        fallbacks.push(`${gateway}${cid}`);
      });
    }
  }

  // Add placeholder images as last resort fallbacks
  fallbacks.push(...PLACEHOLDER_IMAGES);

  return fallbacks;
}

/**
 * Create a data URL for a simple SVG containing text
 * Useful for generating fallback images with custom messages
 * 
 * @param text Text to display in SVG
 * @returns Data URL of SVG
 */
export function createSVGDataUrl(text: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250" fill="none">
      <rect width="250" height="250" fill="#333"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#aaa" font-size="16px" font-family="system-ui, sans-serif">${text}</text>
    </svg>
  `;
  
  // Convert SVG to Base64 data URL
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
}

/**
 * Handles image loading errors by trying fallback URLs
 * @param event The error event
 * @param fallbacks Array of fallback URLs to try
 * @param currentIndex Current index in the fallbacks array
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbacks: string[],
  currentIndex: number = 0
): void => {
  const img = event.currentTarget;
  
  // Try the next fallback if available
  if (currentIndex < fallbacks.length - 1) {
    img.src = fallbacks[currentIndex + 1];
    
    // Update the data attribute to track current fallback index
    img.setAttribute('data-fallback-index', (currentIndex + 1).toString());
  } else {
    // If we've tried all fallbacks, use a data URI as last resort
    img.src = PLACEHOLDER_IMAGES[2]; // Use the SVG data URI
    
    // Remove the onerror handler to prevent infinite loops
    img.onerror = null;
  }
};
