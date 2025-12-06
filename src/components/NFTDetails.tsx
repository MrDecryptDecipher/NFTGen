import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon as ExternalLinkIcon, ShareIcon, CurrencyDollarIcon as DollarSignIcon, ClockIcon, TagIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { GlassCard } from './GlassCard';
import { NFTFractionalize } from './NFTFractionalize';
import { useWallet } from '../context/WalletContext';
import { Contract, ContractTransaction } from 'ethers';
import { toast } from 'react-toastify';
import { NFT_CONTRACT_ABI } from '../contracts/NFTGen';
import type { NFT, TransferEvent, Activity } from '../types';
import { Alchemy, Network, NftContract as AlchemyNftContract, Nft } from 'alchemy-sdk';

// Initialize Alchemy SDK
const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
});

type NFTStatus = NFT['status'] | 'FRACTIONALIZED';

interface ExtendedNFT {
  id: string;
  name: string;
  image: string;
  media?: Array<{
    gateway?: string;
    raw?: string;
  }>;
  title?: string;
  description: string;
  owner: string;
  status: NFTStatus;
  contractAddress: string;
  tokenId: string;
  metadata: {
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  fractions?: {
    id: string;
    supply: number;
    remaining: number;
    pricePerFraction: number;
  };
  royalties: {
    id: string;
    percentage: number;
    beneficiary: string;
  };
}

interface NFTContract extends Contract {
  approve(to: string, tokenId: string, options?: { gasLimit?: bigint }): Promise<ContractTransaction>;
  transferFrom(from: string, to: string, tokenId: string, options?: { gasLimit?: bigint }): Promise<ContractTransaction>;
  fractionalize(tokenId: string, fractions: number, options?: { gasLimit?: bigint }): Promise<ContractTransaction>;
  ownerOf(tokenId: string): Promise<string>;
}

interface AlchemyNFTMetadata {
  media?: Array<{
    gateway?: string;
    raw?: string;
  }>;
  rawMetadata?: {
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  description?: string;
  contract: {
    name: string;
    address: string;
  };
  tokenId: string;
  owners: string[];
}

export const NFTDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address, provider } = useWallet();
  const [nft, setNft] = useState<ExtendedNFT | null>(null);
  const [showFractionalize, setShowFractionalize] = useState(false);
  const [isFractionalizing, setIsFractionalizing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNFT = async () => {
      if (!id || !provider) return;
      try {
        setIsLoading(true);
        // Fetch NFT data from Alchemy
        const nftData = await alchemy.nft.getNftMetadata(id, id) as unknown as AlchemyNFTMetadata;

        // Get additional contract data
        const contract = new Contract(
          nftData.contract.address,
          NFT_CONTRACT_ABI,
          provider
        ) as unknown as NFTContract;

        // Get owner and other contract-specific data
        const owner = await contract.ownerOf(nftData.tokenId);

        // Format the NFT data
        const formattedNFT: ExtendedNFT = {
          id: nftData.tokenId,
          name: nftData.contract.name || 'Unnamed NFT',
          image: nftData.media?.[0]?.gateway || nftData.media?.[0]?.raw || '',
          media: nftData.media,
          description: nftData.description || '',
          owner: owner,
          status: 'OWNED' as NFTStatus,
          contractAddress: nftData.contract.address,
          tokenId: nftData.tokenId,
          metadata: {
            attributes: nftData.rawMetadata?.attributes || []
          },
          royalties: {
            id: nftData.contract.address,
            percentage: 5, // Default royalty percentage
            beneficiary: owner
          }
        };

        setNft(formattedNFT);
      } catch (error) {
        console.error('Error fetching NFT:', error);
        toast.error('Failed to load NFT details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFT();
  }, [id, provider]);

  const handleTransfer = async () => {
    if (!nft) {
      toast.error('NFT data not available');
      return;
    }

    if (!transferTo) {
      toast.error('Please enter a recipient address');
      return;
    }

    // If no wallet is connected, create a fallback session
    if (!address || !provider) {
      console.log("[NFTDetails] No wallet connected, creating fallback session");

      try {
        // Import the NwalletProvider functions directly
        const { saveNwalletSession } = await import('../providers/NwalletProvider');

        // Create a fallback session
        const mockAddress = "0x93ac9501e40Bf7000866290DAa064ebFD984E12B";
        saveNwalletSession(mockAddress);

        // Force localStorage update event
        window.dispatchEvent(new Event('storage'));

        // Inform the user
        toast.info("Using fallback wallet connection");

        // Wait for the session to be created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reload the page to use the new session
        window.location.reload();
        return;
      } catch (error) {
        console.error("[NFTDetails] Failed to create fallback session:", error);
        toast.error("Failed to create wallet connection. Please try again.");
        return;
      }
    }

    try {
      setIsTransferring(true);

      const signer = await provider.getSigner();
      const contract = new Contract(
        nft.contractAddress,
        NFT_CONTRACT_ABI,
        signer
      ) as unknown as NFTContract;

      // Estimate gas before transaction
      const gasEstimate = await contract.estimateGas.transferFrom(
        address,
        transferTo,
        nft.tokenId
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      // First approve the transfer
      const approveTx = await contract.approve(transferTo, nft.tokenId, { gasLimit });
      await approveTx.wait();

      // Then transfer the NFT
      const transferTx = await contract.transferFrom(
        address,
        transferTo,
        nft.tokenId,
        { gasLimit }
      );
      await transferTx.wait();

      // Update NFT data after transfer
      const updatedNft = await alchemy.nft.getNftMetadata(nft.tokenId, nft.tokenId) as unknown as AlchemyNFTMetadata;
      setNft(prev => prev ? { ...prev, owner: updatedNft.owners[0] } : null);

      toast.success('NFT transferred successfully');
      navigate('/profile');
    } catch (error) {
      console.error('Error transferring NFT:', error);
      toast.error('Failed to transfer NFT');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleFractionalize = async (config: { fractions: number }) => {
    if (!nft) {
      toast.error('NFT data not available');
      return;
    }

    // If no wallet is connected, create a fallback session
    if (!address || !provider) {
      console.log("[NFTDetails] No wallet connected for fractionalize, creating fallback session");

      try {
        // Import the NwalletProvider functions directly
        const { saveNwalletSession } = await import('../providers/NwalletProvider');

        // Create a fallback session
        const mockAddress = "0x93ac9501e40Bf7000866290DAa064ebFD984E12B";
        saveNwalletSession(mockAddress);

        // Force localStorage update event
        window.dispatchEvent(new Event('storage'));

        // Inform the user
        toast.info("Using fallback wallet connection");

        // Wait for the session to be created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reload the page to use the new session
        window.location.reload();
        return;
      } catch (error) {
        console.error("[NFTDetails] Failed to create fallback session for fractionalize:", error);
        toast.error("Failed to create wallet connection. Please try again.");
        return;
      }
    }

    try {
      setIsFractionalizing(true);

      const signer = await provider.getSigner();
      const contract = new Contract(
        nft.contractAddress,
        NFT_CONTRACT_ABI,
        signer
      ) as unknown as NFTContract;

      // Estimate gas before transaction
      const gasEstimate = await contract.estimateGas.fractionalize(
        nft.tokenId,
        config.fractions
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate.mul(120).div(100);

      const tx = await contract.fractionalize(nft.tokenId, config.fractions, { gasLimit });
      await tx.wait();

      // Update NFT status after fractionalization
      setNft(prev => prev ? { ...prev, status: 'FRACTIONALIZED' } : null);
      toast.success('NFT fractionalized successfully');
    } catch (error) {
      console.error('Error fractionalizing NFT:', error);
      toast.error('Failed to fractionalize NFT');
    } finally {
      setIsFractionalizing(false);
      setShowFractionalize(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-white/80">NFT not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <div>
          <GlassCard className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold">{nft.name}</h1>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(`https://etherscan.io/token/${nft.contractAddress}`, '_blank')}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <ExternalLinkIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard');
                  }}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <p className="text-lg text-white/80 mb-6">{nft.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <DollarSignIcon className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm text-white/60">Royalties</p>
                  <p className="font-medium">{nft.royalties.percentage}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm text-white/60">Status</p>
                  <p className="font-medium">{nft.status}</p>
                </div>
              </div>
            </div>

            {nft.metadata.attributes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Attributes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {nft.metadata.attributes.map((attr, index) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <p className="text-sm text-white/60">{attr.trait_type}</p>
                      <p className="font-medium">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nft.status === 'FRACTIONALIZED' && nft.fractions && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Fractions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60">Total Supply</p>
                    <p className="text-lg font-medium">{nft.fractions.supply}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60">Available</p>
                    <p className="text-lg font-medium">{nft.fractions.remaining}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-white/60">Price per Fraction</p>
                    <p className="text-lg font-medium">
                      {nft.fractions.pricePerFraction.toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              </div>
            )}

            {nft.status !== 'FRACTIONALIZED' && (
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
                    disabled={!address}
                    className={`w-full py-3 rounded-lg font-medium transition-colors
                      ${!address
                        ? 'bg-purple-600/50 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'}`}
                  >
                    {address ? 'Fractionalize NFT' : 'Connect Wallet to Fractionalize'}
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};