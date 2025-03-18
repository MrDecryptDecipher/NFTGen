import React, { useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { cryptoService } from '../services/cryptoService';

interface WalletDetailsProps {
  address: string;
  network: string;
  balance: string;
}

export const WalletDetails: React.FC<WalletDetailsProps> = ({
  address,
  network,
  balance
}) => {
  const [copied, setCopied] = useState(false);
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await cryptoService.getPrice(network === 'ETH' ? 'ethereum' : 'solana');
        setPrice(price);
      } catch (error) {
        console.error('Failed to fetch price:', error);
      }
    };
    fetchPrice();
  }, [network]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string, price: number | null) => {
    const numBal = parseFloat(bal);
    if (isNaN(numBal)) return '0.00';
    return price ? `${numBal.toFixed(4)} (${(numBal * price).toFixed(2)} USD)` : numBal.toFixed(4);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Wallet Details
        </h2>
        <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
          Connected
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Network
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${network === 'ETH' ? 'bg-blue-500' : 'bg-purple-500'}`} />
            <span className="text-gray-900 dark:text-white">
              {network === 'ETH' ? 'Ethereum' : 'Solana'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Address
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <span className="text-gray-900 dark:text-white font-mono">
              {formatAddress(address)}
            </span>
            <CopyToClipboard text={address} onCopy={handleCopy}>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                {copied ? '✓' : '📋'}
              </button>
            </CopyToClipboard>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Balance
          </label>
          <div className="mt-1 text-gray-900 dark:text-white">
            {formatBalance(balance, price)}
          </div>
        </div>
      </div>

      <div className="pt-4 flex space-x-3">
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Send
        </button>
        <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          Receive
        </button>
      </div>
    </div>
  );
}; 