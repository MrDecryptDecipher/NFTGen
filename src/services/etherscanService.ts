/**
 * Etherscan Integration Service
 * 
 * Provides transaction verification and monitoring for Sepolia testnet
 */

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
}

export interface EtherscanTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  txreceipt_status: string;
}

class EtherscanService {
  private readonly baseUrl = 'https://api-sepolia.etherscan.io/api';
  private readonly apiKey = 'KVZKZU964PPF29B4IP9G4FXPXIKY7FFA8S';
  private readonly explorerUrl = 'https://sepolia.etherscan.io';

  /**
   * Get transaction status from Etherscan
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      console.log(`🔍 Checking transaction status: ${txHash}`);

      const url = `${this.baseUrl}?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        const status = data.result.status === '1' ? 'confirmed' : 'failed';
        
        // Get additional transaction details
        const txDetails = await this.getTransactionDetails(txHash);
        
        return {
          hash: txHash,
          status,
          confirmations: txDetails?.confirmations || 0,
          blockNumber: txDetails?.blockNumber,
          gasUsed: txDetails?.gasUsed,
          effectiveGasPrice: txDetails?.effectiveGasPrice
        };
      } else {
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0
        };
      }
    } catch (error) {
      console.error('❌ Error checking transaction status:', error);
      return {
        hash: txHash,
        status: 'pending',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get detailed transaction information
   */
  async getTransactionDetails(txHash: string): Promise<EtherscanTransaction | null> {
    try {
      const url = `${this.baseUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.result) {
        return {
          hash: data.result.hash,
          blockNumber: parseInt(data.result.blockNumber, 16).toString(),
          timeStamp: new Date().getTime().toString(), // Etherscan doesn't provide timestamp in this endpoint
          from: data.result.from,
          to: data.result.to,
          value: parseInt(data.result.value, 16).toString(),
          gas: parseInt(data.result.gas, 16).toString(),
          gasPrice: parseInt(data.result.gasPrice, 16).toString(),
          gasUsed: '0', // Will be filled by receipt
          isError: '0',
          txreceipt_status: '1'
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Generate Etherscan URL for transaction
   */
  getTransactionUrl(txHash: string): string {
    return `${this.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Generate Etherscan URL for contract
   */
  getContractUrl(contractAddress: string): string {
    return `${this.explorerUrl}/address/${contractAddress}`;
  }

  /**
   * Generate OpenSea URL for NFT
   */
  getOpenSeaUrl(contractAddress: string, tokenId: string): string {
    return `https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenId}`;
  }

  /**
   * Monitor transaction until confirmed
   */
  async monitorTransaction(
    txHash: string, 
    onUpdate?: (status: TransactionStatus) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<TransactionStatus> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const status = await this.getTransactionStatus(txHash);
          
          onUpdate?.(status);

          if (status.status === 'confirmed' || status.status === 'failed') {
            resolve(status);
            return;
          }

          // Check timeout
          if (Date.now() - startTime > maxWaitTime) {
            resolve({
              ...status,
              error: 'Transaction monitoring timeout'
            });
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          resolve({
            hash: txHash,
            status: 'pending',
            confirmations: 0,
            error: error instanceof Error ? error.message : 'Monitoring error'
          });
        }
      };

      poll();
    });
  }

  /**
   * Get current gas prices from Etherscan
   */
  async getGasPrices(): Promise<{
    safe: string;
    standard: string;
    fast: string;
  }> {
    try {
      const url = `${this.baseUrl}?module=gastracker&action=gasoracle&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        return {
          safe: data.result.SafeGasPrice,
          standard: data.result.StandardGasPrice,
          fast: data.result.FastGasPrice
        };
      }

      // Fallback gas prices for Sepolia
      return {
        safe: '1',
        standard: '2',
        fast: '3'
      };
    } catch (error) {
      console.error('❌ Error getting gas prices:', error);
      return {
        safe: '1',
        standard: '2',
        fast: '3'
      };
    }
  }
}

// Export singleton instance
export const etherscanService = new EtherscanService();
export default etherscanService;
