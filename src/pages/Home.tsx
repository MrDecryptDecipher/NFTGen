import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_NFTS } from '../lib/apollo';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useWallet } from '../context/WalletContext';
import { isNijaWalletProvider } from '../walletConnection';
import { NFTUploadForm } from '../components/NFTUploadForm';
import { NFTGallery } from '../components/NFTGallery';

export function Home() {
  const navigate = useNavigate();
  const { address, isConnecting, connect } = useWallet();
  const [isNijaDetected, setIsNijaDetected] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userNFTs, setUserNFTs] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState<boolean>(false);
  
  // Check if Nija Wallet is detected and handle session
  useEffect(() => {
    const checkWalletAndSession = async () => {
      try {
        setIsInitializing(true);
        // Check for Nija Wallet
        const detected = isNijaWalletProvider();
        setIsNijaDetected(detected);

        // Check for session
        const searchParams = new URLSearchParams(window.location.search);
        const nijaSession = searchParams.get('session');

        if (nijaSession && !hasAttemptedConnection) {
          try {
            setHasAttemptedConnection(true);
            // If we have a session, store it and connect
            localStorage.setItem('nija_wallet_session', nijaSession);
            if (!address && !isConnecting) {
              console.log('Session found, attempting connection');
              await connect();
            }
          } catch (error) {
            console.error('Error connecting with session:', error);
            toast.error('Failed to connect with session');
          }
        } else if (detected && !address && !isConnecting && !hasAttemptedConnection) {
          // If wallet is detected but no session, attempt connection once
          setHasAttemptedConnection(true);
          console.log('Nija Wallet detected but not connected, attempting connection');
          await connect();
        }
      } catch (error) {
        console.error('Error in wallet initialization:', error);
        toast.error('Failed to initialize wallet');
      } finally {
        setIsInitializing(false);
      }
    };

    checkWalletAndSession();
  }, [address, isConnecting, connect, hasAttemptedConnection]);

  // Update connection status when address changes
  useEffect(() => {
    setIsConnected(!!address);
  }, [address]);
  
  // Only fetch NFTs if we have a wallet address and we're not initializing
  const { loading, error, data, refetch } = useQuery(GET_NFTS, {
    variables: { owner: address || '' },
    skip: !address || isInitializing,
    fetchPolicy: 'cache-and-network',
  });

  // Show loading state during initialization
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
  
  // Handle connect button click
  const handleConnectClick = async () => {
    if (isNijaDetected) {
      try {
        await connect();
      } catch (error) {
        console.error('Connection error:', error);
        toast.error('Failed to connect to Nija Wallet. Please try again.');
      }
    } else {
      toast.info('Please install or enable Nija Wallet to continue.');
    }
  };

  // Handle NFT upload
  const handleNFTUpload = (nft: any) => {
    setUserNFTs([...userNFTs, nft]);
  };

  // If wallet is connected, show NFTs
  if (isConnected) {
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
        
        <NFTGallery 
          nfts={data?.nfts || []} 
          isLoading={loading} 
        />
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors w-full"
                onClick={handleConnectClick}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-300">
                Nija Wallet not detected. Please ensure you are using the Nija Wallet browser.
              </p>
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors w-full"
                onClick={handleConnectClick}
              >
                Open Nija Wallet
              </button>
              <p className="text-sm text-gray-500">
                After opening Nija Wallet, please return to this page and refresh.
              </p>
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