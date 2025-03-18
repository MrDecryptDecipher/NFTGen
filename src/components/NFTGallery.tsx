import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from './GlassCard';
import { NFTCard } from './NFTCard';
import { NFT } from '../types';
import { Share2, Plus } from 'lucide-react';

interface NFTGalleryProps {
  nfts: NFT[];
  isLoading?: boolean;
  showCreateButton?: boolean;
}

export const NFTGallery: React.FC<NFTGalleryProps> = ({ 
  nfts, 
  isLoading = false,
  showCreateButton = true
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'fractionalized' | 'minted'>('all');

  const filteredNFTs = nfts.filter(nft => {
    if (filter === 'all') return true;
    return nft.status === filter;
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-t-2 border-b-2 border-purple-400 animate-spin-reverse" />
          <div className="absolute inset-4 rounded-full border-t-2 border-b-2 border-purple-300 animate-spin" />
        </div>
        <p className="text-white/60 mt-6 text-lg">Loading your NFTs...</p>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <GlassCard className="text-center py-12 px-6">
        <div className="max-w-md mx-auto space-y-4">
          <h3 className="text-xl font-semibold text-white">No NFTs Found</h3>
          <p className="text-white/60">
            Create your first NFT to get started with your collection.
          </p>
          {showCreateButton && (
            <button
              onClick={() => navigate('/create')}
              className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 
                text-white rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create NFT
            </button>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            All NFTs
          </button>
          <button
            onClick={() => setFilter('fractionalized')}
            className={`px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 ${
              filter === 'fractionalized'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Fractionalized
          </button>
          <button
            onClick={() => setFilter('minted')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'minted'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            Minted
          </button>
        </div>

        {showCreateButton && (
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 
              text-white rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create NFT
          </button>
        )}
      </div>

      {filteredNFTs.length === 0 ? (
        <GlassCard className="text-center py-8 px-6">
          <p className="text-white/60">
            No NFTs found matching the selected filter.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft) => (
            <NFTCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}
    </div>
  );
}; 