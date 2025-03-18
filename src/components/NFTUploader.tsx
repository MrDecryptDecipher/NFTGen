import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { toast } from 'react-toastify';
import { verifyWalletConnection } from '../walletConnection';
import axios from 'axios';
import { formatIpfsUrl } from '../lib/utils';

interface NFTUploaderProps {
  address?: `0x${string}` | undefined;
  isConnected: boolean;
}

export const NFTUploader: React.FC<NFTUploaderProps> = ({ address, isConnected }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fractions, setFractions] = useState(100);
  const [royaltyFee, setRoyaltyFee] = useState(5);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Get JWT for Pinata upload
  const getUploadJWT = async () => {
    try {
      const jwtRes = await fetch("/api/pinata/jwt", { method: "POST" });
      const JWT = await jwtRes.text();
      return JWT;
    } catch (error) {
      console.error('Error getting upload JWT:', error);
      throw error;
    }
  };

  // Upload file to IPFS via Pinata
  const uploadToIPFS = async (file: File) => {
    try {
      const JWT = await getUploadJWT();
      
      // First upload the image
      const formData = new FormData();
      formData.append('file', file);
      
      const imageRes = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Authorization': `Bearer ${JWT}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });

      // Create and upload metadata
      const metadata = {
        name: name,
        description: description,
        image: `ipfs://${imageRes.data.IpfsHash}`,
        attributes: [
          {
            trait_type: "Fractions",
            value: fractions
          },
          {
            trait_type: "Royalty",
            value: `${royaltyFee}%`
          }
        ]
      };

      const metadataRes = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
        headers: {
          'Authorization': `Bearer ${JWT}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        imageUrl: formatIpfsUrl(`ipfs://${imageRes.data.IpfsHash}`),
        metadataUrl: `ipfs://${metadataRes.data.IpfsHash}`,
        imageHash: imageRes.data.IpfsHash,
        metadataHash: metadataRes.data.IpfsHash
      };
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Upload to IPFS
      const ipfsData = await uploadToIPFS(selectedFile);

      // Store activity data
      const activityData = {
        type: 'mint',
        status: 'pending',
        timestamp: Date.now(),
        details: {
          name: name,
          description: description,
          fractions: fractions,
          royaltyFee: royaltyFee,
          asset: {
            name: name,
            imageUrl: ipfsData.imageUrl,
            metadataUrl: ipfsData.metadataUrl
          }
        }
      };

      // Save to localStorage for activity tracking
      const activityKey = `nftgen_tx_${Date.now()}`;
      localStorage.setItem(activityKey, JSON.stringify(activityData));

      // Trigger activity sync
      window.dispatchEvent(new CustomEvent('nftgen-activity-sync'));

      // Clear form
      setName('');
      setDescription('');
      setSelectedFile(null);
      setUploadProgress(0);

      toast.success('NFT uploaded successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload NFT. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-full md:max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 
            flex flex-col items-center justify-center gap-4 
            cursor-pointer transition-colors duration-200
            ${isDragActive ? 'border-purple-400 bg-purple-400/10' : 'border-white/20'}`}
        >
          <input {...getInputProps()} />
          {selectedFile ? (
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <p className="text-white">{selectedFile.name}</p>
            </div>
          ) : isDragActive ? (
            <ImageIcon className="w-12 h-12 text-purple-400" />
          ) : (
            <Upload className="w-12 h-12 text-white/60" />
          )}
          <div className="text-center">
            <p className="text-lg font-medium text-white">
              {isDragActive ? 'Drop your NFT here' : 'Drag & drop your NFT here'}
            </p>
            <p className="text-sm text-white/60 mt-1">
              or click to select file (PNG, JPG, GIF)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Number of Fractions
            </label>
            <input
              type="number"
              value={fractions}
              onChange={(e) => setFractions(parseInt(e.target.value))}
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Royalty Fee (%)
            </label>
            <input
              type="number"
              value={royaltyFee}
              onChange={(e) => setRoyaltyFee(parseInt(e.target.value))}
              min="0"
              max="10"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>
        </div>

        {isUploading && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-white/80">Uploading...</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className={`w-full py-3 px-4 rounded-lg font-medium
            bg-gradient-to-r from-purple-500 to-blue-500
            hover:from-purple-600 hover:to-blue-600
            transition-all duration-200 text-white
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isUploading ? 'Uploading...' : 'Upload NFT'}
        </button>
      </form>
    </GlassCard>
  );
};