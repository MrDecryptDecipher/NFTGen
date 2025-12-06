import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon, ShareIcon, CurrencyDollarIcon, ClockIcon, TagIcon, UserIcon } from '@heroicons/react/24/outline';
import { GlassCard } from '../components/GlassCard';
import { useWallet } from '../context/WalletContext';
import { toast } from 'react-toastify';
import { ERC1155Service } from '../services/erc1155Service';
import { getBestImageUrl, handleImageError } from '../utils/image-utils';
import { getNFTData, restoreNFTData, NFTData } from '../utils/nftDataPersistence';

// Define the NFT type locally to avoid type errors
interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  status: string;
  fractions?: {
    supply: number;
    available: number;
    pricePerFraction: string;
    minimumPurchase: number;
  };
  royalties: number;
  metadata: {
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
    collection?: {
      name: string;
      family?: string;
    };
    rarity?: {
      score?: number;
      rank?: number;
      totalSupply?: number;
    };
    creator?: string;
    external_url?: string;
    animation_url?: string;
    properties?: Record<string, any>;
    tokenStandard?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  tokenType?: string;
  media?: Array<{
    gateway: string;
    raw: string;
    format?: string;
    thumbnail?: string;
  }>;
  collection?: {
    name: string;
    family?: string;
  };
  external_url?: string;
  animation_url?: string;
}

// Define the fractionalization config type
interface NFTFractionalizationConfig {
  fractions: number;
  pricePerFraction: string;
  receiverAddress?: string;
}

const NFTDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const [nft, setNft] = useState<NFT | null>(null);
  const [isFractionalizing, setIsFractionalizing] = useState(false);
  const [showFractionalize, setShowFractionalize] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactionHash, setTransactionHash] = useState('');
  const [showTransactionSuccess, setShowTransactionSuccess] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string>('');

  useEffect(() => {
    const fetchNFT = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        console.log("Fetching NFT details for ID:", id);

        // Use the robust persistence system to get NFT data
        let nftData = getNFTData(id);

        if (!nftData) {
          // Try to restore from any available source
          console.log("NFT not found, attempting to restore...");
          nftData = restoreNFTData(id);
        }

        if (nftData) {
          console.log("✅ Found NFT data:", nftData);

          // Convert to our NFT format
          const convertedNFT: NFT = {
            id: nftData.id,
            name: nftData.name,
            description: nftData.description,
            image: nftData.image,
            status: nftData.status || 'minted',
            fractions: {
              supply: nftData.fractions || 0,
              available: nftData.fractions || 0,
              pricePerFraction: '0',
              minimumPurchase: 1
            },
            royalties: nftData.royalties || 2.5,
            metadata: {
              attributes: nftData.metadata?.attributes || [
                { trait_type: 'Creator', value: nftData.owner || 'Unknown' },
                { trait_type: 'Minted On', value: new Date(nftData.createdAt).toLocaleDateString() }
              ]
            },
            createdAt: nftData.createdAt,
            updatedAt: nftData.updatedAt
          };

          setNft(convertedNFT);
        } else {
          // Check if we have metadata in localStorage
          const metadataKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('nft_metadata_'));

          let foundMetadata = null;

          for (const key of metadataKeys) {
            try {
              const metadataStr = localStorage.getItem(key);
              if (!metadataStr) continue;

              const metadata = JSON.parse(metadataStr);

              // Check if this metadata matches our NFT ID
              // For local NFTs, the ID might be in the format "local-timestamp"
              if (id.startsWith('local-')) {
                const idTimestamp = id.replace('local-', '');

                // Check if this metadata was created around the same time as the NFT ID
                if (metadata.attributes &&
                    metadata.attributes.some((attr: { trait_type: string, value: any }) =>
                      attr.trait_type === 'Timestamp' &&
                      attr.value.toString().includes(idTimestamp.substring(0, 6))
                    )) {
                  foundMetadata = metadata;
                  break;
                }
              }
              // For transaction hash IDs
              else if (metadata.attributes &&
                      metadata.attributes.some((attr: { trait_type: string, value: any }) =>
                        attr.trait_type === 'Transaction' &&
                        attr.value === id
                      )) {
                foundMetadata = metadata;
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (foundMetadata) {
            console.log("Found metadata for NFT:", foundMetadata);

            // Get the image URL from localStorage if available
            let imageUrl = foundMetadata.image;

            // First check for transaction-specific image
            const txImageKey = `nft_image_tx_${id}`;
            const txImageUrl = localStorage.getItem(txImageKey);

            if (txImageUrl) {
              console.log("Found transaction-specific image:", txImageUrl);
              imageUrl = txImageUrl;
            } else if (imageUrl.startsWith('ipfs://')) {
              // Try to get the image from localStorage
              const imageKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('nft_image_'));

              for (const key of imageKeys) {
                const storedImageUrl = localStorage.getItem(key);
                if (storedImageUrl) {
                  console.log("Found image in localStorage:", storedImageUrl);
                  imageUrl = storedImageUrl;
                  break;
                }
              }
            }

            // Create NFT object from metadata
            const nftData: NFT = {
              id,
              name: foundMetadata.name,
              description: foundMetadata.description,
              image: imageUrl,
              status: 'minted',
              fractions: {
                supply: 0,
                available: 0,
                pricePerFraction: '0',
                minimumPurchase: 1
              },
              royalties: foundMetadata.attributes?.find((attr: { trait_type: string, value: any }) => attr.trait_type === 'Royalty')?.value || 2.5,
              metadata: {
                attributes: foundMetadata.attributes || []
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            setNft(nftData);
          } else {
            console.log("❌ No NFT data found for ID:", id);
            // Don't create default/mock data - this violates the no-mock policy
            setNft(null);
          }
        }
      } catch (error) {
        console.error('Error fetching NFT:', error);
        toast.error('Failed to load NFT details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFT();
  }, [id]);

  // Resolve image URL when NFT changes
  useEffect(() => {
    const resolveImageUrl = async () => {
      if (nft && nft.image) {
        try {
          // First check if we have a stored image for this NFT
          const storedImageKeys = [
            `ipfs_data_${nft.id}`,
            `nft_image_data_${nft.id}`,
            `nftgen_image_data_${nft.id}`
          ];

          let foundStoredImage = null;
          for (const key of storedImageKeys) {
            const storedImage = localStorage.getItem(key);
            if (storedImage && storedImage.startsWith('data:image')) {
              foundStoredImage = storedImage;
              console.log(`Found stored image for NFT ${nft.id} with key: ${key}`);
              break;
            }
          }

          if (foundStoredImage) {
            setResolvedImageUrl(foundStoredImage);
            console.log(`Using stored image for NFT ${nft.id}`);
          } else {
            // Only call getBestImageUrl if no stored image found
            const resolvedUrl = await getBestImageUrl(nft.id, nft.image);
            setResolvedImageUrl(resolvedUrl);
            console.log(`Resolved image URL: ${resolvedUrl} for NFT ${nft.id}`);
          }
        } catch (error) {
          console.error('Error resolving image URL:', error);
          setResolvedImageUrl(nft.image); // Fallback to original image
        }
      }
    };

    resolveImageUrl();
  }, [nft]);

  const handleFractionalize = async (config: NFTFractionalizationConfig) => {
    if (!isConnected) {
      // Try to connect to Nwallet properly
      try {
        // Import the NwalletProvider functions directly
        const { connectToNwallet, getNwalletSession } = await import('../providers/NwalletProvider');

        // Show a message to the user
        toast.info("Connecting to Nwallet...");

        // Try to connect to Nwallet
        const walletAddress = await connectToNwallet();

        if (!walletAddress) {
          // If connection fails, show a clear error message
          toast.error("Unable to connect to Nwallet. Please make sure Nwallet is running and try again.");
          return;
        }

        // Get the session to verify it was created
        const session = getNwalletSession();
        if (!session) {
          toast.error("Failed to create wallet session. Please try again.");
          return;
        }

        // Force localStorage update event
        window.dispatchEvent(new Event('storage'));

        // Inform the user of success
        toast.success("Connected to Nwallet successfully");

        // Wait for the session to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reload the page to use the new session
        window.location.reload();
        return;
      } catch (error) {
        console.error("[NFTDetails] Error connecting to Nwallet:", error);
        toast.error("Failed to connect to Nwallet. Please try again.");
        return;
      }
    }

    if (!nft) {
      toast.error('Missing NFT data');
      return;
    }

    try {
      setIsFractionalizing(true);

      // Get the ERC1155Service instance
      const erc1155Service = ERC1155Service.getInstance();

      // Call the service to fractionalize the NFT (will use localStorage to mock data)
      const txHash = await erc1155Service.fractionalize(
        nft.id,
        config.fractions,
        config.receiverAddress || ''
      );

      toast.success('NFT fractionalized successfully!');
      setShowFractionalize(false);

      // Update NFT with fractionalization data
      setNft(prev => {
        if (!prev) return null;

        return {
          ...prev,
          status: 'fractionalized',
          fractions: {
            supply: config.fractions,
            available: config.fractions,
            pricePerFraction: config.pricePerFraction,
            minimumPurchase: 1
          }
        };
      });

      // After successful fractionalization, show the transaction info
      setTransactionHash(txHash);
      setShowTransactionSuccess(true);
      setIsFractionalizing(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fractionalize NFT');
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

  const etherscanUrl = `https://sepolia.etherscan.io/tx/${nft.id}`;

  // Use the resolved image URL or fallback to original
  const ipfsUrl = resolvedImageUrl || nft.image || '/placeholder-nft.png';

  const createdDate = nft.createdAt ? new Date(nft.createdAt).toLocaleDateString() : 'Recently';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image */}
        <div className="space-y-6">
          <GlassCard className="overflow-hidden">
            {/* Show animation URL if available */}
            {(nft.animation_url || nft.metadata.animation_url) ? (
              <div className="aspect-square bg-black flex items-center justify-center">
                {/* Try to determine the type of animation */}
                {(nft.animation_url || nft.metadata.animation_url)?.endsWith('.mp4') ? (
                  <video
                    src={nft.animation_url || nft.metadata.animation_url}
                    controls
                    autoPlay
                    loop
                    muted
                    className="max-w-full max-h-full"
                  />
                ) : (nft.animation_url || nft.metadata.animation_url)?.endsWith('.glb') ? (
                  <div className="text-white text-center p-4">
                    <p className="mb-2">3D Model Available</p>
                    <a
                      href={nft.animation_url || nft.metadata.animation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 rounded-lg inline-block"
                    >
                      View 3D Model
                    </a>
                  </div>
                ) : (
                  <iframe
                    src={nft.animation_url || nft.metadata.animation_url}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title={nft.name}
                  />
                )}
              </div>
            ) : (
              <div className="aspect-square">
                <img
                  src={ipfsUrl}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  data-nft-id={nft.id}
                />
              </div>
            )}
          </GlassCard>

          {/* Additional Media */}
          {nft.media && nft.media.length > 1 && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Additional Media</h3>
                <div className="grid grid-cols-3 gap-3">
                  {nft.media.slice(1).map((media, index) => (
                    <a
                      key={index}
                      href={media.gateway || media.raw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square bg-white/5 rounded-lg overflow-hidden"
                    >
                      <img
                        src={media.thumbnail || media.gateway || media.raw}
                        alt={`Media ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

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
                    <p className="text-sm font-medium text-white mt-1 break-words">
                      {typeof attr.value === 'string' && attr.value.startsWith('0x') && attr.value.length > 30
                        ? `${attr.value.substring(0, 6)}...${attr.value.substring(attr.value.length - 4)}`
                        : attr.value}
                    </p>
                </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Collection Info */}
          {(nft.collection || nft.metadata.collection) && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Collection</h3>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white font-medium">
                    {nft.collection?.name || nft.metadata.collection?.name}
                  </p>
                  {(nft.collection?.family || nft.metadata.collection?.family) && (
                    <p className="text-white/60 text-sm mt-1">
                      Family: {nft.collection?.family || nft.metadata.collection?.family}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Rarity Info */}
          {nft.metadata.rarity && (
            <GlassCard>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Rarity</h3>
                <div className="bg-white/5 rounded-lg p-4">
                  {nft.metadata.rarity.rank && (
                    <p className="text-white">
                      Rank: <span className="font-medium">#{nft.metadata.rarity.rank}</span>
                    </p>
                  )}
                  {nft.metadata.rarity.score && (
                    <p className="text-white mt-2">
                      Score: <span className="font-medium">{nft.metadata.rarity.score.toFixed(2)}</span>
                    </p>
                  )}
                  {nft.metadata.rarity.totalSupply && (
                    <p className="text-white/60 text-sm mt-2">
                      Out of {nft.metadata.rarity.totalSupply} items
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          )}
            </div>

        {/* Right Column - Details */}
            <div className="space-y-6">
          <GlassCard>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{nft.name}</h1>
                  <p className="text-white/60 mt-2">{nft.description}</p>

                  {/* Token Type */}
                  {nft.tokenType && (
                    <div className="mt-3 inline-block bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                      {nft.tokenType}
                    </div>
                  )}

                  {/* External URL */}
                  {(nft.external_url || nft.metadata.external_url) && (
                    <div className="mt-3">
                      <a
                        href={nft.external_url || nft.metadata.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                      >
                        <span>Visit Website</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {/* Creator Profile */}
                  {nft.metadata.creator && (
                    <a
                      href={`https://sepolia.etherscan.io/address/${nft.metadata.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
                      title="Creator Profile"
                    >
                      <UserIcon className="w-5 h-5" />
                    </a>
                  )}

                  {/* Etherscan Link */}
                  <a
                    href={etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
                    title="View on Etherscan"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <p className="text-white/60 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Created
                  </p>
                  <p className="text-white mt-1">{createdDate || 'Recently'}</p>
                </div>
                <div>
                  <p className="text-white/60 flex items-center gap-2">
                    <TagIcon className="w-4 h-4" />
                    Royalties
                  </p>
                  <p className="text-white mt-1">{nft.royalties}%</p>
                </div>
              </div>

              {nft.status === 'fractionalized' ? (
                <div className="mt-6 space-y-4">
                  <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2">
                    <ShareIcon className="w-5 h-5" />
                    <span>This NFT has been fractionalized</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60">Available Fractions</p>
                      <p className="text-white text-lg font-medium mt-1">
                        {nft.fractions?.available || 0}/{nft.fractions?.supply || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Price per Fraction</p>
                      <p className="text-white text-lg font-medium mt-1 flex items-center gap-1">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        {nft.fractions ? parseFloat(nft.fractions.pricePerFraction).toFixed(4) : '0.0000'} ETH
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  {showFractionalize ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Fractionalize NFT</h3>
                      <p className="text-white/70 text-sm">
                        Split your NFT into multiple fractions that can be traded individually.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm mb-1">Number of Fractions</label>
                          <input
                            type="number"
                            min="2"
                            max="1000"
                            defaultValue="10"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Price per Fraction (ETH)</label>
                          <input
                            type="text"
                            defaultValue="0.01"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-2">
                        <button
                          onClick={() => setShowFractionalize(false)}
                          className="flex-1 py-2 rounded-lg border border-white/20 hover:bg-white/5 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleFractionalize({ fractions: 10, pricePerFraction: "0.01" })}
                          disabled={isFractionalizing}
                          className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors flex justify-center items-center"
                        >
                          {isFractionalizing ? (
                            <span className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></span>
                          ) : null}
                          {isFractionalizing ? 'Processing...' : 'Fractionalize'}
                        </button>
                      </div>
                    </div>
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

export default NFTDetails;