import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Alchemy, Network } from 'alchemy-sdk';
import { toast } from 'react-toastify';
import type { NFTUploadFormData } from '../types';

// Initialize Alchemy SDK
const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

interface NFTUploaderProps {
  onUpload: (formData: NFTUploadFormData) => void;
  isLoading?: boolean;
}

export const NFTUploader: React.FC<NFTUploaderProps> = ({ onUpload, isLoading = false }) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      // Import Web3.Storage service
      const { web3StorageService } = await import('../services/web3Storage.service');

      // Ensure Web3.Storage is initialized
      if (!web3StorageService.isSpaceReady()) {
        await web3StorageService.initialize();
      }

      // Upload image to IPFS via Web3.Storage
      const imageResult = await web3StorageService.uploadFile(file, (progress) => {
        console.log(`Image upload progress: ${progress.progress}% - ${progress.message}`);
      });

      const imageUrl = imageResult.url; // Already in ipfs:// format

      // Create metadata object
      const metadata = {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        description: '',
        image: imageUrl,
        attributes: []
      };

      // Upload metadata to IPFS via Web3.Storage
      const metadataResult = await web3StorageService.uploadMetadata(metadata, (progress) => {
        console.log(`Metadata upload progress: ${progress.progress}% - ${progress.message}`);
      });

      // Create form data
      const formData: NFTUploadFormData = {
        name: metadata.name,
        description: metadata.description,
        image: file,
        attributes: metadata.attributes,
        royalties: 5 // Default royalty percentage
      };

      onUpload(formData);
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast.error('Failed to upload file');
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-purple-500/50'}`}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-white/60">Uploading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium text-white">
              {isDragActive ? 'Drop the file here' : 'Drag & drop an image, or click to select'}
            </p>
            <p className="text-sm text-white/60 mt-1">
              PNG, JPG, GIF, or WEBP (max. 10MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};