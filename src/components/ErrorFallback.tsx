import React from 'react';
import { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Determine if this is a network error
  const isNetworkError = error.message.includes('network') ||
                         error.message.includes('fetch') ||
                         error.message.includes('timeout') ||
                         error.message.includes('ECONNREFUSED') ||
                         error.message.includes('Failed to fetch');

  // Determine if this is an Alchemy API error
  const isAlchemyError = error.message.includes('Alchemy') ||
                         error.message.includes('API key') ||
                         error.message.includes('rate limit');

  // Create a user-friendly error message
  let errorTitle = "Something went wrong";
  let errorMessage = error.message;
  let errorHint = "";

  if (isNetworkError) {
    errorTitle = "Network Error";
    errorMessage = "Could not connect to the server. Please check your internet connection.";
    errorHint = "This might be due to network connectivity issues or the server being temporarily unavailable.";
  } else if (isAlchemyError) {
    errorTitle = "API Service Error";
    errorMessage = "Could not retrieve data from the blockchain service.";
    errorHint = "This might be due to temporary service disruption or API rate limiting.";
  }

  return (
    <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20">
      <h3 className="text-xl font-semibold text-red-400 mb-2">
        {errorTitle}
      </h3>
      <div className="text-sm text-red-300/80 mb-2">
        {errorMessage}
      </div>
      {errorHint && (
        <div className="text-xs text-red-300/60 mb-4 italic">
          {errorHint}
        </div>
      )}
      <pre className="text-xs text-red-300/50 mb-4 whitespace-pre-wrap bg-red-500/5 p-2 rounded max-h-20 overflow-auto">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}