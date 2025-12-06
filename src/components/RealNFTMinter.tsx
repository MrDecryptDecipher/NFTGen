/**
 * Real NFT Minter Component - Production Grade Implementation
 * 
 * This component provides a complete interface for real NFT minting with:
 * - Real IPFS storage via Storacha
 * - Smart contract interaction on Sepolia testnet
 * - Real-time progress tracking
 * - Transaction verification and confirmation
 * - Comprehensive error handling
 * - Cost estimation and gas optimization
 */

import React, { useState, useEffect } from 'react';
import { realNFTMintingService } from '../services/realNFTMinting.service';

interface NFTMintingForm {
  name: string;
  description: string;
  image: File | null;
  recipient: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  external_url: string;
}

interface MintingProgress {
  stage: string;
  progress: number;
  message: string;
  transactionHash?: string;
  gasEstimate?: string;
}

interface ServiceStatus {
  initialized: boolean;
  providerConnected: boolean;
  signerReady: boolean;
  contractAccessible: boolean;
  storageReady: boolean;
  networkName: string;
  signerAddress: string;
  signerBalance: string;
}

export const RealNFTMinter: React.FC = () => {
  const [form, setForm] = useState<NFTMintingForm>({
    name: '',
    description: '',
    image: null,
    recipient: '',
    attributes: [],
    external_url: ''
  });

  const [isMinting, setIsMinting] = useState(false);
  const [progress, setProgress] = useState<MintingProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [costEstimate, setCostEstimate] = useState<any>(null);

  // Initialize service and check status
  useEffect(() => {
    initializeService();
    checkServiceStatus();
    estimateCost();
  }, []);

  const initializeService = async () => {
    try {
      console.log('🔧 Initializing Real NFT Minting Service...');
      await realNFTMintingService.initialize();
      console.log('✅ Service initialized successfully');
    } catch (error: any) {
      console.error('❌ Service initialization failed:', error);
      setError(`Service initialization failed: ${error.message}`);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const status = await realNFTMintingService.getStatus();
      setServiceStatus(status);
      console.log('📊 Service status:', status);
    } catch (error: any) {
      console.error('❌ Failed to get service status:', error);
    }
  };

  const estimateCost = async () => {
    try {
      const estimate = await realNFTMintingService.estimateMintingCost();
      setCostEstimate(estimate);
      console.log('💸 Cost estimate:', estimate);
    } catch (error: any) {
      console.error('❌ Failed to estimate cost:', error);
    }
  };

  const handleInputChange = (field: keyof NFTMintingForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setError(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
        return;
      }

      setForm(prev => ({ ...prev, image: file }));
      setError('');
    }
  };

  const addAttribute = () => {
    setForm(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }]
    }));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setForm(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      )
    }));
  };

  const removeAttribute = (index: number) => {
    setForm(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.description.trim()) return 'Description is required';
    if (!form.image) return 'Image is required';
    if (!form.recipient.trim()) return 'Recipient address is required';
    
    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.recipient)) {
      return 'Invalid Ethereum address format';
    }

    return null;
  };

  const handleMint = async () => {
    try {
      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsMinting(true);
      setError('');
      setResult(null);
      setProgress(null);

      console.log('🎨 Starting real NFT minting...');

      // Prepare minting request
      const mintingRequest = {
        name: form.name,
        description: form.description,
        image: form.image!,
        recipient: form.recipient,
        attributes: form.attributes.filter(attr => attr.trait_type && attr.value),
        external_url: form.external_url || undefined
      };

      // Execute minting with progress tracking
      const mintingResult = await realNFTMintingService.mintNFT(
        mintingRequest,
        (progressUpdate) => {
          setProgress(progressUpdate);
          console.log('📊 Progress:', progressUpdate);
        }
      );

      console.log('🎉 NFT minted successfully:', mintingResult);
      setResult(mintingResult);

      // Reset form
      setForm({
        name: '',
        description: '',
        image: null,
        recipient: '',
        attributes: [],
        external_url: ''
      });

    } catch (error: any) {
      console.error('❌ NFT minting failed:', error);
      setError(`Minting failed: ${error.message}`);
    } finally {
      setIsMinting(false);
      setProgress(null);
    }
  };

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'uploading_image': return 'bg-blue-500';
      case 'uploading_metadata': return 'bg-purple-500';
      case 'estimating_gas': return 'bg-yellow-500';
      case 'signing_transaction': return 'bg-orange-500';
      case 'broadcasting': return 'bg-indigo-500';
      case 'confirming': return 'bg-green-500';
      case 'complete': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎨 Real NFT Minter
        </h2>
        <p className="text-gray-600">
          Create and mint real NFTs on Sepolia testnet with IPFS storage
        </p>
      </div>

      {/* Service Status */}
      {serviceStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🔧 Service Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className={`p-2 rounded ${serviceStatus.initialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Initialized: {serviceStatus.initialized ? '✅' : '❌'}
            </div>
            <div className={`p-2 rounded ${serviceStatus.providerConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Provider: {serviceStatus.providerConnected ? '✅' : '❌'}
            </div>
            <div className={`p-2 rounded ${serviceStatus.contractAccessible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Contract: {serviceStatus.contractAccessible ? '✅' : '❌'}
            </div>
            <div className={`p-2 rounded ${serviceStatus.storageReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Storage: {serviceStatus.storageReady ? '✅' : '❌'}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Network: {serviceStatus.networkName} | 
            Signer: {serviceStatus.signerAddress.substring(0, 10)}... | 
            Balance: {parseFloat(serviceStatus.signerBalance).toFixed(4)} ETH
          </div>
        </div>
      )}

      {/* Cost Estimate */}
      {costEstimate && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">💸 Estimated Minting Cost</h3>
          <div className="text-sm text-gray-700">
            Gas: {costEstimate.gasEstimate} units | 
            Price: {costEstimate.gasPrice} gwei | 
            Cost: {costEstimate.estimatedCostETH} ETH (~${costEstimate.estimatedCostUSD})
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800">
            <strong>❌ Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress.message}
            </span>
            <span className="text-sm text-gray-500">
              {progress.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.stage)}`}
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          {progress.transactionHash && (
            <div className="mt-2 text-xs text-blue-600">
              Transaction: {progress.transactionHash}
            </div>
          )}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            🎉 NFT Minted Successfully!
          </h3>
          <div className="space-y-2 text-sm">
            <div><strong>Token ID:</strong> {result.tokenId}</div>
            <div><strong>Transaction:</strong> 
              <a href={result.etherscanUrl} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:underline ml-1">
                {result.transactionHash.substring(0, 20)}...
              </a>
            </div>
            <div><strong>OpenSea:</strong> 
              <a href={result.openseaUrl} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:underline ml-1">
                View on OpenSea
              </a>
            </div>
            <div><strong>Cost:</strong> {result.totalCost} ETH</div>
            <div><strong>IPFS Image:</strong> {result.imageIPFS}</div>
            <div><strong>IPFS Metadata:</strong> {result.metadataIPFS}</div>
          </div>
        </div>
      )}

      {/* Minting Form */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NFT Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter NFT name"
              disabled={isMinting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address *
            </label>
            <input
              type="text"
              value={form.recipient}
              onChange={(e) => handleInputChange('recipient', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0x..."
              disabled={isMinting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your NFT"
            disabled={isMinting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isMinting}
          />
          {form.image && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {form.image.name} ({(form.image.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            External URL (Optional)
          </label>
          <input
            type="url"
            value={form.external_url}
            onChange={(e) => handleInputChange('external_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
            disabled={isMinting}
          />
        </div>

        {/* Attributes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Attributes (Optional)
            </label>
            <button
              type="button"
              onClick={addAttribute}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isMinting}
            >
              Add Attribute
            </button>
          </div>
          
          {form.attributes.map((attr, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={attr.trait_type}
                onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                placeholder="Trait type"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isMinting}
              />
              <input
                type="text"
                value={attr.value}
                onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isMinting}
              />
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                disabled={isMinting}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Mint Button */}
        <div className="pt-6">
          <button
            onClick={handleMint}
            disabled={isMinting || !serviceStatus?.initialized}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isMinting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Minting NFT...
              </span>
            ) : (
              '🎨 Mint Real NFT'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
