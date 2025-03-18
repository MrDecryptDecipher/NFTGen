import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { GlassCard } from './GlassCard';
import { Layer } from '../types';
import { Plus, X, Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface GenerativeArtConfigProps {
  walletAddress?: `0x${string}`;
  isConnected: boolean;
}

export const GenerativeArtConfig: React.FC<GenerativeArtConfigProps> = ({ walletAddress, isConnected }) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [maxSupply, setMaxSupply] = useState(1000);

  if (!isConnected || !walletAddress) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-white/80">Please connect your wallet to access the generative art configuration</p>
      </GlassCard>
    );
  }

  const onDrop = (acceptedFiles: File[], layerIndex: number) => {
    const newLayers = [...layers];
    newLayers[layerIndex] = {
      ...newLayers[layerIndex],
      images: [...newLayers[layerIndex].images, ...acceptedFiles.map(file => URL.createObjectURL(file))]
    };
    setLayers(newLayers);
  };

  const addLayer = () => {
    setLayers([...layers, { name: `Layer ${layers.length + 1}`, images: [], probability: 100 }]);
  };

  const removeLayer = (index: number) => {
    setLayers(layers.filter((_: Layer, i: number) => i !== index));
  };

  const updateLayerName = (index: number, name: string) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], name };
    setLayers(newLayers);
  };

  const updateLayerProbability = (index: number, probability: number) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], probability };
    setLayers(newLayers);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">NFTGen</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
            <Plus className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <GlassCard className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-white">Generative Art Configuration</h2>
            <button
              onClick={addLayer}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <Plus className="w-5 h-5" />
              <span>Add Layer</span>
            </button>
          </div>

          <div className="space-y-4">
            {layers.map((layer: Layer, index: number) => (
              <div key={index} className="p-4 rounded-lg bg-white/5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLayerName(index, e.target.value)}
                    className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                    placeholder="Layer name"
                  />
                  <input
                    type="number"
                    value={layer.probability}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLayerProbability(index, Number(e.target.value))}
                    className="w-24 bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                    placeholder="Probability %"
                    min="0"
                    max="100"
                  />
                  <button
                    onClick={() => removeLayer(index)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <LayerDropzone onDrop={(files: File[]) => onDrop(files, index)} />

                <div className="grid grid-cols-6 gap-4">
                  {layer.images.map((image: string, imageIndex: number) => (
                    <div key={imageIndex} className="aspect-square rounded-lg overflow-hidden">
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Maximum Supply
            </label>
            <input
              type="number"
              value={maxSupply}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxSupply(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
              min="1"
            />
          </div>

          <div className="pt-4">
            <button
              className={clsx(
                'w-full py-3 px-4 rounded-lg font-medium',
                'bg-gradient-to-r from-purple-500 to-blue-500',
                'hover:from-purple-600 hover:to-blue-600',
                'transition-all duration-200 text-white'
              )}
            >
              Generate Collection
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

interface LayerDropzoneProps {
  onDrop: (files: File[]) => void;
}

const LayerDropzone: React.FC<LayerDropzoneProps> = ({ onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'border-2 border-dashed rounded-lg p-4',
        'flex flex-col items-center justify-center gap-2',
        'cursor-pointer transition-colors duration-200',
        isDragActive ? 'border-purple-400 bg-purple-400/10' : 'border-white/20'
      )}
    >
      <input {...getInputProps()} />
      <Upload className="w-6 h-6 text-white/60" />
      <p className="text-sm text-white/60">
        Drop layer images here or click to select
      </p>
    </div>
  );
};