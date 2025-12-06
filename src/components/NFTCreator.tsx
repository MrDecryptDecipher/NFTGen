import React, { useState, useEffect } from 'react';
import nftService from '../services/nftService';

interface NFTCreatorProps {
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export const NFTCreator: React.FC<NFTCreatorProps> = ({
  onSuccess,
  onError
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [currentTx, setCurrentTx] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleTxUpdate = (event: CustomEvent) => {
      const { txHash, status } = event.detail;
      
      if (txHash !== currentTx) return;

      if (status.status === 'confirmed') {
        setIsCreating(false);
        setProgress('NFT created successfully!');
        onSuccess?.(txHash);
      } else if (status.status === 'failed') {
        setIsCreating(false);
        const errorMsg = status.error || 'Transaction failed';
        setError(errorMsg);
        onError?.(new Error(errorMsg));
      } else {
        setProgress(`Confirming transaction (${status.confirmations}/3)...`);
      }
    };

    window.addEventListener('nft-transaction-update', handleTxUpdate as EventListener);
    return () => {
      window.removeEventListener('nft-transaction-update', handleTxUpdate as EventListener);
    };
  }, [currentTx, onSuccess, onError]);

  const handleCreate = async (metadata: { name: string; description: string; imageFile: File; attributes?: Array<{ trait_type: string; value: string | number }> }) => {
    try {
      setIsCreating(true);
      setError('');
      setProgress('Initializing...');

      // Get user address for recipient
      const userSession = localStorage.getItem('nija_wallet_session') || localStorage.getItem('nftgen_nwallet_session');
      const recipientAddress = userSession ? JSON.parse(userSession).address : '0x56866D43dC757b3F683cF35d300f2Bc0d1A8A1BD';

      const createNFTParams = {
        name: metadata.name,
        description: metadata.description,
        imageFile: metadata.imageFile,
        attributes: metadata.attributes?.map(attr => ({
          trait_type: attr.trait_type,
          value: String(attr.value) // Convert to string
        })),
        recipientAddress
      };

      const result = await nftService.createNFT(createNFTParams, (status) => {
        setProgress(status);
      });

      if (result.success && result.transactionHash) {
        setCurrentTx(result.transactionHash);
      } else {
        throw new Error(result.error || 'Failed to create NFT');
      }
      setProgress('Transaction submitted, waiting for confirmation...');

    } catch (error) {
      setIsCreating(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create NFT';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New NFT
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {isCreating && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{progress}</span>
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = formData.get('name') as string || '';
          const description = formData.get('description') as string || '';
          const imageFile = formData.get('image') as File;

          if (!name || !description || !imageFile) {
            setError('Please fill in all required fields');
            return;
          }

          handleCreate({
            name,
            description,
            imageFile,
            attributes: []
          });
        }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              required
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Image URL
            </label>
            <input
              type="url"
              name="image"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isCreating
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isCreating ? 'Creating...' : 'Create NFT'}
          </button>
        </form>
      </div>
    </div>
  );
}; 