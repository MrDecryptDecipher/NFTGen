// Import polyfill first
import './polyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApolloProvider } from '@apollo/client';
import { client } from './lib/apollo';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { verifyWalletConnection, initializeNijaWallet } from './walletConnection';
import { ErrorBoundary } from './components/ErrorBoundary';

// Extend Window interface to include Sentry
declare global {
  interface Window {
    Sentry?: {
      init: (config: any) => void;
      captureException: (error: any) => void;
      captureMessage: (message: string) => void;
    };
    nijaHeartbeatInterval?: NodeJS.Timeout;
    emitEthereumEvent?: (eventName: string, ...args: any[]) => void;
    ethereum?: any;
    __nftgenPatched?: boolean;
  }
}

// Wait for window.ethereum to be injected
const waitForEthereum = () => {
  return new Promise<void>((resolve) => {
    if (window.ethereum) {
      resolve();
    } else {
      window.addEventListener('ethereum#initialized', () => {
        resolve();
      }, { once: true });
      
      // If no injection happened within 3 seconds, proceed
      setTimeout(resolve, 3000);
    }
  });
};

// Initialize the app
const initializeApp = async () => {
  try {
    // Only initialize if we have a nija_session
    const searchParams = new URLSearchParams(window.location.search);
    const nijaSession = searchParams.get('nija_session');

    if (nijaSession) {
      // Initialize permanent connection to Nija Wallet
      await initializeNijaWallet();
    } else {
      console.log('No Nija session found - skipping wallet initialization');
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
};

// Start the application
waitForEthereum()
  .then(async () => {
    if (window.ethereum) {
      console.log('Ethereum provider detected');
    } else {
      console.log('No Ethereum provider detected');
    }
    
    // Initialize app before rendering
    await initializeApp();
    
    // Create root only once
    const root = ReactDOM.createRoot(
      document.getElementById('root') as HTMLElement
    );

    // Render the app
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ApolloProvider client={client}>
            <App />
            <ToastContainer position="bottom-right" />
          </ApolloProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  });