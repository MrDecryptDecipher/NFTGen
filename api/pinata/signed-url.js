/**
 * API Route for Pinata Signed URLs
 * Following official Pinata documentation for server-side signed URL generation
 * Based on Next.js API route pattern from docs
 */

import { PinataSDK } from 'pinata';

// Initialize Pinata SDK with server-side environment variables
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'rose-accepted-puma-897.mypinata.cloud'
});

/**
 * GET /api/pinata/signed-url
 * Creates a signed URL for client-side uploads
 * Following documentation: pinata.upload.public.createSignedURL()
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add authentication/authorization here if needed
    // Following docs recommendation for auth protection
    
    // Create signed URL with 30 second expiration (as per docs)
    const url = await pinata.upload.public.createSignedURL({
      expires: 30 // 30 seconds as recommended in docs
    });

    return res.status(200).json({ url });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return res.status(500).json({ 
      error: 'Failed to create signed URL',
      message: error.message 
    });
  }
}

/**
 * Alternative export for different server frameworks
 * Following documentation patterns for various frameworks
 */
export const GET = async (request) => {
  try {
    const url = await pinata.upload.public.createSignedURL({
      expires: 30
    });
    
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create signed URL',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
