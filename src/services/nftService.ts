import { NFTMetadata as Web3NFTMetadata } from './web3Storage';
import { web3StorageService } from './web3Storage.service';
import { etherscanService } from './etherscanService';
import { toast } from 'react-toastify';
import { authUtils } from '../hooks/useAuth';

export interface CreateNFTParams {
  name: string;
  description: string;
  imageFile: File;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  recipientAddress: string;
  amount?: number;
}

export interface CreateNFTResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  imageUrl?: string;
  metadataUrl?: string;
  error?: string;
  // Real blockchain data
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  totalCost?: string;
  openseaUrl?: string;
  etherscanUrl?: string;
  confirmations?: number;
}

export interface ProgressCallback {
  (stage: string, progress: number, message: string): void;
}

/**
 * Complete NFT creation workflow
 */
export async function createNFT(
  params: CreateNFTParams,
  progressCallback?: ProgressCallback
): Promise<CreateNFTResult> {
  try {
    console.log('Starting NFT creation process...', params);

    // Stage 1: Validate inputs
    progressCallback?.('validation', 5, 'Validating inputs...');

    if (!params.name.trim()) {
      throw new Error('NFT name is required');
    }

    if (!params.imageFile) {
      throw new Error('Image file is required');
    }

    if (!params.recipientAddress) {
      throw new Error('Recipient address is required');
    }

    // Stage 2: Upload to IPFS
    progressCallback?.('upload', 20, 'Uploading image and metadata to IPFS...');

    const metadata: Web3NFTMetadata = {
      name: params.name,
      description: params.description,
      image: '', // Will be set by the upload service
      attributes: params.attributes,
      external_url: `${window.location.origin}/nft/` // Will be updated with token ID later
    };

    // Use real Web3.Storage service instead of mock
    console.log('🌐 Using real Web3.Storage service for IPFS upload...');

    // Initialize Web3.Storage service if not already done
    try {
      await web3StorageService.initialize();
    } catch (initError) {
      console.warn('Web3Storage initialization failed, continuing anyway:', initError);
    }

    // Upload using real Web3.Storage service
    const uploadResult = await web3StorageService.uploadNFTMetadata(
      params.imageFile,
      metadata,
      (progress) => {
        const percentage = Math.round(20 + (progress.progress * 0.3)); // 20-50% range
        progressCallback?.('upload', percentage, progress.message);
      }
    );

    progressCallback?.('upload', 50, 'IPFS upload completed successfully');

    console.log('IPFS upload result:', uploadResult);

    // Stage 3: REAL Blockchain Minting on Sepolia Testnet
    progressCallback?.('minting', 70, 'Minting NFT on REAL Ethereum Sepolia blockchain...');

    // Get wallet address from centralized authentication service
    let recipientAddress = params.recipientAddress;
    let sessionId: string | null = null;
    let userCredentials: any = null;

    // Use centralized authentication service
    try {
      // Get current session from auth service
      const session = authUtils.getSession();

      if (session && session.isValid) {
        sessionId = session.sessionId;
        recipientAddress = session.address; // Use address from authenticated session

        console.log('🔐 NFTService: Using authenticated session for address:', recipientAddress);
        console.log('🔐 NFTService: Session ID:', sessionId?.substring(0, 16) + '...');

        // Get user credentials from MongoDB via API
        try {
          userCredentials = await authUtils.getUserCredentials();
          console.log('✅ Retrieved user credentials from authenticated session');
        } catch (credError) {
          console.warn('⚠️ Error fetching user credentials:', credError);
        }
      } else {
        console.warn('⚠️ No valid authentication session found');
        throw new Error('Please authenticate with Nwallet first');
      }
    } catch (authError) {
      console.error('❌ Authentication error:', authError);
      throw new Error('Authentication failed. Please login to Nwallet first.');
    }

    // Use default test address if no wallet connected
    if (!recipientAddress) {
      recipientAddress = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
      console.log('Using default test address for minting');
    }

    console.log('🚀 Starting REAL blockchain minting...');

    // Prepare JSON data for real blockchain minting API
    const mintingData = {
      name: params.name,
      description: params.description,
      recipient: recipientAddress,
      imageUrl: uploadResult.imageUrl,
      metadataUrl: uploadResult.metadataUrl,
      imageCID: uploadResult.imageCID,
      metadataCID: uploadResult.metadataCID,
      external_url: metadata.external_url || `https://nftgen.app/nft/${Date.now()}`,
      attributes: params.attributes || [],
      sessionId: sessionId, // Include session ID for MongoDB user lookup
      userPrivateKey: userCredentials?.ethPrivateKey // Include user's private key if available
    };

    // Call REAL blockchain minting API
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://3.111.22.56:7102'}/api/mint/mint`;

    console.log('📡 Sending real blockchain minting request to:', apiUrl);
    console.log('📋 Minting data:', mintingData);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mintingData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
    }

    const mintResult = await response.json();

    if (!mintResult.success) {
      throw new Error(mintResult.error || 'REAL blockchain minting failed');
    }

    console.log('🎉 REAL blockchain minting successful!');
    console.log('🎯 Token ID:', mintResult.tokenId);
    console.log('📡 Transaction Hash:', mintResult.transactionHash);
    console.log('🔗 Contract Address:', mintResult.contractAddress);
    console.log('🔗 OpenSea URL:', mintResult.openseaUrl);
    console.log('🔗 Etherscan URL:', mintResult.etherscanUrl);
    console.log('💸 Total Cost:', mintResult.totalCost, 'ETH');

    // Monitor transaction confirmation via Etherscan
    if (mintResult.transactionHash) {
      progressCallback?.('verification', 95, 'Monitoring transaction confirmation...');

      try {
        const txStatus = await etherscanService.monitorTransaction(
          mintResult.transactionHash,
          (status) => {
            progressCallback?.('verification', 95 + (status.confirmations * 1),
              `Transaction confirmed: ${status.confirmations} confirmations`);
          },
          60000 // 1 minute timeout
        );

        console.log('✅ Transaction monitoring completed:', txStatus);
      } catch (monitorError) {
        console.warn('⚠️ Transaction monitoring failed:', monitorError);
        // Don't fail the entire process if monitoring fails
      }
    }

    progressCallback?.('complete', 100, 'REAL NFT minted successfully on blockchain!');

    const result: CreateNFTResult = {
      success: true,
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.transactionHash,
      imageUrl: mintResult.imageIPFS || uploadResult.imageUrl,
      metadataUrl: mintResult.metadataIPFS || uploadResult.metadataUrl,
      // Additional real blockchain data
      contractAddress: mintResult.contractAddress,
      blockNumber: mintResult.blockNumber,
      gasUsed: mintResult.gasUsed,
      totalCost: mintResult.totalCost,
      openseaUrl: mintResult.openseaUrl,
      etherscanUrl: mintResult.etherscanUrl,
      confirmations: mintResult.confirmations
    };

    console.log('NFT creation completed:', result);
    return result;

  } catch (error) {
    console.error('Error creating NFT:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    progressCallback?.('error', 0, `Error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Simplified NFT creation for quick testing
 */
export async function createTestNFT(
  name: string,
  description: string,
  imageFile: File,
  recipientAddress: string
): Promise<CreateNFTResult> {
  return createNFT({
    name,
    description,
    imageFile,
    recipientAddress,
    amount: 1,
    attributes: [
      { trait_type: 'Creator', value: 'NFTGen' },
      { trait_type: 'Platform', value: 'NFTGen' },
      { trait_type: 'Network', value: 'Ethereum Sepolia' }
    ]
  });
}

/**
 * Create NFT with progress updates and toast notifications
 */
export async function createNFTWithToasts(
  params: CreateNFTParams
): Promise<CreateNFTResult> {
  let toastId: any;

  const progressCallback: ProgressCallback = (stage, progress, message) => {
    console.log(`[${stage}] ${progress}% - ${message}`);

    if (toastId) {
      toast.update(toastId, {
        render: message,
        progress: progress / 100,
        type: stage === 'error' ? 'error' : 'info'
      });
    } else {
      toastId = toast.info(message, {
        progress: progress / 100,
        autoClose: false,
        closeButton: false
      });
    }
  };

  try {
    const result = await createNFT(params, progressCallback);

    if (result.success) {
      toast.update(toastId, {
        render: `NFT created successfully! Token ID: ${result.tokenId}`,
        type: 'success',
        autoClose: 5000,
        closeButton: true,
        progress: undefined
      });
    } else {
      toast.update(toastId, {
        render: `NFT creation failed: ${result.error}`,
        type: 'error',
        autoClose: 5000,
        closeButton: true,
        progress: undefined
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (toastId) {
      toast.update(toastId, {
        render: `NFT creation failed: ${errorMessage}`,
        type: 'error',
        autoClose: 5000,
        closeButton: true,
        progress: undefined
      });
    } else {
      toast.error(`NFT creation failed: ${errorMessage}`);
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Validate NFT creation parameters
 */
export function validateNFTParams(params: CreateNFTParams): string[] {
  const errors: string[] = [];

  if (!params.name?.trim()) {
    errors.push('NFT name is required');
  }

  if (!params.imageFile) {
    errors.push('Image file is required');
  } else {
    // Check file size (max 10MB)
    if (params.imageFile.size > 10 * 1024 * 1024) {
      errors.push('Image file must be less than 10MB');
    }

    // Check file type
    if (!params.imageFile.type.startsWith('image/')) {
      errors.push('File must be an image');
    }
  }

  if (!params.recipientAddress?.trim()) {
    errors.push('Recipient address is required');
  } else {
    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(params.recipientAddress)) {
      errors.push('Invalid Ethereum address format');
    }
  }

  if (params.amount && params.amount < 1) {
    errors.push('Amount must be at least 1');
  }

  return errors;
}

/**
 * Fund NFTGen with 0.02 ETH from user's Nwallet
 */
export async function fundNFTGen(): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log('💰 Starting NFTGen funding process...');

    // Get user's session from centralized authentication
    const session = authUtils.getSession();

    if (!session || !session.isValid) {
      throw new Error('No valid authentication session found. Please login to Nwallet first.');
    }

    if (!session.address) {
      throw new Error('No wallet address found in session.');
    }

    console.log('📡 Requesting funding transfer from Nwallet...');

    // Call Nwallet API to transfer 0.02 ETH to NFTGen
    const nwalletApiUrl = 'http://3.111.22.56:6102'; // Nwallet API URL
    const response = await fetch(`${nwalletApiUrl}/api/fund-nftgen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: session.address,
        amount: '0.02', // 0.02 ETH
        sessionToken: session.sessionId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fund NFTGen');
    }

    const result = await response.json();
    console.log('✅ NFTGen funding successful:', result);

    return {
      success: true,
      txHash: result.txHash
    };

  } catch (error: any) {
    console.error('❌ NFTGen funding failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check shared Nwallet balance (no separate NFTGen funding needed)
 */
export async function checkSharedNwalletBalance(): Promise<{ balance: string; address: string }> {
  try {
    // Get user's address from centralized authentication
    const session = authUtils.getSession();

    if (!session || !session.isValid) {
      throw new Error('No valid authentication session found');
    }

    const userAddress = session.address;

    console.log('🔍 Checking shared Nwallet balance for:', userAddress);

    // Check balance via Nwallet API (port 6102) - this is the shared balance
    const nwalletApiUrl = import.meta.env.VITE_WALLET_API_URL || 'http://3.111.22.56:6102';
    const response = await fetch(`${nwalletApiUrl}/api/balance/${userAddress}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status}`);
    }

    const result = await response.json();

    // Handle the nested response structure
    const balance = result.success && result.data ? result.data.balance : result.balance;

    console.log('💰 Shared wallet balance:', balance, 'ETH');

    return {
      balance: balance || '0',
      address: userAddress
    };

  } catch (error: any) {
    console.error('Failed to check shared Nwallet balance:', error);
    return {
      balance: '0',
      address: ''
    };
  }
}

/**
 * @deprecated Use checkSharedNwalletBalance instead
 * Check NFTGen balance for current user
 */
export async function checkNFTGenBalance(): Promise<{ balance: string; address: string }> {
  console.warn('⚠️ checkNFTGenBalance is deprecated. Use checkSharedNwalletBalance instead.');
  return checkSharedNwalletBalance();
}

export default {
  createNFT,
  createTestNFT,
  createNFTWithToasts,
  validateNFTParams,
  fundNFTGen, // @deprecated - no longer needed with shared credentials
  checkNFTGenBalance, // @deprecated - use checkSharedNwalletBalance
  checkSharedNwalletBalance
};