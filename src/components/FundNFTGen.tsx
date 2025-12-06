import React, { useState, useEffect } from 'react';
import { checkSharedNwalletBalance } from '../services/nftService';
import { toast } from 'react-toastify';

interface FundNFTGenProps {
  onFundingComplete?: () => void;
}

export const FundNFTGen: React.FC<FundNFTGenProps> = ({ onFundingComplete }) => {
  const [balance, setBalance] = useState<string>('0');
  const [userAddress, setUserAddress] = useState<string>('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(true);

  useEffect(() => {
    checkBalance();
  }, []);

  const checkBalance = async () => {
    try {
      setIsCheckingBalance(true);
      const result = await checkSharedNwalletBalance();
      setBalance(result.balance);
      setUserAddress(result.address);
    } catch (error) {
      console.error('Failed to check balance:', error);
      toast.error('Failed to check wallet balance');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const balanceNum = parseFloat(balance);
  const isLowBalance = balanceNum < 0.01;
  const hasSufficientBalance = balanceNum >= 0.005; // Reduced threshold since no separate funding needed

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Wallet Status</h3>
        <button
          onClick={checkBalance}
          disabled={isCheckingBalance}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          {isCheckingBalance ? '🔄' : '↻'} Refresh
        </button>
      </div>

      <div className="space-y-4">
        {/* User Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Your Nwallet Address
          </label>
          <div className="bg-black/20 rounded-lg p-3 font-mono text-sm text-gray-300">
            {userAddress ? (
              `${userAddress.substring(0, 6)}...${userAddress.substring(-4)}`
            ) : (
              'Not connected'
            )}
          </div>
        </div>

        {/* Current Balance */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Wallet Balance
          </label>
          <div className={`bg-black/20 rounded-lg p-3 font-mono text-lg ${
            isLowBalance ? 'text-red-400' : 'text-green-400'
          }`}>
            {isCheckingBalance ? 'Checking...' : `${balance} ETH`}
          </div>
        </div>

        {/* Status Messages */}
        {!isCheckingBalance && (
          <div className="text-sm">
            {hasSufficientBalance ? (
              <div className="text-green-400 flex items-center">
                ✅ Ready for NFT minting
              </div>
            ) : isLowBalance ? (
              <div className="text-red-400 flex items-center">
                ⚠️ Low balance - add funds to your Nwallet
              </div>
            ) : (
              <div className="text-yellow-400 flex items-center">
                💡 Sufficient for basic minting operations
              </div>
            )}
          </div>
        )}

        {/* Info - No funding button needed */}
        <div className="text-xs text-gray-400 bg-black/20 rounded-lg p-3">
          <div className="font-semibold mb-1">ℹ️ Wallet Integration:</div>
          <ul className="space-y-1">
            <li>• NFTGen uses your shared Nwallet balance directly</li>
            <li>• No separate funding required</li>
            <li>• Gas fees are paid from your Nwallet balance</li>
            <li>• Add funds through your Nwallet if balance is low</li>
          </ul>
        </div>

        {/* Link to Nwallet for funding if needed */}
        {isLowBalance && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="text-blue-400 text-sm font-semibold mb-2">
              💡 Need more ETH?
            </div>
            <p className="text-gray-300 text-xs mb-3">
              Add funds directly to your Nwallet to use for NFT minting.
            </p>
            <a
              href="http://3.111.22.56:6101"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Open Nwallet →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
