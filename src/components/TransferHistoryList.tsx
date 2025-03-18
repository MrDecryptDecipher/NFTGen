import React from 'react';
import { GlassCard } from './GlassCard';
import { Transfer } from '../types';
import { ExternalLink } from 'lucide-react';

interface TransferHistoryListProps {
  transfers: Transfer[];
}

export const TransferHistoryList: React.FC<TransferHistoryListProps> = ({ transfers }) => {
  return (
    <GlassCard>
      <div className="divide-y divide-white/10">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-white font-medium">
                NFT: {transfer.nft.name}
              </p>
              <p className="text-sm text-white/60">
                From: {transfer.from.slice(0, 6)}...{transfer.from.slice(-4)}
              </p>
              <p className="text-sm text-white/60">
                To: {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/60">
                {new Date(transfer.timestamp * 1000).toLocaleDateString()}
              </span>
              <a
                href={`https://etherscan.io/tx/${transfer.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};