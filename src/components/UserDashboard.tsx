import React from 'react';
import { useAccount } from 'wagmi';
import { GlassCard } from './GlassCard';
import { useUserNFTs } from '../hooks/useUserNFTs';
import { useTransferHistory } from '../hooks/useTransferHistory';
import { NFTCard } from './NFTCard';
import { TransferHistoryList } from './TransferHistoryList';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

interface UserDashboardProps {
  walletAddress?: `0x${string}`;
  isConnected: boolean;
}

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => {
  return (
    <GlassCard className="text-center py-12">
      <h2 className="text-xl font-semibold text-red-400 mb-4">Error Loading Dashboard</h2>
      <p className="text-white/80 mb-4">
        {error.message === 'Failed to fetch' ? 
          'Unable to connect to the server. Please check your connection and try again.' :
          error.message
        }
      </p>
      <div className="space-y-4">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          Try Again
        </button>
        <p className="text-sm text-white/60">
          If the problem persists, please try refreshing the page or contact support.
        </p>
      </div>
    </GlassCard>
  );
};

const DashboardContent: React.FC<UserDashboardProps> = ({ walletAddress, isConnected }) => {
  const { address } = useAccount();
  const { nfts, isLoading: isLoadingNFTs, error: nftsError } = useUserNFTs(walletAddress || address);
  const { transfers, isLoading: isLoadingTransfers, error: transfersError } = useTransferHistory(walletAddress || address);

  if (!isConnected || !walletAddress) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-white/80">Please connect your wallet to view your dashboard</p>
      </GlassCard>
    );
  }

  if (nftsError || transfersError) {
    throw nftsError || transfersError;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Your NFTs</h2>
        {isLoadingNFTs ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-4">Transfer History</h2>
        {isLoadingTransfers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        ) : (
          <TransferHistoryList transfers={transfers} />
        )}
      </section>
    </div>
  );
};

export const UserDashboard: React.FC<UserDashboardProps> = (props) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset any state that might have caused the error
        window.location.reload();
      }}
    >
      <DashboardContent {...props} />
    </ErrorBoundary>
  );
};