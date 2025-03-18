import axios from 'axios';

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try multiple endpoints for redundancy
    const endpoints = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://www.apple.com'
    ];
    
    // Try each endpoint with a short timeout
    for (const endpoint of endpoints) {
      try {
        // Use HEAD request to minimize data transfer
        await axios.head(endpoint, { timeout: 5000 });
        return true;
      } catch (error) {
        console.log(`Failed to reach ${endpoint}:`, error);
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, return false
    return false;
  } catch (error) {
    console.error('Error checking internet connection:', error);
    return false;
  }
} 