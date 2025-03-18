import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Share2, DollarSign, Clock, Tag } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { NFTFractionalize } from '../components/NFTFractionalize';
import { useWallet } from '../context/WalletContext';
import { NFTService } from '../services/nftService';
import { toast } from 'react-toastify';
import type { NFT, NFTFractionalizationConfig } from '../types';

export const NFTDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, provider, signer } = useWallet();
  const [nft, setNft] = useState<NFT | null>(null);
  const [isFractionalizing, setIsFractionalizing] = useState(false);
  const [showFractionalize, setShowFractionalize] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNFT = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        // TODO: Replace with actual NFT fetching logic
        const mockNFT: NFT = {
          id,
          name: 'Sample NFT',
          description: 'This is a sample NFT description',
          image: 'ipfs://sample',
          status: 'minted',
          fractions: {
            supply: 0,
            available: 0,
            pricePerFraction: '0',
            minimumPurchase: 1
          },
          royalties: 2.5,
          metadata: {
            attributes: [
              { trait_type: 'Background', value: 'Blue' },
              { trait_type: 'Eyes', value: 'Green' }
            ]
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setNft(mockNFT);
      } catch (error) {
        console.error('Error fetching NFT:', error);
        toast.error('Failed to load NFT details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFT();
  }, [id]);

  const handleFractionalize = async (config: NFTFractionalizationConfig) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!nft || !provider || !signer) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsFractionalizing(true);
      const nftService = new NFTService(provider, signer);
      await nftService.fractionalize(nft, config);
      toast.success('NFT fractionalized successfully!');
      setShowFractionalize(false);
      
      // Refresh NFT data
      const details = await nftService.getFractionDetails(nft.id);
      setNft(prev => prev ? {
        ...prev,
        status: 'fractionalized',
        fractions: {
          supply: parseInt(details.supply),
          available: parseInt(details.available),
          pricePerFraction: details.pricePerFraction,
          minimumPurchase: parseInt(details.minimumPurchase)
        }
      } : null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fractionalize NFT');
    } finally {
      setIsFractionalizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-[60vh]">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-t-2 border-b-2 border-purple-400 animate-spin-reverse" />
            <div className="absolute inset-4 rounded-full border-t-2 border-b-2 border-purple-300 animate-spin" />
          </div>
      </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlassCard className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">NFT Not Found</h2>
          <p className="text-white/60 mb-8">The NFT you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          Back to Gallery
          </button>
        </GlassCard>
      </div>
    );
  }

  const etherscanUrl = `https://etherscan.io/token/${nft.id}`;
  const ipfsUrl = nft.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
  const createdDate = new Date(nft.createdAt).toLocaleDateString();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image */}
        <div className="space-y-6">
          <GlassCard className="overflow-hidden">
            <div className="aspect-square">
              <img
                src={ipfsUrl}
              alt={nft.name}
                className="w-full h-full object-cover"
            />
          </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Properties</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {nft.metadata.attributes.map((attr, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-3 text-center"
                  >
                    <p className="text-sm text-white/60">{attr.trait_type}</p>
                    <p className="text-sm font-medium text-white mt-1">
                      {attr.value}
                    </p>
                </div>
                ))}
              </div>
            </div>
          </GlassCard>
            </div>
            
        {/* Right Column - Details */}
            <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
              <div>
                  <h1 className="text-2xl font-bold text-white">{nft.name}</h1>
                  <p className="text-white/60 mt-2">{nft.description}</p>
                </div>
                <a
                  href={etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-6 h-6" />
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <p className="text-white/60 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Created
                  </p>
                  <p className="text-white mt-1">{createdDate}</p>
                </div>
                <div>
                  <p className="text-white/60 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Royalties
                  </p>
                  <p className="text-white mt-1">{nft.royalties}%</p>
                </div>
              </div>

              {nft.status === 'fractionalized' ? (
                <div className="mt-6 space-y-4">
                  <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    <span>This NFT has been fractionalized</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60">Available Fractions</p>
                      <p className="text-white text-lg font-medium mt-1">
                        {nft.fractions.available}/{nft.fractions.supply}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Price per Fraction</p>
                      <p className="text-white text-lg font-medium mt-1 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {parseFloat(nft.fractions.pricePerFraction).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  {showFractionalize ? (
                    <NFTFractionalize
                      nft={nft}
                      onFractionalize={handleFractionalize}
                      isFractionalizing={isFractionalizing}
                    />
                  ) : (
                    <button
                      onClick={() => setShowFractionalize(true)}
                      disabled={!isConnected}
                      className={`w-full py-3 rounded-lg font-medium transition-colors
                        ${!isConnected 
                          ? 'bg-purple-600/50 cursor-not-allowed' 
                          : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      {isConnected ? 'Fractionalize NFT' : 'Connect Wallet to Fractionalize'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}; 