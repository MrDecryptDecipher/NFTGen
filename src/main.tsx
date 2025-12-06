// Import polyfill first
import './polyfill';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { client } from './lib/apollo';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { initializeGlobalUtils } from './utils/global-utils';
import { initLogger } from './utils/initialization-logger';
import { memoryTracker } from './utils/memory-tracker';

// Use lazy loading for the main App to allow for fallback
const App = lazy(() => import('./App').catch(error => {
  console.error('Failed to load App component:', error);
  // Store error information for the fallback app
  try {
    localStorage.setItem('nftgen_error_info', JSON.stringify({
      message: error.message || 'Failed to load application',
      stack: error.stack,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to store error information:', e);
  }
  // Import the FallbackApp instead
  return import('./components/FallbackApp');
}));

// No loading component needed here as we use inline JSX in the Suspense fallback

// Start memory tracking
memoryTracker.startTracking();

// Initialize global utilities with singleton pattern and logging
initLogger.startTiming('NFTGen', 'global_utils_init');
console.log('🔧 Starting global utilities initialization...');
initializeGlobalUtils().then(() => {
  initLogger.endTiming('NFTGen', 'global_utils_init');
  console.log('✅ Global utilities initialization completed');
}).catch((error) => {
  initLogger.logEvent('NFTGen', 'global_utils_init_error', { error: error.message });
  console.error('❌ Global utilities initialization failed:', error);
});

// Create root and render app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Render the app with all providers
// Use conditional StrictMode based on environment to prevent duplicate renders in production
const AppWrapper = () => (
  <ApolloProvider client={client}>
    <Suspense fallback={
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
      }>
        <App />
      </Suspense>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </ApolloProvider>
);

// Conditional StrictMode rendering based on environment
const isDevelopment = import.meta.env.DEV;
const shouldUseStrictMode = isDevelopment && !import.meta.env.VITE_DISABLE_STRICT_MODE;

initLogger.logEvent('NFTGen', 'render_start', { strictMode: shouldUseStrictMode });
console.log(`🚀 NFTGen rendering with StrictMode: ${shouldUseStrictMode ? 'enabled' : 'disabled'}`);

initLogger.startTiming('NFTGen', 'app_render');
root.render(
  shouldUseStrictMode ? (
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  ) : (
    <AppWrapper />
  )
);
initLogger.endTiming('NFTGen', 'app_render');

initLogger.logEvent('NFTGen', 'initialization_complete');
console.log('✅ NFTGen initialization complete - using only real data from Alchemy/Nwallet');

// Print initialization report after a short delay to capture all events
setTimeout(() => {
  initLogger.printReport();
}, 2000);