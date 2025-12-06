import React, { useEffect, useState } from 'react';
// Removed unused Alchemy imports
import { toast } from 'react-toastify';
import { NFT, TransferEvent } from '../types';
// Removed unused formatIpfsUrl import
import { getNFTTransfers, getNFTMetadata } from '../lib/alchemy';

interface DashboardProps {
  address: string;
}

export function Dashboard({ address }: DashboardProps) {
  const [transfers, setTransfers] = useState<TransferEvent[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get NFT transfers using our alchemy service
        const transferEvents = await getNFTTransfers(address);

        // Sort transfers by timestamp
        const sortedTransfers = transferEvents.sort((a, b) => {
          const bTimestamp = b?.timestamp || 0;
          const aTimestamp = a?.timestamp || 0;
          return bTimestamp - aTimestamp;
        });

        // Filter out any null values and set transfers
        setTransfers(sortedTransfers.filter(Boolean));

        // Get NFT metadata for each transfer
        const nftPromises = transferEvents.map(async (transfer) => {
          if (!transfer.asset?.contractAddress || !transfer.tokenId) {
            return null;
          }

          try {
            return await getNFTMetadata(
              transfer.asset.contractAddress,
              transfer.tokenId
            );
          } catch {
            return null;
          }
        });

        // Wait for all NFT metadata to be fetched
        const nftResults = await Promise.all(nftPromises);

        // Filter out null values and set NFTs
        setNfts(nftResults.filter((nft): nft is NFT => nft !== null));
      } catch (err: unknown) {
        console.error('Error fetching transfers:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transfers');
        toast.error('Failed to fetch transfers');
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchTransfers();
    }
  }, [address]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!transfers.length) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">No NFT transfers found</div>
      </div>
    );
  }

  // Calculate total royalties properly
  const totalRoyalties = nfts.reduce((sum, nft) => {
    const royaltyValue = typeof nft.royalties === 'object' && nft.royalties !== null
      ? nft.royalties.percentage
      : 0;
    return sum + royaltyValue;
  }, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Your NFTs</h2>
        <p className="text-gray-600">
          Total Royalties Earned: {totalRoyalties}%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nft) => (
          <div
            key={nft.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{nft.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{nft.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Status: {nft.status}
                </span>
                {nft.royalties && (
                  <span className="text-sm text-purple-500">
                    Royalty: {nft.royalties.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}