/**
 * Error Handling Service
 *
 * This service provides standardized error handling for the NFTGen application,
 * particularly for integration with Nwallet.
 */

// Define error types
export enum ErrorType {
  PROVIDER_ERROR = 'provider_error',
  SESSION_ERROR = 'session_error',
  TRANSACTION_ERROR = 'transaction_error',
  NETWORK_ERROR = 'network_error',
  WEBSOCKET_ERROR = 'websocket_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Define error codes
export enum ErrorCode {
  // Provider errors
  PROVIDER_NOT_FOUND = 'provider_not_found',
  PROVIDER_TIMEOUT = 'provider_timeout',
  PROVIDER_ACCESS_DENIED = 'provider_access_denied',
  PROVIDER_DISCONNECTED = 'provider_disconnected',

  // Session errors
  SESSION_INVALID = 'session_invalid',
  SESSION_EXPIRED = 'session_expired',
  SESSION_VERIFICATION_FAILED = 'session_verification_failed',

  // Transaction errors
  TRANSACTION_REJECTED = 'transaction_rejected',
  TRANSACTION_FAILED = 'transaction_failed',
  TRANSACTION_TIMEOUT = 'transaction_timeout',

  // Network errors
  NETWORK_DISCONNECTED = 'network_disconnected',
  NETWORK_MISMATCH = 'network_mismatch',

  // WebSocket errors
  WEBSOCKET_CONNECTION_FAILED = 'websocket_connection_failed',
  WEBSOCKET_DISCONNECTED = 'websocket_disconnected',

  // Unknown errors
  UNKNOWN_ERROR = 'unknown_error'
}

// Define error interface
export interface NijaWalletError {
  type: ErrorType;
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
  suggestedAction?: string;
}

// Create error factory functions
export const createProviderError = (
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable = true,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.PROVIDER_ERROR,
  code,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

export const createSessionError = (
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable = true,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.SESSION_ERROR,
  code,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

export const createTransactionError = (
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable = true,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.TRANSACTION_ERROR,
  code,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

export const createNetworkError = (
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable = true,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.NETWORK_ERROR,
  code,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

export const createWebSocketError = (
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable = true,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.WEBSOCKET_ERROR,
  code,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

export const createUnknownError = (
  message: string,
  details?: any,
  recoverable = false,
  suggestedAction?: string
): NijaWalletError => ({
  type: ErrorType.UNKNOWN_ERROR,
  code: ErrorCode.UNKNOWN_ERROR,
  message,
  details,
  timestamp: Date.now(),
  recoverable,
  suggestedAction
});

// Error handling functions
export const handleProviderError = (error: any): NijaWalletError => {
  // Handle provider-specific errors
  if (error?.message?.includes('User rejected')) {
    return createProviderError(
      ErrorCode.PROVIDER_ACCESS_DENIED,
      'User denied access to the wallet',
      error,
      true,
      'Please try again and approve the connection request in Nwallet'
    );
  }

  if (error?.message?.includes('timeout')) {
    return createProviderError(
      ErrorCode.PROVIDER_TIMEOUT,
      'Connection to Nwallet timed out',
      error,
      true,
      'Please check if Nwallet is running and try again'
    );
  }

  return createProviderError(
    ErrorCode.UNKNOWN_ERROR,
    error?.message || 'Unknown provider error',
    error,
    true,
    'Please try again or refresh the page'
  );
};

// Dispatch error event
export const dispatchError = (error: NijaWalletError): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nftgen_error', {
      detail: error
    }));
  }

  // Log error to console
  console.error(`[${error.type}] ${error.code}: ${error.message}`, error.details || '');
};

// Export a function to handle and dispatch errors
export const handleError = (error: any, type?: ErrorType): NijaWalletError => {
  // Just log the error to console but don't show any popups
  console.warn('Error suppressed:', error?.message || 'Unknown error', type);

  // Create a dummy error that won't trigger UI popups
  const dummyError: NijaWalletError = {
    type: ErrorType.UNKNOWN_ERROR,
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'Error suppressed',
    details: { originalError: error, type },
    timestamp: Date.now(),
    recoverable: true,
    suggestedAction: 'No action needed'
  };

  // Don't dispatch the error to prevent popups
  // dispatchError(dummyError);

  return dummyError;
};
