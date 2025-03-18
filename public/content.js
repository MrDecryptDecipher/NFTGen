// content.js - Content script for NFTGen
console.log("In CONTENT.JS");

// Function to safely inject our script into the page
const injectCustomScript = () => {
  try {
    // This runs in the context of the content script, not the page
    console.log("Preparing to inject custom script");
    
    // Create script element
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inpage.js');
    script.id = 'nftgen-injected-script';
    script.type = 'text/javascript';
    script.onload = () => {
      console.log('NFTGen inpage script loaded successfully');
      script.remove(); // Remove script element after loading
    };
    
    // Inject into page
    (document.head || document.documentElement).appendChild(script);
    console.log("success 🔍 openlayer script injected");
  } catch (error) {
    console.error('Error injecting script:', error);
  }
};

// Wait for DOMContentLoaded if needed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectCustomScript);
} else {
  injectCustomScript();
}

// Listen for messages from the page and relay them to the extension
window.addEventListener('message', (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  
  try {
    console.log("event>>>>>>>> ", event);
    
    // Check if this is a message we're interested in
    if (event.data && event.data.type === 'FROM_PAGE_TO_CONTENT') {
      // Forward to background script if needed
      chrome.runtime.sendMessage(event.data);
    }
    
    // Handle Nija Wallet related messages
    if (event.data && event.data.type === 'nftgen-activity-sync') {
      console.log('Received activity sync message:', event.data);
      
      // Save to localStorage for potential later use
      try {
        localStorage.setItem('nftgen_last_activity', JSON.stringify(event.data));
      } catch (e) {
        console.error('Error saving activity data:', e);
      }
      
      // Create and dispatch an event for other parts of the extension to handle
      const customEvent = new CustomEvent('nftgen-activity-sync', {
        detail: event.data
      });
      window.dispatchEvent(customEvent);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Create a simple inpage.js script that doesn't try to redefine ethereum
const createInpageScript = () => {
  const inpageCode = `
    // Simple script to check if ethereum exists and enhance it if needed
    (function() {
      try {
        // Don't try to define ethereum if it already exists
        if (window.ethereum) {
          console.log('Ethereum provider already exists, enhancing it safely');
          
          // Only add our properties if they don't already exist
          if (!window.ethereum.isNFTGen) {
            Object.defineProperty(window.ethereum, 'isNFTGen', {
              value: true,
              writable: true,
              configurable: true
            });
          }
          
          // Mark as patched to avoid multiple attempts
          if (!window.ethereum.__nftgenPatched) {
            Object.defineProperty(window.ethereum, '__nftgenPatched', {
              value: true,
              writable: true,
              configurable: true
            });
          }
        } else {
          console.log('No ethereum provider exists, creating NFTGen provider');
          
          // Create a minimal provider
          const provider = {
            isNFTGen: true,
            __nftgenPatched: true,
            isMetaMask: false,
            // Add basic methods
            request: async (args) => {
              console.log('NFTGen provider request:', args);
              
              // Handle specific methods
              if (args.method === 'eth_accounts') {
                return []; // Return empty accounts array
              }
              
              throw new Error(\`Method \${args.method} not implemented\`);
            },
            on: (event, handler) => {
              console.log(\`Registered handler for \${event}\`);
              return provider;
            },
            removeListener: (event, handler) => {
              console.log(\`Removed handler for \${event}\`);
              return provider;
            }
          };
          
          // Safely define ethereum property
          Object.defineProperty(window, 'ethereum', {
            value: provider,
            writable: true,
            configurable: true
          });
        }
        
        console.log('NFTGen inpage script completed successfully');
      } catch (error) {
        console.error('NFTGen inpage script error:', error);
      }
    })();
  `;
  
  // Create a Blob from the script
  const blob = new Blob([inpageCode], { type: 'application/javascript' });
  
  // Create URL for the Blob
  const blobURL = URL.createObjectURL(blob);
  
  // Return the URL
  return blobURL;
};

// Create and register the inpage.js file
try {
  const inpageURL = createInpageScript();
  
  // Override the chrome.runtime.getURL function for our script
  const originalGetURL = chrome.runtime.getURL;
  chrome.runtime.getURL = function(path) {
    if (path === 'inpage.js') {
      return inpageURL;
    }
    return originalGetURL.call(chrome.runtime, path);
  };
} catch (error) {
  console.error('Error creating inpage script:', error);
} 