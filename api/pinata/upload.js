/**
 * API Route for Pinata File Uploads
 * Following official Pinata documentation for server-side uploads
 * Based on Next.js API route pattern from docs (lines 244-264)
 */

import { PinataSDK } from 'pinata';

// Initialize Pinata SDK with server-side environment variables
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'rose-accepted-puma-897.mypinata.cloud'
});

/**
 * POST /api/pinata/upload
 * Handles file uploads to Pinata IPFS
 * Following documentation pattern from lines 250-264
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data (multipart/form-data)
    const data = await req.formData();
    const file = data.get('file');
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload file to Pinata following docs pattern
    const { cid } = await pinata.upload.public.file(file);
    
    // Convert CID to gateway URL following docs pattern
    const url = await pinata.gateways.public.convert(cid);
    
    return res.status(200).json({ 
      cid,
      url,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
}

/**
 * Alternative export for modern server frameworks
 * Following documentation patterns for various frameworks
 */
export const POST = async (request) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Upload with metadata support following docs
    const upload = await pinata.upload.public
      .file(file)
      .name(file.name)
      .keyvalues({
        uploaded_at: new Date().toISOString(),
        upload_method: 'server-side'
      });
    
    // Convert to gateway URL
    const url = await pinata.gateways.public.convert(upload.cid);
    
    return new Response(JSON.stringify({ 
      ...upload,
      url
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Handle JSON uploads
 * Following documentation for JSON upload patterns
 */
export const uploadJSON = async (jsonData, metadata = {}) => {
  try {
    const upload = await pinata.upload.public
      .json(jsonData)
      .name(metadata.name || 'data.json')
      .keyvalues({
        type: 'json',
        uploaded_at: new Date().toISOString(),
        ...metadata.keyvalues
      });
    
    const url = await pinata.gateways.public.convert(upload.cid);
    
    return {
      ...upload,
      url
    };
  } catch (error) {
    console.error('JSON upload error:', error);
    throw error;
  }
};
