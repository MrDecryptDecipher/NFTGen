import React from 'react';
import { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20">
      <h3 className="text-xl font-semibold text-red-400 mb-2">
        Something went wrong
      </h3>
      <pre className="text-sm text-red-300/80 mb-4 whitespace-pre-wrap">
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