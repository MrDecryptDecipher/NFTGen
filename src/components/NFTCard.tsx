import React from 'react';
import { GlassCard } from './GlassCard';
import { NFT } from '../types';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGatewayUrl } from '../utils/ipfs-adapter';

interface NFTCardProps {
  nft: NFT;
}

// Define type for fraction data to avoid 'unknown' type issues
interface FractionData {
  supply: number;
  available: number;
  pricePerFraction: string | number;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  const etherscanUrl = `https://etherscan.io/token/${nft.id}`;
  
  // Use the ipfs-adapter to properly handle all IPFS URL formats
  const getImageUrl = (): string => {
    if (!nft.image) return '/placeholder-nft.png'; // Default placeholder
    
    // Handle data:image URLs
    if (nft.image.startsWith('data:image/')) {
      return nft.image;
    }
    
    // Handle IPFS URLs using our adapter
    if (nft.image.startsWith('ipfs://') || nft.image.includes('/ipfs/')) {
      return getGatewayUrl(nft.image);
    }
    
    // Return as is for regular HTTP URLs
    return nft.image;
  };

  const formatPrice = (price: string | number): string => {
    return typeof price === 'string' ? parseFloat(price).toFixed(4) : price.toFixed(4);
  };

  // Helper to safely get fractions data
  const getFractionData = (): FractionData => {
    if (!nft.fractions) return { supply: 0, available: 0, pricePerFraction: "0" };
    
    // Handle possible mismatch in property names
    const available = 'available' in nft.fractions 
      ? nft.fractions.available as number 
      : 'remaining' in nft.fractions 
        ? nft.fractions.remaining as number 
        : 0;
    
    return {
      supply: nft.fractions.supply || 0,
      available,
      pricePerFraction: nft.fractions.pricePerFraction || "0"
    };
  };

  // Safely render royalty percentage
  const renderRoyaltyPercentage = (): string => {
    if (!nft.royalties) return '0%';
    
    if (typeof nft.royalties === 'object' && nft.royalties !== null) {
      if ('percentage' in nft.royalties && typeof nft.royalties.percentage === 'number') {
        return `${nft.royalties.percentage}%`;
      }
    }
    
    if (typeof nft.royalties === 'number') {
      return `${nft.royalties}%`;
    }
    
    return '0%';
  };

  return (
    <GlassCard className="overflow-hidden group">
      <div className="aspect-square overflow-hidden relative">
        <img
          src={getImageUrl()}
          alt={nft.name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback image if the main one fails to load
            (e.target as HTMLImageElement).src = '/placeholder-nft.png';
          }}
        />
        {nft.status?.toLowerCase() === 'fractionalized' && (
          <div className="absolute top-2 right-2">
            <div className="bg-green-500/20 backdrop-blur-sm text-green-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              Fractionalized
            </div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">{nft.name}</h3>
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
        <p className="text-sm text-white/60 line-clamp-2">{nft.description}</p>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          {nft.status?.toLowerCase() === 'fractionalized' && (
            <>
              <div className="text-sm">
                <p className="text-white/60">Available</p>
                <p className="text-white font-medium">
                  {getFractionData().available.toString()}/{getFractionData().supply.toString()} fractions
                </p>
              </div>
              <div className="text-sm">
                <p className="text-white/60">Price/Fraction</p>
                <p className="text-white font-medium flex items-center gap-1">
                  {formatPrice(getFractionData().pricePerFraction)} ETH
                </p>
              </div>
            </>
          )}
          <div className="text-sm">
            <p className="text-white/60">Royalties</p>
            <p className="text-white font-medium">
              {renderRoyaltyPercentage()}
            </p>
          </div>
          {nft.status?.toLowerCase() === 'minted' && (
            <div className="text-sm">
              <p className="text-white/60">Status</p>
              <p className="text-white font-medium">Minted</p>
            </div>
          )}
        </div>

        <Link
          to={`/nft/${nft.id}`}
          className="block mt-4 text-center py-2 px-4 bg-white/5 hover:bg-white/10 
            rounded-lg text-sm font-medium text-white/80 hover:text-white 
            transition-colors"
        >
          View Details
        </Link>
      </div>
    </GlassCard>
  );
};