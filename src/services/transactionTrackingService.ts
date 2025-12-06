/**
 * Transaction Tracking Service
 * 
 * This service tracks the status of transactions and provides updates.
 */

import { getNijaWalletProvider } from '../nijaIntegration';
import { 
  ErrorType, 
  ErrorCode, 
  createTransactionError, 
  handleError 
} from './errorHandling';

// Define transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  UNKNOWN = 'unknown'
}

// Define transaction receipt interface
export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  from: string;
  to: string;
  status: string; // '0x0' for failure, '0x1' for success
  gasUsed: string;
  effectiveGasPrice: string;
  cumulativeGasUsed: string;
  logs: any[];
  logsBloom: string;
  contractAddress: string | null;
}

// Define transaction tracking interface
export interface TransactionTracking {
  hash: string;
  status: TransactionStatus;
  receipt?: TransactionReceipt;
  confirmations: number;
  timestamp: number;
  lastChecked: number;
}

// In-memory storage for tracked transactions
const trackedTransactions: Map<string, TransactionTracking> = new Map();

// Polling interval in milliseconds
const POLLING_INTERVAL = 5000;

// Maximum number of confirmations to track
const MAX_CONFIRMATIONS = 12;

/**
 * Track a transaction and get updates on its status
 * @param txHash The transaction hash to track
 * @param callback Optional callback function to receive updates
 * @returns The initial transaction tracking object
 */
export function trackTransaction(
  txHash: string,
  callback?: (tracking: TransactionTracking) => void
): TransactionTracking {
  // Check if transaction is already being tracked
  if (trackedTransactions.has(txHash)) {
    const tracking = trackedTransactions.get(txHash)!;
    if (callback) {
      callback(tracking);
    }
    return tracking;
  }

  // Create new tracking object
  const tracking: TransactionTracking = {
    hash: txHash,
    status: TransactionStatus.PENDING,
    confirmations: 0,
    timestamp: Date.now(),
    lastChecked: Date.now()
  };

  // Store in tracked transactions
  trackedTransactions.set(txHash, tracking);

  // Start polling for updates
  pollTransactionStatus(txHash, callback);

  return tracking;
}

/**
 * Stop tracking a transaction
 * @param txHash The transaction hash to stop tracking
 */
export function stopTrackingTransaction(txHash: string): void {
  trackedTransactions.delete(txHash);
}

/**
 * Get the current status of a tracked transaction
 * @param txHash The transaction hash
 * @returns The transaction tracking object or null if not tracked
 */
export function getTransactionStatus(txHash: string): TransactionTracking | null {
  return trackedTransactions.get(txHash) || null;
}

/**
 * Poll for transaction status updates
 * @param txHash The transaction hash
 * @param callback Optional callback function to receive updates
 */
async function pollTransactionStatus(
  txHash: string,
  callback?: (tracking: TransactionTracking) => void
): Promise<void> {
  // Check if transaction is still being tracked
  if (!trackedTransactions.has(txHash)) {
    return;
  }

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

    // Get the current tracking object
    const tracking = trackedTransactions.get(txHash)!;

    // Update last checked timestamp
    tracking.lastChecked = Date.now();

    // Get transaction receipt
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    }) as TransactionReceipt | null;

    if (receipt) {
      // Transaction has been mined
      tracking.receipt = receipt;
      
      // Check status (0x1 for success, 0x0 for failure)
      if (receipt.status === '0x1') {
        tracking.status = TransactionStatus.CONFIRMED;
      } else if (receipt.status === '0x0') {
        tracking.status = TransactionStatus.FAILED;
      }

      // Get current block number to calculate confirmations
      const currentBlock = await provider.request({
        method: 'eth_blockNumber',
        params: []
      }) as string;

      // Calculate confirmations
      const receiptBlockNumber = parseInt(receipt.blockNumber, 16);
      const currentBlockNumber = parseInt(currentBlock, 16);
      tracking.confirmations = Math.max(0, currentBlockNumber - receiptBlockNumber);

      // Update tracked transaction
      trackedTransactions.set(txHash, tracking);

      // Call callback if provided
      if (callback) {
        callback(tracking);
      }

      // If we've reached max confirmations or transaction failed, stop polling
      if (tracking.confirmations >= MAX_CONFIRMATIONS || tracking.status === TransactionStatus.FAILED) {
        stopTrackingTransaction(txHash);
        return;
      }
    }

    // Schedule next poll
    setTimeout(() => pollTransactionStatus(txHash, callback), POLLING_INTERVAL);
  } catch (error) {
    // Handle error but continue polling
    handleError(error, ErrorType.TRANSACTION_ERROR);
    
    // Schedule next poll
    setTimeout(() => pollTransactionStatus(txHash, callback), POLLING_INTERVAL);
  }
}

/**
 * Wait for a transaction to be confirmed
 * @param txHash The transaction hash
 * @param confirmations The number of confirmations to wait for (default: 1)
 * @param timeout Timeout in milliseconds (default: 5 minutes)
 * @returns The transaction receipt
 */
export function waitForTransaction(
  txHash: string,
  confirmations: number = 1,
  timeout: number = 300000
): Promise<TransactionReceipt> {
  return new Promise((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      stopTrackingTransaction(txHash);
      reject(createTransactionError(
        ErrorCode.TRANSACTION_TIMEOUT,
        `Transaction ${txHash} timed out after ${timeout}ms`,
        null,
        true,
        'Please check the transaction status in a block explorer'
      ));
    }, timeout);

    // Track transaction
    trackTransaction(txHash, (tracking) => {
      if (tracking.status === TransactionStatus.FAILED) {
        clearTimeout(timeoutId);
        stopTrackingTransaction(txHash);
        reject(createTransactionError(
          ErrorCode.TRANSACTION_FAILED,
          `Transaction ${txHash} failed`,
          tracking.receipt,
          false,
          'Please check the transaction details in a block explorer'
        ));
      } else if (tracking.status === TransactionStatus.CONFIRMED && tracking.confirmations >= confirmations) {
        clearTimeout(timeoutId);
        stopTrackingTransaction(txHash);
        resolve(tracking.receipt!);
      }
    });
  });
}
