import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WalletContext } from './context/WalletContext';
import { NFTContext } from './context/NFTContext';
import { Navbar } from './components/Navbar';
import { useAuth } from './hooks/useAuth';

// Import pages
import Home from './pages/Home';
import CreateNFT from './pages/CreateNFT';
import Gallery from './pages/Gallery';
import History from './pages/History';
import NFTDetails from './pages/NFTDetails';

// Import services
import { alchemyNFTService } from './services/AlchemyNFTService';
import { realPerformanceMonitor } from './services/realPerformanceMonitor';

// Simple loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    gap: '1rem'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p>Loading content...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [nfts, setNfts] = useState([]);

  // Use centralized authentication
  const { isAuthenticated, walletAddress, isLoading: authLoading, login } = useAuth();

  // Check for URL parameters on app startup for automatic authentication
  useEffect(() => {
    const checkUrlParameters = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');
      const address = urlParams.get('address');

      if (sessionId && address && !isAuthenticated) {
        console.log('🔗 NFTGen: Detected session from Nwallet, attempting automatic authentication...');
        console.log('Session ID:', sessionId);
        console.log('Address:', address);

        try {
          // Check if session is already stored in localStorage (from Nwallet)
          const storedSession = localStorage.getItem('nftgen_nwallet_session');
          if (storedSession) {
            console.log('✅ NFTGen: Found session in localStorage, authentication should be automatic');
            // Clear URL parameters to clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // The useAuth hook will automatically pick up the session from localStorage
          } else {
            console.log('⚠️ NFTGen: Session not found in localStorage, user will need to login manually');
          }
        } catch (error) {
          console.error('❌ NFTGen: Error during automatic authentication setup:', error);
        }
      }
    };

    checkUrlParameters();
  }, []); // Run only once on component mount

  // Derive state from auth service
  const address = walletAddress || '';
  const isConnected = isAuthenticated;

  // Initialize Alchemy NFT Service
  useEffect(() => {
    console.log('✅ Real Performance Observer initialized');
    // Performance monitoring is automatically initialized in the constructor

    console.log('✅ Alchemy NFT Service initialized with Sepolia network and performance monitoring');

    // Initialize wallet connection using centralized auth
    console.log('App: Initializing with centralized authentication...');
    initializeWalletConnection();

    setIsLoading(false);
  }, [isAuthenticated, address]);

  const initializeWalletConnection = async () => {
    try {
      if (isAuthenticated && address) {
        console.log('App: User authenticated with address:', address);
        // Load NFTs for the authenticated address
        await loadNFTs(address);
      } else {
        console.log('App: No authenticated user found');
      }
    } catch (error) {
      console.error('App: Error initializing wallet connection:', error);
    }
  };

  const loadNFTs = async (userAddress: string) => {
    try {
      console.log(`🔍 Fetching NFTs for owner: ${userAddress} using Alchemy API`);
      const result = await alchemyNFTService.getNFTsForOwner(userAddress);

      console.log(`✅ Retrieved ${result.nfts.length} NFTs from Alchemy`);
      setNfts(result.nfts);

      // Store in localStorage for offline access
      localStorage.setItem('nftgen_user_nfts_alchemy', JSON.stringify(result.nfts));
      console.log('📦 Stored NFTs in localStorage for offline access');

    } catch (error) {
      console.error('App: Error loading NFTs:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Loading NFTGen...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WalletContext.Provider value={{
        address,
        isConnected,
        setAddress: () => {}, // No longer needed - managed by auth service
        setIsConnected: () => {}, // No longer needed - managed by auth service
        loadNFTs
      }}>
        <NFTContext.Provider value={{
          nfts,
          setNfts,
          isLoading: false
        }}>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              <Navbar />
              <main>
                <Suspense fallback={
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                    color: 'white'
                  }}>
                    Loading...
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/create" element={<CreateNFT />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/nft/:id" element={<NFTDetails />} />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </Router>
        </NFTContext.Provider>
      </WalletContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
