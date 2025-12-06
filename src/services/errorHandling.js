/**
 * Error Handling Service
 *
 * This service provides standardized error handling for the NFTGen application,
 * particularly for integration with Nwallet.
 */
// Define error types
export var ErrorType;
(function (ErrorType) {
    ErrorType["PROVIDER_ERROR"] = "provider_error";
    ErrorType["SESSION_ERROR"] = "session_error";
    ErrorType["TRANSACTION_ERROR"] = "transaction_error";
    ErrorType["NETWORK_ERROR"] = "network_error";
    ErrorType["WEBSOCKET_ERROR"] = "websocket_error";
    ErrorType["UNKNOWN_ERROR"] = "unknown_error";
})(ErrorType || (ErrorType = {}));
// Define error codes
export var ErrorCode;
(function (ErrorCode) {
    // Provider errors
    ErrorCode["PROVIDER_NOT_FOUND"] = "provider_not_found";
    ErrorCode["PROVIDER_TIMEOUT"] = "provider_timeout";
    ErrorCode["PROVIDER_ACCESS_DENIED"] = "provider_access_denied";
    ErrorCode["PROVIDER_DISCONNECTED"] = "provider_disconnected";
    // Session errors
    ErrorCode["SESSION_INVALID"] = "session_invalid";
    ErrorCode["SESSION_EXPIRED"] = "session_expired";
    ErrorCode["SESSION_VERIFICATION_FAILED"] = "session_verification_failed";
    // Transaction errors
    ErrorCode["TRANSACTION_REJECTED"] = "transaction_rejected";
    ErrorCode["TRANSACTION_FAILED"] = "transaction_failed";
    ErrorCode["TRANSACTION_TIMEOUT"] = "transaction_timeout";
    // Network errors
    ErrorCode["NETWORK_DISCONNECTED"] = "network_disconnected";
    ErrorCode["NETWORK_MISMATCH"] = "network_mismatch";
    // WebSocket errors
    ErrorCode["WEBSOCKET_CONNECTION_FAILED"] = "websocket_connection_failed";
    ErrorCode["WEBSOCKET_DISCONNECTED"] = "websocket_disconnected";
    // Unknown errors
    ErrorCode["UNKNOWN_ERROR"] = "unknown_error";
})(ErrorCode || (ErrorCode = {}));
// Create error factory functions
export const createProviderError = (code, message, details, recoverable = true, suggestedAction) => ({
    type: ErrorType.PROVIDER_ERROR,
    code,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
export const createSessionError = (code, message, details, recoverable = true, suggestedAction) => ({
    type: ErrorType.SESSION_ERROR,
    code,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
export const createTransactionError = (code, message, details, recoverable = true, suggestedAction) => ({
    type: ErrorType.TRANSACTION_ERROR,
    code,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
export const createNetworkError = (code, message, details, recoverable = true, suggestedAction) => ({
    type: ErrorType.NETWORK_ERROR,
    code,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
export const createWebSocketError = (code, message, details, recoverable = true, suggestedAction) => ({
    type: ErrorType.WEBSOCKET_ERROR,
    code,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
export const createUnknownError = (message, details, recoverable = false, suggestedAction) => ({
    type: ErrorType.UNKNOWN_ERROR,
    code: ErrorCode.UNKNOWN_ERROR,
    message,
    details,
    timestamp: Date.now(),
    recoverable,
    suggestedAction
});
// Error handling functions
export const handleProviderError = (error) => {
    // Handle provider-specific errors
    if (error?.message?.includes('User rejected')) {
        return createProviderError(ErrorCode.PROVIDER_ACCESS_DENIED, 'User denied access to the wallet', error, true, 'Please try again and approve the connection request in Nwallet');
    }
    if (error?.message?.includes('timeout')) {
        return createProviderError(ErrorCode.PROVIDER_TIMEOUT, 'Connection to Nwallet timed out', error, true, 'Please check if Nwallet is running and try again');
    }
    return createProviderError(ErrorCode.UNKNOWN_ERROR, error?.message || 'Unknown provider error', error, true, 'Please try again or refresh the page');
};
// Dispatch error event
export const dispatchError = (error) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nftgen_error', {
            detail: error
        }));
    }
    // Log error to console
    console.error(`[${error.type}] ${error.code}: ${error.message}`, error.details || '');
};
// Export a function to handle and dispatch errors
export const handleError = (error, type) => {
    // Just log the error to console but don't show any popups
    console.warn('Error suppressed:', error?.message || 'Unknown error', type);
    // Create a dummy error that won't trigger UI popups
    const dummyError = {
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
