import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { getTransactionUrl, getTokenUrl, getAddressUrl, EtherscanNetwork } from '../utils/etherscanUtils';

interface NFTEtherscanLinkProps {
  transactionHash?: string;
  contractAddress?: string;
  tokenId?: string;
  tokenType?: 'ERC721' | 'ERC1155';
  linkText?: string;
  showIcon?: boolean;
  className?: string;
  network?: EtherscanNetwork;
}

export const NFTEtherscanLink: React.FC<NFTEtherscanLinkProps> = ({
  transactionHash,
  contractAddress,
  tokenId,
  tokenType = 'ERC721',
  linkText = 'View on Etherscan',
  showIcon = true,
  className = '',
  network = 'sepolia' // Default to Sepolia testnet
}) => {
  const getEtherscanUrl = (): string => {
    // If transaction hash is provided, link to the transaction
    if (transactionHash) {
      return getTransactionUrl(transactionHash, network);
    }
    
    // If contract address and tokenId are provided, link to the token
    if (contractAddress && tokenId) {
      return getTokenUrl(contractAddress, tokenId, network);
    }
    
    // If only contract address is provided, link to the contract
    if (contractAddress) {
      return getAddressUrl(contractAddress, network);
    }
    
    // Fallback to empty string
    return '';
  };

  const url = getEtherscanUrl();
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors ${className}`}
    >
      {linkText}
      {showIcon && <ExternalLink className="ml-1 h-4 w-4" />}
    </a>
  );
};

interface NFTEtherscanTokenLinkProps {
  contractAddress: string;
  tokenId?: string;
  label?: string;
  className?: string;
  network?: EtherscanNetwork;
}

export const NFTEtherscanTokenLink: React.FC<NFTEtherscanTokenLinkProps> = ({
  contractAddress,
  tokenId = '',
  label = 'View NFT on Etherscan',
  className = '',
  network = 'sepolia' // Default to Sepolia testnet
}) => {
  if (!contractAddress) return null;
  
  const etherscanUrl = getTokenUrl(contractAddress, tokenId, network);
  
  return (
    <a
      href={etherscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center text-blue-400 hover:text-blue-300 transition-colors ${className}`}
    >
      {label}
      <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
    </a>
  );
};

interface NFTEtherscanAddressLinkProps {
  address: string;
  label?: string;
  className?: string;
  showShortAddress?: boolean;
  network?: EtherscanNetwork;
}

export const NFTEtherscanAddressLink: React.FC<NFTEtherscanAddressLinkProps> = ({
  address,
  label,
  className = '',
  showShortAddress = true,
  network = 'sepolia' // Default to Sepolia testnet
}) => {
  if (!address) return null;
  
  const etherscanUrl = getAddressUrl(address, network);
  const displayLabel = label || (showShortAddress ? 
    `${address.slice(0, 6)}...${address.slice(-4)}` : 
    address
  );
  
  return (
    <a
      href={etherscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center text-blue-400 hover:text-blue-300 transition-colors ${className}`}
    >
      {displayLabel}
      <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
    </a>
  );
}; 