import React, { useState } from 'react';
import type { NFT } from '../types';
import { GlassCard } from './GlassCard';
import { toast } from 'react-toastify';
import { useWallet } from '../context/WalletContext';
import { ethers } from 'ethers';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationCircleIcon, InformationCircleIcon, ArrowRightIcon, ArrowTopRightOnSquareIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ERC1155Service } from '../services/erc1155Service';
import { NFTEtherscanLink } from './NFTEtherscanLink';
import { useNavigate } from 'react-router-dom';

type NFTStatus = NFT['status'] | 'FRACTIONALIZED';

interface ExtendedNFT {
  id: string;
  name: string;
  image: string;
  media?: Array<{
    gateway?: string;
    raw?: string;
  }>;
  title?: string;
  description: string;
  owner: string;
  status: NFTStatus;
  contractAddress: string;
  tokenId: string;
  metadata: {
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  fractions?: {
    id: string;
    supply: number;
    remaining: number;
    pricePerFraction: number;
  };
  royalties: {
    id: string;
    percentage: number;
    beneficiary: string;
  };
}

interface NFTFractionalizationConfig {
  fractions: number;
}

interface ReceiverAddress {
  address: string;
}

interface NFTFractionalizeProps {
  nft: ExtendedNFT;
  onFractionalize: (config: NFTFractionalizationConfig) => Promise<void>;
  isFractionalizing: boolean;
}

export const NFTFractionalize: React.FC<NFTFractionalizeProps> = ({ nft, onFractionalize, isFractionalizing }) => {
  const [totalSupply, setTotalSupply] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReceiverForm, setShowReceiverForm] = useState(false);
  const [receiverAddress, setReceiverAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { address, provider } = useWallet();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!totalSupply || parseInt(totalSupply) <= 0) {
      toast.error('Please enter a valid number of fractions');
      return;
    }

    // Show confirmation dialog instead of executing directly
    setShowConfirmation(true);
  };

  const confirmFractionalization = async () => {
    try {
      setShowConfirmation(false);
      setShowReceiverForm(true);
    } catch (error) {
      console.error('Error fractionalizing NFT:', error);
      toast.error('Failed to fractionalize NFT');
      setShowConfirmation(false);
    }
  };
  
  const handleReceiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiverAddress) {
      toast.error('Please enter a receiver address');
      return;
    }
    
    if (!ethers.isAddress(receiverAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }
    
    try {
      // Get the ERC1155Service instance
      const erc1155Service = ERC1155Service.getInstance();
      
      // Initialize the contract with the provider's signer
      if (address && provider) {
        const signer = await provider.getSigner();
        await erc1155Service.initializeContract(signer);
        
        // Construct a reasonable URI from the NFT's metadata if available
        const metadataUri = nft.metadata?.attributes?.length > 0
          ? `ipfs://ipfs/${nft.id}/metadata.json`
          : `https://nftgen.io/api/metadata/${nft.id}`;
        
        // Use a standard royalty percentage (5%)
        const royaltyPercentage = 500; // 5% in basis points (100 = 1%)
        
        // Call the fractionalize method with the proper parameters
        const txHash = await erc1155Service.fractionalize(
          nft.contractAddress,
          nft.tokenId,
          parseInt(totalSupply),
          metadataUri,
          receiverAddress, // Royalty recipient is the same as the fraction receiver
          royaltyPercentage
        );
        
        setTxHash(txHash);
        setShowReceiverForm(false);
        setShowSuccess(true);
        
        // Call the callback to update the UI
        await onFractionalize({
          fractions: parseInt(totalSupply)
        });
      } else {
        toast.error('Wallet not connected');
      }
    } catch (error) {
      console.error('Error fractionalizing NFT:', error);
      toast.error('Failed to fractionalize NFT: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <>
    <GlassCard className="p-6">
      <h3 className="text-xl font-semibold mb-4">Fractionalize NFT</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Number of Fractions
          </label>
          <input
            type="number"
            value={totalSupply}
            onChange={(e) => setTotalSupply(e.target.value)}
            min="1"
            required
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20"
            placeholder="Enter number of fractions"
          />
            <p className="mt-1 text-xs text-gray-400">
              Each fraction represents partial ownership of this NFT as an ERC-1155 token
            </p>
        </div>
        <button
          type="submit"
          disabled={isFractionalizing || !address}
          className={`w-full py-3 rounded-lg font-medium transition-colors
            ${isFractionalizing || !address
              ? 'bg-purple-600/50 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          {isFractionalizing
            ? 'Fractionalizing...'
            : !address
              ? 'Connect Wallet to Fractionalize'
              : 'Fractionalize NFT'}
        </button>
      </form>
    </GlassCard>

      {/* Confirmation Dialog */}
      <Transition show={showConfirmation} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => !isFractionalizing && setShowConfirmation(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black opacity-80" />
            </Transition.Child>

            {/* Center the modal */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 border border-gray-700 shadow-xl rounded-2xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-yellow-500/20 p-3 rounded-full">
                    <ExclamationCircleIcon className="h-10 w-10 text-yellow-500" />
                  </div>
                </div>
                <Dialog.Title
                  as="h3"
                  className="text-xl font-medium leading-6 text-white text-center"
                >
                  Cross-Chain Transfer Required
                </Dialog.Title>
                
                {/* Network Transfer Visualization */}
                <div className="flex items-center justify-center mt-4 py-3">
                  <div className="flex items-center justify-between w-full max-w-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center border-2 border-purple-500">
                        <span className="font-bold text-white">NFTGen</span>
                      </div>
                      <span className="mt-1 text-xs text-gray-300">Current</span>
                    </div>
                    
                    <div className="flex-1 px-2">
                      <div className="flex items-center justify-center">
                        <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center border-2 border-blue-500">
                        <span className="font-bold text-white">ETH</span>
                      </div>
                      <span className="mt-1 text-xs text-gray-300">Sepolia</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-300">
                    To fractionalize this NFT, it will be transferred to the <span className="text-blue-400 font-medium">Ethereum Sepolia Testnet</span>. Once transferred, the NFT will be held in a secure fractional vault contract until you decide to redeem it.
                  </p>
                  
                  <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-200">
                        The fractionalization process splits your NFT into {totalSupply} tradable tokens, allowing partial ownership and trading of fractions.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <div className="flex items-start">
                      <ExclamationCircleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-200">
                        <strong>Important:</strong> This operation requires gas fees on the Sepolia network and cannot be reversed once confirmed. Make sure you have enough Sepolia ETH in your wallet.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-gray-900/50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-200 mb-2">Transaction Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-400">NFT ID:</p>
                        <p className="text-sm text-white font-mono">{nft.tokenId}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-400">NFT Name:</p>
                        <p className="text-sm text-white">{nft.name}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-400">Fractions:</p>
                        <p className="text-sm text-white">{totalSupply}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-400">Destination Network:</p>
                        <p className="text-sm text-blue-400">ETH Sepolia Testnet</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => setShowConfirmation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={confirmFractionalization}
                  >
                    Next: Add Receiver
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
      
      {/* Receiver Form Dialog */}
      <Dialog
        open={showReceiverForm}
        onClose={() => !isFractionalizing && setShowReceiverForm(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg max-w-lg w-full p-6 shadow-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Set Fraction Receiver
            </h3>
            
            <div className="mt-4">
              <p className="text-sm text-gray-300 mb-4">
                Enter the Ethereum address that will receive the fractionalized NFT tokens (ERC-1155).
              </p>
              
              <form onSubmit={handleReceiverSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-white">
                    Receiver Address
                  </label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="0x... (Ethereum Address)"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This address will receive {totalSupply} fractions of the NFT as ERC-1155 tokens
                  </p>
                </div>
                
                <div className="flex justify-between space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowReceiverForm(false)}
                    className="flex-1 py-2 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                    disabled={isFractionalizing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFractionalizing || !ethers.isAddress(receiverAddress)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors
                      ${isFractionalizing || !ethers.isAddress(receiverAddress)
                        ? 'bg-purple-600/50 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'}`}
                  >
                    {isFractionalizing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Fractionalize NFT'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>
      
      {/* Success Dialog */}
      <Transition show={showSuccess} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setShowSuccess(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black opacity-80" />
            </Transition.Child>

            {/* Center the modal */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 border border-gray-700 shadow-xl rounded-2xl">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-500/20 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <Dialog.Title
                  as="h3"
                  className="text-xl font-medium leading-6 text-white text-center"
                >
                  NFT Successfully Fractionalized
                </Dialog.Title>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-4 text-center">
                    Your NFT has been fractionalized into {totalSupply} ERC-1155 tokens and sent to the receiver.
                  </p>
                  
                  <div className="mt-4 bg-gray-700/50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Transaction Hash:</span>
                      <NFTEtherscanLink 
                        transactionHash={txHash}
                        linkText="View on Etherscan"
                        className="text-blue-400 hover:text-blue-300"
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">Receiver:</span>
                      <span className="text-gray-300">{receiverAddress.slice(0, 6)}...{receiverAddress.slice(-4)}</span>
                    </div>
                  </div>

                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none"
                      onClick={() => {
                        setShowSuccess(false);
                        navigate(`/nft/${nft.id}`);
                      }}
                    >
                      Go to NFT Details
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}; 