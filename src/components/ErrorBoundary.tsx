import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error
    console.error('React error boundary caught error:', error, errorInfo);

    // Check for specific error types
    if (error.message.includes('Invalid hook call') || 
        error.message.includes('Minified React error #130')) {
      toast.error('Component rendering error. Please check hook usage and component state.');
    } else {
      toast.error('An unexpected error occurred. Please try refreshing the page.');
    }

    this.setState({
      error,
      errorInfo
    });

    // Send to error reporting service if available
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }
  }

  handleRetry = (): void => {
    // Clear the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Force a re-render of the children
    this.forceUpdate();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary-container p-4 bg-red-50 rounded-lg">
          <div className="error-content text-center">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h1>
            <p className="text-red-600 mb-4">
              We're sorry, but something went wrong. Please try again.
            </p>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="error-details bg-white p-4 rounded mb-4 text-left">
                <pre className="text-sm text-red-800 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="error-actions space-x-4">
              <button
                onClick={this.handleRetry}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary; 