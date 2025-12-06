import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Divider } from '@mui/material';

/**
 * FallbackApp component that is rendered when the main application fails to load
 * This provides a minimal UI that can be loaded even when the main app has errors
 */
const FallbackApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Simulate checking application status
    const checkAppStatus = async () => {
      setIsLoading(true);
      try {
        // Wait a moment to simulate checking
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we have any error information in localStorage
        const errorInfo = localStorage.getItem('nftgen_error_info');
        if (errorInfo) {
          try {
            const parsedError = JSON.parse(errorInfo);
            setError(new Error(parsedError.message || 'Application failed to load'));
          } catch (_e) {
            setError(new Error('Application failed to load'));
          }
        } else {
          setError(new Error('Application failed to load'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    checkAppStatus();
  }, [retryCount]);

  const handleRetry = () => {
    // Clear any stored error information
    localStorage.removeItem('nftgen_error_info');
    
    // Increment retry count to trigger the effect
    setRetryCount(prev => prev + 1);
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleClearCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any service worker caches if possible
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Reload the page
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress color="primary" size={40} />
        <Typography variant="body1" color="text.secondary">
          Checking application status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      bgcolor: '#f5f5f5',
      p: 2
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 600,
          width: '100%',
          borderRadius: 2
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ mb: 2, color: 'primary.main' }}>
            NFTGen
          </Typography>
          
          <Typography variant="h5" component="h2" sx={{ mb: 2, color: 'error.main' }}>
            Application Error
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3 }}>
            We're sorry, but the application has encountered an error and cannot load properly.
            {error && (
              <Box component="span" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                {error.message}
              </Box>
            )}
          </Typography>

          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Please try the following solutions:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRetry}
              fullWidth
            >
              Reload Application
            </Button>
            
            <Button
              variant="outlined"
              color="warning"
              onClick={handleClearCache}
              fullWidth
            >
              Clear Cache & Reload
            </Button>
            
            <Button
              variant="text"
              color="info"
              onClick={() => window.open('http://3.111.22.56:7103?debug=true', '_self')}
              fullWidth
            >
              Load in Debug Mode
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Typography variant="body2" sx={{ mt: 4, color: 'text.disabled' }}>
        If the problem persists, please contact support.
      </Typography>
    </Box>
  );
};

export default FallbackApp;
