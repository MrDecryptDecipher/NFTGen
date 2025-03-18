import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { verifyWalletConnection, sendTransaction } from '../walletConnection';

interface MintParams {
  tokenURI: string;
  recipient?: string;
}

interface MintResult {
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  transactionHash: string | null;
  mint: (params: MintParams) => Promise<void>;
}

export function useNFTMint(): MintResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const mint = useCallback(async ({ tokenURI, recipient }: MintParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionHash(null);

      // Verify wallet connection
      const address = await verifyWalletConnection();
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Prepare transaction parameters
      const params = {
        from: address,
        to: process.env.VITE_NFT_CONTRACT_ADDRESS,
        data: `0x${Buffer.from(tokenURI).toString('hex')}`,
        value: '0x0',
      };

      // Send transaction
      const hash = await sendTransaction(params);
      if (!hash) {
        throw new Error('Transaction failed');
      }

      setTransactionHash(hash);

      // Wait for transaction confirmation
      const receipt = await waitForTransaction(hash);
      if (!receipt || !receipt.status) {
        throw new Error('Transaction failed');
      }

      setIsSuccess(true);
      toast.success('NFT minted successfully!');
    } catch (err: any) {
      setError(err);
      toast.error(err.message || 'Failed to mint NFT');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    isSuccess,
    error,
    transactionHash,
    mint,
  };
}

async function waitForTransaction(hash: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 30;
    const interval = 2000;
    let attempts = 0;

    const checkTransaction = async () => {
      try {
        const response = await fetch(`${process.env.VITE_ALCHEMY_API_URL}/v2/${process.env.VITE_ALCHEMY_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [hash],
          }),
        });

        const data = await response.json();
        
        if (data.result) {
          resolve(data.result);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Transaction confirmation timeout'));
          return;
        }

        setTimeout(checkTransaction, interval);
      } catch (error) {
        reject(error);
      }
    };

    checkTransaction();
  });
}