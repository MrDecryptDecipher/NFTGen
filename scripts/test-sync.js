/**
 * Test NFT Transaction Synchronization 
 * 
 * This script generates sample code to simulate an NFT minting transaction
 * and synchronize it with Nija Wallet through the browser console.
 * 
 * Run it with: node scripts/test-sync.js
 */

console.log('Starting NFT transaction sync test script...');

// Generate a random transaction hash
const generateTxHash = () => {
  return '0x' + Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

// Generate a random timestamp within the last 24 hours
const generateRecentTimestamp = () => {
  const now = Date.now();
  const hoursAgo = Math.floor(Math.random() * 24); // 0-24 hours ago
  return now - (hoursAgo * 60 * 60 * 1000);
};

// Mock IPFS URL for testing
const generateMockIPFSUrl = (hash) => {
  return `ipfs://${hash}`;
};

// Generate a mock NFT image and metadata
const generateMockNFT = () => {
  const names = ['Cosmic Explorer', 'Digital Dream', 'Ethereal Entity', 'Virtual Voyager', 'Quantum Creation'];
  const name = names[Math.floor(Math.random() * names.length)];
  
  const imageHash = 'Qm' + Array.from({length: 44}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  const metadataHash = 'Qm' + Array.from({length: 44}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return {
    name,
    imageUrl: generateMockIPFSUrl(imageHash),
    metadataUrl: generateMockIPFSUrl(metadataHash),
    fractions: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 2 : 1, // 30% chance of being fractionalized
    royaltyFee: Math.floor(Math.random() * 10) // 0-10% royalty fee
  };
};

// Create a mock NFT activity
const createMockActivity = (type = 'mint') => {
  const txHash = generateTxHash();
  const timestamp = generateRecentTimestamp();
  const nft = generateMockNFT();
  
  console.log('Generated mock NFT:', nft);
  
  return {
    type,
    hash: txHash,
    status: 'pending',
    timestamp,
    details: {
      name: nft.name,
      asset: {
        imageUrl: nft.imageUrl,
        metadataUrl: nft.metadataUrl
      },
      fractions: nft.fractions,
      royaltyFee: nft.royaltyFee
    }
  };
};

try {
  // Create a mock NFT mint activity
  console.log('Creating mock activity...');
  const activity = createMockActivity();
  console.log('Activity created:');
  console.log(JSON.stringify(activity, null, 2));
  
  // Generate code for browser console
  const browserCode = `
// Save NFT activity to localStorage
const activity = ${JSON.stringify(activity, null, 2)};
localStorage.setItem('nftgen_tx_${activity.hash}', JSON.stringify(activity));
localStorage.setItem('nftgen_latest_activity', JSON.stringify(activity));

// Also save in legacy format for backward compatibility
localStorage.setItem('nija_transaction_${activity.hash}', JSON.stringify(activity));
localStorage.setItem('nija_nftgen_latest_activity', JSON.stringify({
  activity,
  timestamp: Date.now()
}));

// Display confirmation
console.log('Activity synced to localStorage:', activity);

// Dispatch custom event
try {
  const syncEvent = new CustomEvent('nftgen-activity-sync', { 
    detail: activity 
  });
  window.dispatchEvent(syncEvent);
  console.log('Activity event dispatched');
} catch (error) {
  console.error('Error dispatching event:', error);
}
`;
  
  console.log(`
====================================================
NFT ACTIVITY SYNCHRONIZATION TEST
====================================================

Copy and paste the following code into the browser console on the Nija Wallet page 
(http://13.126.230.108:5174):

${browserCode}

This will simulate an NFT mint activity with the following details:
- Transaction Hash: ${activity.hash}
- NFT Name: ${activity.details.name}
- Status: ${activity.status}
- Type: ${activity.type}
- Timestamp: ${new Date(activity.timestamp).toLocaleString()}

The activity should appear in the Transactions tab of Nija Wallet.
You can click on it to view details in the modal we created.

====================================================
`);
} catch (error) {
  console.error('Error in test script:', error);
} 