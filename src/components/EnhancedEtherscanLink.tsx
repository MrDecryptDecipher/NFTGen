/**
 * Enhanced Etherscan Link Component
 * Production-ready component for generating and displaying Etherscan transaction links
 * Implements comprehensive validation and error handling
 */

import React, { useMemo } from 'react';
import { etherscanService } from '../services/enhancedEtherscanService';

interface EnhancedEtherscanLinkProps {
  txHash?: string;
  contractAddress?: string;
  tokenId?: string;
  chainId?: number;
  type?: 'transaction' | 'contract' | 'nft';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  target?: '_blank' | '_self';
}

/**
 * Enhanced Etherscan Link Component with intelligent URL generation
 */
export const EnhancedEtherscanLink: React.FC<EnhancedEtherscanLinkProps> = ({
  txHash,
  contractAddress,
  tokenId,
  chainId = 11155111, // Default to Sepolia
  type = 'transaction',
  className = '',
  children,
  showIcon = true,
  target = '_blank'
}) => {
  /**
   * Generate the appropriate Etherscan URL based on type and parameters
   */
  const etherscanUrl = useMemo(() => {
    try {
      switch (type) {
        case 'transaction':
          if (!txHash) {
            console.warn('Transaction hash required for transaction link');
            return null;
          }
          if (!etherscanService.isValidTransactionHash(txHash)) {
            console.warn(`Invalid transaction hash format: ${txHash}`);
            return null;
          }
          return etherscanService.generateTransactionUrl(txHash, chainId);

        case 'contract':
          if (!contractAddress) {
            console.warn('Contract address required for contract link');
            return null;
          }
          if (!etherscanService.isValidContractAddress(contractAddress)) {
            console.warn(`Invalid contract address format: ${contractAddress}`);
            return null;
          }
          return etherscanService.generateContractUrl(contractAddress, chainId);

        case 'nft':
          if (!contractAddress || !tokenId) {
            console.warn('Contract address and token ID required for NFT link');
            return null;
          }
          if (!etherscanService.isValidContractAddress(contractAddress)) {
            console.warn(`Invalid contract address format: ${contractAddress}`);
            return null;
          }
          return etherscanService.generateNFTUrl(contractAddress, tokenId, chainId);

        default:
          console.warn(`Unknown link type: ${type}`);
          return null;
      }
    } catch (error) {
      console.error('Error generating Etherscan URL:', error);
      return null;
    }
  }, [txHash, contractAddress, tokenId, chainId, type]);

  /**
   * Get network information for display
   */
  const networkInfo = useMemo(() => {
    return etherscanService.getNetwork(chainId);
  }, [chainId]);

  /**
   * Get display text based on type
   */
  const displayText = useMemo(() => {
    if (children) return children;

    switch (type) {
      case 'transaction':
        return `View Transaction`;
      case 'contract':
        return `View Contract`;
      case 'nft':
        return `View NFT`;
      default:
        return 'View on Explorer';
    }
  }, [type, children]);

  /**
   * Get truncated hash for display
   */
  const truncatedHash = useMemo(() => {
    if (txHash && txHash.length > 10) {
      return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
    }
    return txHash;
  }, [txHash]);

  // Don't render if no valid URL can be generated
  if (!etherscanUrl) {
    return null;
  }

  return (
    <a
      href={etherscanUrl}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors duration-200 ${className}`}
      title={`View on ${networkInfo?.name || 'Etherscan'}: ${txHash || contractAddress}`}
    >
      {showIcon && (
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
      )}
      <span className="text-sm">
        {type === 'transaction' && txHash ? truncatedHash : displayText}
      </span>
    </a>
  );
};

/**
 * Specialized Transaction Link Component
 */
export const TransactionLink: React.FC<Omit<EnhancedEtherscanLinkProps, 'type'>> = (props) => (
  <EnhancedEtherscanLink {...props} type="transaction" />
);

/**
 * Specialized Contract Link Component
 */
export const ContractLink: React.FC<Omit<EnhancedEtherscanLinkProps, 'type'>> = (props) => (
  <EnhancedEtherscanLink {...props} type="contract" />
);

/**
 * Specialized NFT Link Component
 */
export const NFTLink: React.FC<Omit<EnhancedEtherscanLinkProps, 'type'>> = (props) => (
  <EnhancedEtherscanLink {...props} type="nft" />
);

export default EnhancedEtherscanLink;