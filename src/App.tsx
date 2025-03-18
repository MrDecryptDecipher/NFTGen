import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './lib/apollo';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setupNijaWalletConnection, verifyWalletConnection, setupWalletEventListeners } from './walletConnection';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Pages
import { Home } from './pages/Home';
import { NFTDetails } from './pages/NFTDetails';
import CreateNFT from './pages/CreateNFT';
import Gallery from './pages/Gallery';
import History from './pages/History';

// Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';

// Context
import { WalletProvider } from './context/WalletContext';
import { NFTProvider } from './context/NFTContext';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

const App: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    const initWallet = async () => {
      try {
        // Check for session parameter
        const urlParams = new URLSearchParams(window.location.search);
        const encodedSession = urlParams.get('session');
        
        if (encodedSession) {
          try {
            // Decode and parse session data
            const sessionData = JSON.parse(decodeURIComponent(encodedSession));
            localStorage.setItem('nija_wallet_session', JSON.stringify(sessionData));
            
            // Set wallet state
            setAddress(sessionData.address);
            setChainId(sessionData.chainId);
            setIsConnected(true);
            
            toast.success('Connected with Nija Wallet');
          } catch (error) {
            console.error('Error parsing session data:', error);
            toast.error('Failed to connect with Nija Wallet');
          }
        } else if (!isConnected && !isConnecting) {
          // Check for existing connection only if not already connected/connecting
          const connection = await verifyWalletConnection();
          if (connection) {
            setAddress(connection);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
        toast.error('Failed to initialize wallet');
      }
    };

    initWallet();
  }, [isConnected, isConnecting]);

  // Handle wallet events
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAddress(accounts[0] || null);
    };

    const handleChainChanged = (chainId: string) => {
      setChainId(chainId);
    };

    const handleDisconnect = () => {
      setAddress(null);
      setChainId(null);
      setProvider(null);
      setIsConnected(false);
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
    };
  }, [provider]);

  // Create a wallet context value to pass to components
  const walletContextValue = {
    address,
    chainId,
    isConnected,
    isConnecting,
    error: null,
    connect: async () => {
      try {
        setIsConnecting(true);
        
        // Initialize wallet and get address
        const result = await setupNijaWalletConnection();
        setProvider(result.provider);
        setAddress(result.address);
        setChainId(result.chainId.toString(16));
        setIsConnected(true);
        
        console.log('Successfully connected to Nija Wallet:', result.address);
      } catch (error) {
        console.error('Wallet connection error:', error);
        setAddress(null);
        setChainId(null);
        setIsConnected(false);
      } finally {
        setIsConnecting(false);
      }
    },
    disconnect: async () => {
      try {
        await verifyWalletConnection();
        setAddress(null);
        setChainId(null);
        setProvider(null);
        setIsConnected(false);
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <ApolloProvider client={client}>
          <WalletProvider>
            <NFTProvider>
              <Router>
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-black text-white">
                  <Navbar isWalletConnected={isConnected} walletAddress={address || ''} />
                  <div className="app-container relative">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
                    <div className="relative">
                      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-purple-500 to-purple-900 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
                      </div>
                    </div>
                    <main className="container mx-auto px-4 py-8">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/nft/:id" element={<NFTDetails />} />
                        <Route path="/dashboard" element={<Dashboard address={address || ''} />} />
                        <Route path="/create" element={<CreateNFT />} />
                        <Route path="/gallery" element={<Gallery />} />
                        <Route path="/history" element={<History />} />
                      </Routes>
                    </main>
                    <div className="relative">
                      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
                        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-purple-800 to-purple-900 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
                      </div>
                    </div>
                  </div>
                </div>
                <ToastContainer 
                  position="bottom-right" 
                  autoClose={5000}
                  theme="dark"
                  toastClassName="bg-slate-800 text-white"
                />
              </Router>
            </NFTProvider>
          </WalletProvider>
        </ApolloProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
