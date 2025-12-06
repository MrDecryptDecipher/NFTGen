/**
 * Transaction Service
 * 
 * This service handles all transaction-related functionality for the NFTGen application,
 * particularly for integration with Nwallet.
 */

import { getNijaWalletProvider } from '../nijaIntegration';
import { 
  ErrorType, 
  ErrorCode, 
  createTransactionError, 
  handleError 
} from './errorHandling';
import { CHAIN_CONFIG } from '../config/constants';

// Define transaction request interface
export interface TransactionRequest {
  to: string;
  from?: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  chainId?: string;
}

// Define transaction response interface
export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  nonce: string;
  chainId: string;
  data: string;
  blockHash?: string;
  blockNumber?: string;
  timestamp?: number;
}

/**
 * Send a transaction using the Nwallet provider
 * @param transaction The transaction request
 * @returns The transaction hash
 */
export async function sendTransaction(transaction: TransactionRequest): Promise<string> {
  try {
    const provider = getNijaWalletProvider();
    if (!provider) {
      throw createTransactionError(
        ErrorCode.PROVIDER_NOT_FOUND,
        'Nwallet provider not available',
        null,
        false,
        'Please ensure Nwallet is connected and try again'
      );
    }

    // If chainId is not provided, use the default Sepolia chainId
    if (!transaction.chainId) {
      transaction.chainId = CHAIN_CONFIG.SEPOLIA_CHAIN_ID;
    }

    // If from is not provided, get it from the provider
    if (!transaction.from) {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      transaction.from = accounts[0];
    }

    // If gas is not provided, estimate it
    if (!transaction.gas) {
      try {
        const gasEstimate = await provider.request({
          method: 'eth_estimateGas',
          params: [transaction]
        });
        
        // Add 10% buffer to gas estimate
        const gasEstimateNum = parseInt(gasEstimate as string, 16);
        const gasWithBuffer = Math.ceil(gasEstimateNum * 1.1).toString(16);
        transaction.gas = '0x' + gasWithBuffer;
      } catch (error) {
        console.warn('Error estimating gas:', error);
        // Use default gas limit for simple transfers
        transaction.gas = '0x5208'; // 21000 gas
      }
    }

    // If nonce is not provided, get it from the provider
    if (!transaction.nonce) {
      const nonce = await provider.request({
        method: 'eth_getTransactionCount',
        params: [transaction.from, 'latest']
      });
      transaction.nonce = nonce as string;
    }

    // If EIP-1559 parameters are not provided, use legacy gasPrice
    if (!transaction.gasPrice && !transaction.maxFeePerGas) {
      const gasPrice = await provider.request({
        method: 'eth_gasPrice',
        params: []
      });
      
      // Check if the network supports EIP-1559
      const chainId = transaction.chainId || await provider.request({ method: 'eth_chainId' });
      const supportsEIP1559 = true; // Assume all networks support EIP-1559 for simplicity
      
      if (supportsEIP1559) {
        // Use EIP-1559 parameters
        const gasPriceNum = parseInt(gasPrice as string, 16);
        transaction.maxFeePerGas = '0x' + Math.ceil(gasPriceNum * 1.5).toString(16);
        transaction.maxPriorityFeePerGas = '0x' + Math.ceil(gasPriceNum * 0.1).toString(16);
      } else {
        // Use legacy gasPrice
        transaction.gasPrice = gasPrice as string;
      }
    }

    // Send the transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [transaction]
    });

    return txHash as string;
  } catch (error) {
    // Handle and rethrow the error
    const nijaError = handleError(error, ErrorType.TRANSACTION_ERROR);
    throw nijaError;
  }
}

/**
 * Sign a transaction using the Nwallet provider (without sending it)
 * @param transaction The transaction request
 * @returns The signed transaction
 */
export async function signTransaction(transaction: TransactionRequest): Promise<string> {
  try {
    const provider = getNijaWalletProvider();
    if (!provider) {
      throw createTransactionError(
        ErrorCode.PROVIDER_NOT_FOUND,
        'Nwallet provider not available',
        null,
        false,
        'Please ensure Nwallet is connected and try again'
      );
    }

    // If from is not provided, get it from the provider
    if (!transaction.from) {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      transaction.from = accounts[0];
    }

    // Sign the transaction
    const signedTx = await provider.request({
      method: 'eth_signTransaction',
      params: [transaction]
    });

    return signedTx as string;
  } catch (error) {
    // Handle and rethrow the error
    const nijaError = handleError(error, ErrorType.TRANSACTION_ERROR);
    throw nijaError;
  }
}

/**
 * Sign a message using the Nwallet provider
 * @param message The message to sign
 * @param address The address to sign with (optional)
 * @returns The signed message
 */
export async function signMessage(message: string, address?: string): Promise<string> {
  try {
    const provider = getNijaWalletProvider();
    if (!provider) {
      throw createTransactionError(
        ErrorCode.PROVIDER_NOT_FOUND,
        'Nwallet provider not available',
        null,
        false,
        'Please ensure Nwallet is connected and try again'
      );
    }

    // If address is not provided, get it from the provider
    if (!address) {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      address = accounts[0];
    }

    // Convert message to hex if it's not already
    const messageHex = message.startsWith('0x') 
      ? message 
      : '0x' + Buffer.from(message).toString('hex');

    // Sign the message
    const signature = await provider.request({
      method: 'personal_sign',
      params: [messageHex, address]
    });

    return signature as string;
  } catch (error) {
    // Handle and rethrow the error
    const nijaError = handleError(error, ErrorType.TRANSACTION_ERROR);
    throw nijaError;
  }
}
