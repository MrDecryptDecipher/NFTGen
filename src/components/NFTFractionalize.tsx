import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { toast } from 'react-toastify';
import type { NFT, NFTFractionalizationConfig } from '../types';
import { useWallet } from '../context/WalletContext';

interface NFTFractionalizeProps {
  nft: NFT;
  onFractionalize: (config: NFTFractionalizationConfig) => Promise<void>;
  isFractionalizing?: boolean;
}

export const NFTFractionalize: React.FC<NFTFractionalizeProps> = ({
  nft,
  onFractionalize,
  isFractionalizing = false
}) => {
  const { isConnected } = useWallet();
  const [totalSupply, setTotalSupply] = useState(nft.fractions.supply.toString());
  const [pricePerFraction, setPricePerFraction] = useState('0.01');
  const [minimumPurchase, setMinimumPurchase] = useState('1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const config: NFTFractionalizationConfig = {
        nftId: nft.id,
        totalSupply: parseInt(totalSupply),
        pricePerFraction: ethers.parseEther(pricePerFraction).toString(),
        minimumPurchase: parseInt(minimumPurchase)
      };

      await onFractionalize(config);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fractionalize NFT. Please try again.');
    }
  };

  return (
    <GlassCard className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Total Supply
            </label>
            <input
              type="number"
              value={totalSupply}
              onChange={(e) => setTotalSupply(e.target.value)}
              min="1"
              max="1000000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
            <p className="text-sm text-white/60 mt-1">
              Total number of fractions to create
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Price per Fraction (ETH)
            </label>
            <input
              type="number"
              value={pricePerFraction}
              onChange={(e) => setPricePerFraction(e.target.value)}
              min="0.000001"
              step="0.000001"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
            <p className="text-sm text-white/60 mt-1">
              Initial price for each fraction in ETH
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Minimum Purchase
            </label>
            <input
              type="number"
              value={minimumPurchase}
              onChange={(e) => setMinimumPurchase(e.target.value)}
              min="1"
              max={totalSupply}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
            <p className="text-sm text-white/60 mt-1">
              Minimum number of fractions that can be purchased at once
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isFractionalizing}
            className={`w-full py-3 rounded-lg font-medium transition-colors
              ${isFractionalizing 
                ? 'bg-purple-500/50 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            {isFractionalizing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Fractionalizing...</span>
              </div>
            ) : (
              'Fractionalize NFT'
            )}
          </button>
        </div>
      </form>
    </GlassCard>
  );
}; 