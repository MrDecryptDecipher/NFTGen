import React from 'react';
import { toast } from 'react-toastify';
import { Box, Typography, Button, Paper, Divider, CircularProgress } from '@mui/material';
import { getStorageItem } from '../utils/safeStorage';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

type FallbackRender = (props: FallbackProps) => React.ReactNode;

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode | FallbackRender;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  suspenseFallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorType: 'render' | 'network' | 'websocket' | 'unknown';
  isLoading: boolean;
}

// Error categories for better user feedback
const ERROR_CATEGORIES = {
  RENDER: {
    patterns: [
      'Invalid hook call',
      'Minified React error #130',
      'Cannot read property',
      'is not a function',
      'is not defined',
      'Cannot read properties of undefined',
      'Maximum update depth exceeded'
    ],
    message: 'Component rendering error. The application will try to recover automatically.'
  },
  NETWORK: {
    patterns: [
      'Network Error',
      'Failed to fetch',
      'NetworkError',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'socket hang up',
      'network request failed'
    ],
    message: 'Network connection error. Please check your internet connection and try again.'
  },
  WEBSOCKET: {
    patterns: [
      'WebSocket',
      'Socket',
      'Connection closed',
      'Connection failed',
      'Failed to connect'
    ],
    message: 'WebSocket connection error. The application will continue to function with limited real-time updates.'
  }
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      isLoading: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Categorize the error
    let errorType: 'render' | 'network' | 'websocket' | 'unknown' = 'unknown';
    const errorString = error.toString();

    // Check each category
    for (const [category, { patterns }] of Object.entries(ERROR_CATEGORIES)) {
      if (patterns.some(pattern => errorString.includes(pattern))) {
        errorType = category.toLowerCase() as 'render' | 'network' | 'websocket' | 'unknown';
        break;
      }
    }

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error
    console.error('React error boundary caught error:', error, errorInfo);

    // Determine error type for better user feedback
    let errorType: 'render' | 'network' | 'websocket' | 'unknown' = 'unknown';
    const errorString = error.toString();

    // Check each category
    for (const [category, { patterns, message }] of Object.entries(ERROR_CATEGORIES)) {
      if (patterns.some(pattern => errorString.includes(pattern))) {
        errorType = category.toLowerCase() as 'render' | 'network' | 'websocket' | 'unknown';
        toast.error(message);
        break;
      }
    }

    // If no specific category matched, show generic error
    if (errorType === 'unknown') {
      toast.error('An unexpected error occurred. Please try refreshing the page.');
    }

    this.setState({
      error,
      errorInfo,
      errorType
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error reporting service if available
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }

    // For render errors, try to auto-recover after a short delay
    if (errorType === 'render') {
      setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  }

  handleRetry = (): void => {
    // Set loading state
    this.setState({ isLoading: true });

    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Clear the error state after a short delay to allow for any async operations
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isLoading: false
      });
    }, 500);
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo, errorType, isLoading } = this.state;

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress color="primary" />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Recovering...
          </Typography>
        </Box>
      );
    }

    if (hasError && error) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        // If fallback is a function, call it with error and reset function
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: error,
            resetErrorBoundary: this.handleRetry
          });
        }
        // Otherwise, render the ReactNode directly
        return this.props.fallback;
      }

      // Default error UI with improved styling and better error information
      return (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            m: 2,
            bgcolor: errorType === 'network' ? 'warning.light' :
                     errorType === 'websocket' ? 'info.light' : 'error.light',
            borderRadius: 2
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" component="h1" sx={{ mb: 2, color: 'text.primary' }}>
              {errorType === 'network' ? 'Network Connection Error' :
               errorType === 'websocket' ? 'WebSocket Connection Issue' :
               'Something went wrong'}
            </Typography>

            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              {errorType === 'network' ? 'Please check your internet connection and try again.' :
               errorType === 'websocket' ? 'Real-time updates may be limited, but the app will continue to function.' :
               'We\'re sorry, but something went wrong. Please try again.'}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Show error details in development or for debugging */}
            {(process.env.NODE_ENV === 'development' || getStorageItem('debug_mode') === 'true') && error && (
              <Box sx={{
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                mb: 3,
                textAlign: 'left',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary' }}>
                  Error Details:
                </Typography>
                <Typography component="pre" sx={{
                  fontSize: '0.8rem',
                  color: 'error.main',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {error.toString()}
                </Typography>

                {errorInfo && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.primary' }}>
                      Component Stack:
                    </Typography>
                    <Typography component="pre" sx={{
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {errorInfo.componentStack}
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color={errorType === 'network' ? 'warning' :
                       errorType === 'websocket' ? 'info' : 'error'}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>

              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>

              {/* Additional help button for network errors */}
              {errorType === 'network' && (
                <Button
                  variant="text"
                  onClick={() => {
                    toast.info('Checking network connection...');
                    // Attempt to ping a reliable service
                    fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' })
                      .then(() => toast.success('Internet connection is working. The issue may be with our servers.'))
                      .catch(() => toast.error('Internet connection appears to be down. Please check your network.'));
                  }}
                >
                  Check Connection
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      );
    }

    // If no error, render children
    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode | FallbackRender;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    onReset?: () => void;
  }
): React.ComponentType<P> {
  const { fallback, onError, onReset } = options || {};

  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary
        fallback={fallback}
        onError={onError}
        onReset={onReset}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Create a component that combines ErrorBoundary with React.Suspense
export function SuspenseWithErrorBoundary({
  children,
  fallback,
  suspenseFallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode | FallbackRender;
  suspenseFallback?: React.ReactNode;
}) {
  const defaultSuspenseFallback = (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <CircularProgress color="primary" />
    </Box>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <React.Suspense fallback={suspenseFallback || defaultSuspenseFallback}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

export default ErrorBoundary;