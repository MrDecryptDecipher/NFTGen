import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { fetchNFTsForOwner, getUserNFTs, NFTItem } from '../api/nft';
import { OwnedNft } from 'alchemy-sdk';
import { Link } from 'react-router-dom';
// Removed unused imports: handleImageError, pinataService, etherscanService
import EnhancedNFTImage from './EnhancedNFTImage';
import { TransactionLink } from './EnhancedEtherscanLink';

// Simple spinner component
const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
);

export const NFTGallery: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [nfts, setNfts] = useState<OwnedNft[]>([]);
  const [localNfts, setLocalNfts] = useState<NFTItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Function to load NFTs from localStorage using robust persistence system
  const loadLocalNFTs = useCallback(async () => {
    if (!address) {
      console.log('No address provided for local NFT loading');
      return [];
    }

    try {
      // Use the robust persistence system to get user NFTs
      const { getUserNFTs } = await import('../utils/nftDataPersistence');
      const userNfts = getUserNFTs(address);

      if (userNfts && userNfts.length > 0) {
        console.log(`✅ Found ${userNfts.length} NFTs in local storage for address ${address}`);

        // Convert to NFTItem format
        const convertedNfts = userNfts.map((nft: { id: string; name: string; description: string; imageUrl?: string; image_url?: string; image?: string; owner: string; contractAddress: string; tokenId: string; status: string }) => ({
          id: nft.id,
          name: nft.name,
          description: nft.description,
          image: nft.imageUrl || nft.image_url || nft.image, // Support multiple field names
          owner: nft.owner,
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          status: nft.status
        }));

        return convertedNfts;
      } else {
        console.log('No local NFTs found for address:', address);
        return [];
      }
    } catch (error) {
      console.error('Error loading local NFTs:', error);
      return [];
    }
  }, [address]);

  useEffect(() => {
    const loadNFTs = async () => {
      if (!address || !isConnected) {
        setNfts([]);
        setLocalNfts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // First try to load NFTs from Alchemy API
        const result = await fetchNFTsForOwner(address);
        if (result.nfts && Array.isArray(result.nfts)) {
          console.log('NFTs loaded successfully from Alchemy:', result.nfts);
          setNfts(result.nfts);
        } else {
          console.warn('No NFTs found from Alchemy or invalid response format');
          setNfts([]);
        }

        // If we have no NFTs from Alchemy, try the getUserNFTs function as a fallback
        if (result.nfts.length === 0) {
          console.log('No NFTs found from Alchemy, trying getUserNFTs');
          try {
            const userNfts = await getUserNFTs(address);
            if (userNfts && userNfts.length > 0) {
              console.log('NFTs loaded successfully from getUserNFTs:', userNfts);
              setLocalNfts(userNfts);
            }
          } catch (userNftsError) {
            console.warn('Error loading user NFTs:', userNftsError);
            // Continue with empty local NFTs but don't show error if we have Alchemy NFTs
            if (result.nfts.length === 0) {
              setError('Could not load local NFTs. You can still view blockchain NFTs.');
            }
          }
        }
      } catch (err) {
        console.error('Error loading NFTs:', err);
        // Check if it's a network error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('ECONNREFUSED')) {
          setError('Network error occurred. Please check your internet connection and try again.');
        } else {
          setError('Failed to load NFTs from blockchain. Please try again later.');
        }

        // Try to load local NFTs as fallback
        try {
          const userNfts = await getUserNFTs(address);
          if (userNfts && userNfts.length > 0) {
            console.log('NFTs loaded successfully from getUserNFTs as fallback:', userNfts);
            setLocalNfts(userNfts);
          }
        } catch (fallbackError) {
          console.error('Error loading fallback NFTs:', fallbackError);
          setLocalNfts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadNFTs();

    // Listen for NFT activity updates
    const handleActivityUpdate = async () => {
      console.log('NFT activity update detected, reloading local NFTs');
      const localNftData = await loadLocalNFTs();
      if (localNftData && localNftData.length > 0) {
        setLocalNfts(localNftData);
      }
    };

    window.addEventListener('nftgen_activity_update', handleActivityUpdate);
    window.addEventListener('storage', handleActivityUpdate);

    return () => {
      window.removeEventListener('nftgen_activity_update', handleActivityUpdate);
      window.removeEventListener('storage', handleActivityUpdate);
    };
  }, [address, isConnected, loadLocalNFTs]);

  if (!isConnected) {
    return <div className="text-center p-4">Please connect your wallet to view your NFTs.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center p-4"><Spinner /></div>;
  }

  if (error) {
    // If we have an error but also have some NFTs to display, show the error as a banner
    if (nfts.length > 0 || localNfts.length > 0) {
      return (
        <>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Warning</p>
            <p>{error}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {/* Render Alchemy NFTs */}
            {nfts.map((nft, index) => (
              <div key={`alchemy-${nft.contract.address}-${nft.tokenId}-${index}`}
                   className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-square relative">
                  <EnhancedNFTImage
                    src={nft.imageUrl || nft.image_url || nft.image?.cachedUrl || nft.image || ''}
                    alt={nft.name || 'NFT'}
                    className="w-full h-full object-cover"
                    nftId={`alchemy-${nft.contract.address}-${nft.tokenId}-${index}`}
                    showLoadingSpinner={true}
                  />
                  {nft.tokenType && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {nft.tokenType}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold truncate" title={nft.name}>
                    {nft.name || 'Untitled NFT'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate" title={nft.contract.name}>
                    {nft.contract.name || 'Unknown Collection'}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Token ID: {nft.tokenId}
                    </p>
                    {(nft as { rarity?: { rank?: number } }).rarity?.rank && (
                      <p className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Rank: #{(nft as { rarity?: { rank?: number } }).rarity.rank}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Render Local NFTs */}
            {localNfts.map((nft, index) => (
              <Link
                to={`/nft/${nft.id}`}
                key={`local-${nft.id}-${index}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-square relative" data-nft-id={nft.id}>
                  <EnhancedNFTImage
                    src={nft.imageUrl || nft.image_url || nft.image || ''}
                    alt={nft.name || 'NFT'}
                    className="w-full h-full object-cover"
                    nftId={nft.id}
                    showLoadingSpinner={true}
                  />
                  {nft.tokenType && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {nft.tokenType}
                    </div>
                  )}
                  {nft.animation_url && (
                    <div className="absolute bottom-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      Animated
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold truncate" title={nft.name}>
                    {nft.name || 'Untitled NFT'}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {nft.collection?.name || nft.description || 'No description'}
                  </p>

                  {/* NFT Links */}
                  <div className="flex gap-2 mt-2 mb-2">
                    {(nft.imageUrl || nft.image_url) && (
                      <a
                        href={nft.imageUrl || nft.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                        title="View on IPFS"
                      >
                        🔗 IPFS
                      </a>
                    )}
                    {nft.transactionHash && (
                      <TransactionLink
                        txHash={nft.transactionHash}
                        chainId={11155111}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                        showIcon={true}
                      >
                        📊 Etherscan
                      </TransactionLink>
                    )}
                    {nft.contractAddress && nft.tokenId && (
                      <a
                        href={`https://testnets.opensea.io/assets/sepolia/${nft.contractAddress}/${nft.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
                        title="View on OpenSea"
                      >
                        🌊 OpenSea
                      </a>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Token ID: {nft.tokenId}
                    </p>
                    {nft.rarity?.rank && (
                      <p className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Rank: #{nft.rarity.rank}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      );
    }

    // If we have an error and no NFTs, show just the error
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <p className="mt-2">Please try again later or contact support if the problem persists.</p>
      </div>
    );
  }

  if (nfts.length === 0 && localNfts.length === 0) {
    return <div className="text-center p-4">No NFTs found in your wallet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {/* Render Alchemy NFTs */}
      {nfts.map((nft, index) => (
        <div key={`alchemy-${nft.contract.address}-${nft.tokenId}-${index}`}
             className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="aspect-square relative">
            <EnhancedNFTImage
              src={nft.imageUrl || nft.image_url || nft.image?.cachedUrl || nft.image || ''}
              alt={nft.name || 'NFT'}
              className="w-full h-full object-cover"
              nftId={`alchemy-${nft.contract.address}-${nft.tokenId}-${index}`}
              showLoadingSpinner={true}
            />
            {nft.tokenType && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {nft.tokenType}
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold truncate" title={nft.name}>
              {nft.name || 'Untitled NFT'}
            </h3>
            <p className="text-sm text-gray-600 truncate" title={nft.contract.name}>
              {nft.contract.name || 'Unknown Collection'}
            </p>

            {/* NFT Links */}
            <div className="flex gap-2 mt-2 mb-2">
              {(nft.imageUrl || nft.image_url || nft.image?.cachedUrl || nft.image) && (
                <a
                  href={nft.imageUrl || nft.image_url || nft.image?.cachedUrl || nft.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                  title="View on IPFS"
                >
                  🔗 IPFS
                </a>
              )}
              {nft.contract?.address && nft.tokenId && (
                <a
                  href={`https://testnets.opensea.io/assets/sepolia/${nft.contract.address}/${nft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
                  title="View on OpenSea"
                >
                  🌊 OpenSea
                </a>
              )}
            </div>

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Token ID: {nft.tokenId}
              </p>
              {(nft as { rarity?: { rank?: number } }).rarity?.rank && (
                <p className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Rank: #{(nft as { rarity?: { rank?: number } }).rarity.rank}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Render Local NFTs */}
      {localNfts.map((nft, index) => (
        <Link
          to={`/nft/${nft.id}`}
          key={`local-${nft.id}-${index}`}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          <div className="aspect-square relative" data-nft-id={nft.id}>
            <EnhancedNFTImage
              src={nft.imageUrl || nft.image_url || nft.image || ''}
              alt={nft.name || 'NFT'}
              className="w-full h-full object-cover"
              nftId={nft.id}
              showLoadingSpinner={true}
            />
            {nft.tokenType && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {nft.tokenType}
              </div>
            )}
            {nft.animation_url && (
              <div className="absolute bottom-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                Animated
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold truncate" title={nft.name}>
              {nft.name || 'Untitled NFT'}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {nft.collection?.name || nft.description || 'No description'}
            </p>

            {/* NFT Links */}
            <div className="flex gap-2 mt-2 mb-2">
              {(nft.imageUrl || nft.image_url || nft.image) && (
                <a
                  href={nft.imageUrl || nft.image_url || nft.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                  title="View on IPFS"
                >
                  🔗 IPFS
                </a>
              )}
              {nft.transactionHash && (
                <TransactionLink
                  txHash={nft.transactionHash}
                  chainId={11155111}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                  showIcon={true}
                >
                  📊 Etherscan
                </TransactionLink>
              )}
              {nft.contractAddress && nft.tokenId && (
                <a
                  href={`https://testnets.opensea.io/assets/sepolia/${nft.contractAddress}/${nft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
                  title="View on OpenSea"
                >
                  🌊 OpenSea
                </a>
              )}
            </div>

            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Token ID: {nft.tokenId}
              </p>
              {nft.rarity?.rank && (
                <p className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Rank: #{nft.rarity.rank}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};