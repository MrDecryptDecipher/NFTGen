import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_NFTS } from '../lib/apollo';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useWallet } from '../context/WalletContext';
import { isNijaWalletProvider } from '../walletConnection';
import { NFTUploadForm } from '../components/NFTUploadForm';
import { NFTGallery } from '../components/NFTGallery';

function Home() {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [isNijaDetected, setIsNijaDetected] = useState<boolean>(false);
  const { connect, isConnecting, isConnected } = useWallet();
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Check if Nija Wallet is detected (runs once)
  useEffect(() => {
    console.log("Home.tsx: Checking for Nija Wallet provider...");
    setIsInitializing(true);
    const detected = isNijaWalletProvider();
    setIsNijaDetected(detected);
    console.log(`Home.tsx: Nija Wallet detected: ${detected}`);
    // No automatic connection attempt here anymore
    setIsInitializing(false);
  }, []); // Empty dependency array means run only once on mount

  // Fetch NFTs based on context's address and isConnected state
  const { loading, error, data, refetch } = useQuery(GET_NFTS, {
    variables: { owner: address || '' },
    skip: !isConnected || !address, // Skip if not connected or no address
    fetchPolicy: 'cache-and-network',
  });

  // Show loading state during initial provider check
  if (isInitializing) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Initializing NFTGen...</h1>
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
          <p className="text-gray-600">
            Setting up your environment...
          </p>
        </div>
      </div>
    );
  }

  // Handle view NFT click
  const handleViewNFT = (id: string) => {
    navigate(`/nft/${id}`);
  };

  // Handle connect button click (Manual Connection)
  const handleConnectClick = async () => {
    if (isNijaDetected) {
        console.log("Home.tsx: Connect button clicked, calling connect()...");
        try {
            // Debug: Check localStorage for session
            const sessionStr = localStorage.getItem('nija_wallet_session');
            if (sessionStr) {
              try {
                const sessionData = JSON.parse(sessionStr);
                console.log("Home.tsx: Found existing session in localStorage:", sessionData);

                // Try to use the existing session
                if (sessionData.address) {
                  console.log("Home.tsx: Using existing session address:", sessionData.address);
                  toast.info(`Using existing session for address: ${sessionData.address.substring(0, 8)}...`);
                }
              } catch (parseError) {
                console.error("Home.tsx: Error parsing session data:", parseError);
              }
            } else {
              console.log("Home.tsx: No session found in localStorage");
            }

            await connect(); // Use the connect function from useWallet
        } catch (error) {
            console.error('Home.tsx: Manual Connection error:', error);
            toast.error('Failed to connect to Nija Wallet. Please try again.');
        }
    } else {
      toast.info('Please install or enable Nija Wallet to continue.');
      // Optionally try opening Nwallet? window.open('http://3.111.22.56:6101/nijawallet', '_blank');
    }
  };

  // Handle NFT upload
  const handleNFTUpload = (nft: any) => {
    setUserNFTs([...userNFTs, nft]);
  };

  // If wallet is connected, show NFTs
  if (isConnected && address) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Your NFT Collection</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Connected to Nija Wallet
            </div>
            <button
              onClick={() => navigate('/create')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create NFT
            </button>
          </div>
        </div>

        <NFTGallery />
      </div>
    );
  }

  // If no NFTs found, show empty state
  if (!data?.nfts || data.nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Welcome to NFTGen</h1>
          <p className="text-gray-400">Start your NFT collection today!</p>
        </div>
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 max-w-md w-full">
          <div className="text-center space-y-4">
            <p className="text-gray-300">You don't have any NFTs yet.</p>
            <button
              onClick={() => navigate('/create')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors w-full"
            >
              Create Your First NFT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no wallet is connected, show connect message
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Welcome to NFTGen</h1>
          <p className="text-gray-400">Connect your Nija Wallet to view your NFTs</p>
        </div>
        <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 max-w-md w-full">
          {isNijaDetected ? (
            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Nija Wallet detected! Click below to connect and view your NFTs.
              </p>
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors w-full disabled:opacity-50"
                onClick={handleConnectClick}
                disabled={isConnecting} // Disable button while connecting
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>

              <button
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors w-full"
                onClick={() => {
                  // Debug: Check localStorage for session
                  const sessionStr = localStorage.getItem('nija_wallet_session');
                  if (sessionStr) {
                    try {
                      const sessionData = JSON.parse(sessionStr);
                      console.log("Debug: Found session in localStorage:", sessionData);
                      toast.info(`Session found for address: ${sessionData.address.substring(0, 8)}...`);

                      // Force update the wallet context
                      if (sessionData.address) {
                        // Manually set the session in localStorage
                        localStorage.setItem('nija_wallet_session', JSON.stringify({
                          ...sessionData,
                          timestamp: Date.now() // Update timestamp
                        }));

                        // Reload the page to force the wallet context to re-read the session
                        window.location.reload();
                      }
                    } catch (parseError) {
                      console.error("Debug: Error parsing session data:", parseError);
                      toast.error("Error parsing session data");
                    }
                  } else {
                    console.log("Debug: No session found in localStorage");
                    toast.warning("No session found in localStorage");
                  }
                }}
              >
                Debug Session
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Nija Wallet not detected. Please ensure Nija Wallet is running and accessible.
              </p>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors w-full"
                onClick={() => {
                  window.open('http://3.111.22.56:6101/nijawallet', '_blank');
                }}
              >
                Open Nija Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If loading NFTs, show loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        <p className="text-gray-400">Loading your NFTs...</p>
      </div>
    );
  }

  // If error loading NFTs, show error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg max-w-md w-full" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block mt-1">Failed to load NFTs: {error.message}</span>
        </div>
        <div className="flex space-x-4">
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            onClick={() => refetch()}
          >
            Try Again
          </button>
          <button
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
            onClick={() => connect()}
          >
            Reconnect Wallet
          </button>
        </div>
      </div>
    );
  }

  // If wallet is not connected, show connecting message
  return (
    <div className="container mx-auto p-6">
      <div className="text-center">
        <p className="text-lg mb-4">Connecting to Nija Wallet...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
      </div>
    </div>
  );
}

export default Home;