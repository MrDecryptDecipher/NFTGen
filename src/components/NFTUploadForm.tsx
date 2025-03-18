import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Loader2, Plus, Minus, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { toast } from 'react-toastify';
import { NFTUploadFormData } from '../types';
import { useWallet } from '../context/WalletContext';

interface NFTUploadFormProps {
  onSubmit: (data: NFTUploadFormData) => Promise<void>;
  isUploading?: boolean;
}

export const NFTUploadForm: React.FC<NFTUploadFormProps> = ({ onSubmit, isUploading = false }) => {
  const { address, isConnected } = useWallet();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fractions, setFractions] = useState(100);
  const [royaltyPercentage, setRoyaltyPercentage] = useState(5);
  const [royaltyBeneficiary, setRoyaltyBeneficiary] = useState(address || '');
  const [attributes, setAttributes] = useState<Array<{ trait_type: string; value: string }>>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false
  });

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const formData: NFTUploadFormData = {
        name,
        description,
        file: selectedFile,
        fractions,
        royaltyPercentage,
        royaltyBeneficiary: royaltyBeneficiary || address,
        attributes: attributes.filter(attr => attr.trait_type && attr.value)
      };

      await onSubmit(formData);
      
      // Clear form
      setName('');
      setDescription('');
      setSelectedFile(null);
      setPreview(null);
      setFractions(100);
      setRoyaltyPercentage(5);
      setAttributes([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload NFT. Please try again.');
    }
  };

  return (
    <GlassCard className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Upload Section */}
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 h-[300px]
                flex flex-col items-center justify-center gap-4 
                cursor-pointer transition-colors duration-200
                ${isDragActive ? 'border-purple-400 bg-purple-400/10' : 'border-white/20'}`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="relative w-full h-full">
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : isDragActive ? (
                <ImageIcon className="w-12 h-12 text-purple-400" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-white/60" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-white">
                      Drag & drop your NFT here
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      PNG, JPG, GIF (max 5MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Number of Fractions
                </label>
                <input
                  type="number"
                  value={fractions}
                  onChange={(e) => setFractions(parseInt(e.target.value))}
                  min="1"
                  max="1000000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Royalty (%)
                </label>
                <input
                  type="number"
                  value={royaltyPercentage}
                  onChange={(e) => setRoyaltyPercentage(parseInt(e.target.value))}
                  min="0"
                  max="15"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Royalty Beneficiary Address
              </label>
              <input
                type="text"
                value={royaltyBeneficiary}
                onChange={(e) => setRoyaltyBeneficiary(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Attributes Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-white/80">
              Attributes
            </label>
            <button
              type="button"
              onClick={addAttribute}
              className="flex items-center space-x-1 text-purple-400 hover:text-purple-300"
            >
              <Plus size={16} />
              <span>Add Attribute</span>
            </button>
          </div>

          <div className="space-y-3">
            {attributes.map((attr, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={attr.trait_type}
                  onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                  placeholder="Trait Type"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => removeAttribute(index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading}
          className={`w-full py-3 rounded-lg font-medium transition-colors
            ${isUploading 
              ? 'bg-purple-500/50 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
            </div>
          ) : (
            'Create NFT'
          )}
        </button>
      </form>
    </GlassCard>
  );
}; 