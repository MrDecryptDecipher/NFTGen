/**
 * API Proxy Module
 *
 * This module provides proxy functions for interacting with external APIs
 * while handling CORS issues gracefully.
 */

/**
 * Upload a file to IPFS via NFT.Storage
 *
 * @param file The file to upload
 * @returns Promise with IPFS URL
 */
export async function uploadFileToNftStorage(file: File): Promise<string> {
  try {
    // Note: base64 conversion removed as it was unused

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // First try with fetch and proper authorization
    try {
      const response = await fetch('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
          // Use a properly formatted NFT.Storage API key (JWT format)
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEZmMTQ0MjVCODFGNzA3NDVGMTQ0MjVCODFGNzA3NDVGIiwiaXNzIjoibmZ0LXN0b3JhZ2UiLCJpYXQiOjE2OTg3NjU0MzI3NDcsIm5hbWUiOiJORlRHZW4ifQ.mJ8Xh_OPSuUoNxVBCx9dCRH3AoR_8TwlmElP9rdGLpk'
        },
        body: formData,
        // Set mode to cors explicitly
        mode: 'cors',
        // Allow credentials to be sent with the request
        credentials: 'same-origin'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.value?.cid) {
          return `ipfs://${data.value.cid}`;
        }
      }

      throw new Error(`NFT.Storage upload failed: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.warn("Direct NFT.Storage upload failed, trying with iframe technique...", error);
      return await uploadWithIframe(file);
    }
  } catch (error) {
    console.error("All IPFS upload methods failed", error);
    throw error;
  }
}

/**
 * Upload a file using a temporary iframe to bypass CORS
 * This is a fallback approach for browsers
 * DISABLED: This function causes cross-origin storage access errors
 *
 * @param file File to upload
 * @returns Promise with IPFS URL
 */
function uploadWithIframe(_file: File): Promise<string> {
  return Promise.reject(new Error('Iframe upload disabled due to cross-origin storage access issues. Please use direct API upload instead.'));

  // Commented out to prevent cross-origin storage errors
  /*
  return new Promise((resolve, reject) => {
    // Create a hidden form
    const form = document.createElement('form');
    form.style.display = 'none';
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    form.action = 'https://api.nft.storage/upload';

    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.name = 'file';

    // Create a File object with the same content as the input file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Add auth token
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'token';
    tokenInput.value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEZmMTQ0MjVCODFGNzA3NDVGMTQ0MjVCODFGNzA3NDVGIiwiaXNzIjoibmZ0LXN0b3JhZ2UiLCJpYXQiOjE2OTg3NjU0MzI3NDcsIm5hbWUiOiJORlRHZW4ifQ.mJ8Xh_OPSuUoNxVBCx9dCRH3AoR_8TwlmElP9rdGLpk';

    // Create iframe to handle response
    const iframe = document.createElement('iframe');
    iframe.name = 'upload-target';
    iframe.style.display = 'none';

    // Add elements to the form
    form.appendChild(fileInput);
    form.appendChild(tokenInput);
    form.target = 'upload-target';

    // Add form and iframe to document
    document.body.appendChild(form);
    document.body.appendChild(iframe);

    // Set timeout for upload
    const timeout = setTimeout(() => {
      cleanUp();
      reject(new Error('Upload timeout after 30 seconds'));
    }, 30000);

    // Handle iframe load
    iframe.onload = () => {
      try {
        const iframeContent = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeContent) {
          const responseText = iframeContent.body.innerText;
          if (responseText) {
            const data = JSON.parse(responseText);
            if (data.value?.cid) {
              cleanUp();
              resolve(`ipfs://${data.value.cid}`);
              return;
            }
          }
        }
        cleanUp();
        reject(new Error('Invalid response from NFT.Storage'));
      } catch (error) {
        cleanUp();
        reject(error);
      }
    };

    // Handle errors
    iframe.onerror = (error) => {
      cleanUp();
      reject(error);
    };

    // Clean up function
    const cleanUp = () => {
      clearTimeout(timeout);
      document.body.removeChild(form);
      document.body.removeChild(iframe);
    };

    // Submit the form
    form.submit();
  });
  */
}

// Removed mockIpfsUpload function - no mock data allowed

/**
 * Get public gateway URL for IPFS content
 * @param ipfsUrl IPFS URL (ipfs://CID)
 * @returns HTTP URL for the content
 */
export function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl) return '';

  if (ipfsUrl.startsWith('ipfs://')) {
    // Use a CORS-friendly gateway
    return ipfsUrl.replace('ipfs://', 'https://nftstorage.link/ipfs/');
  }

  return ipfsUrl;
}

export default {
  uploadFileToNftStorage,
  ipfsToHttp
};