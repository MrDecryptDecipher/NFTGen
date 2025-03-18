import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

// Define the shape of the context
interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  provider: ethers.JsonRpcProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

// Create context with a default value
const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  signMessage: async () => '',
});

// Provider component
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const walletInfo = localStorage.getItem('nija_wallet_connection');
        if (walletInfo) {
          const { address, rpcUrl, chainId } = JSON.parse(walletInfo);
          console.log('Checking connection with:', { address, rpcUrl, chainId });
          
          // Create provider
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Wait for provider to detect network
          await provider.ready;
          console.log('Provider ready, network:', await provider.getNetwork());
          
          // Create a custom signer that uses the address directly
          const signer = new ethers.JsonRpcSigner(provider, address);
          
          // Verify signer address matches
          const signerAddress = await signer.getAddress();
          console.log('Signer address:', signerAddress);
          
          if (signerAddress.toLowerCase() !== address.toLowerCase()) {
            throw new Error('Signer address mismatch');
          }
          
          setProvider(provider);
          setSigner(signer);
          setAddress(address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        localStorage.removeItem('nija_wallet_connection');
        localStorage.removeItem('nija_wallet_session');
        setProvider(null);
        setSigner(null);
        setAddress(null);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    try {
      console.log('Connecting to Nija wallet...');
      
      // Make API call to Nija wallet server to get connection details
      const response = await fetch(`${API_BASE_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'Accept': 'application/json',
          'X-NFTGEN-Origin': window.location.origin,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to connect to Nija wallet';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Wallet connection response:', data);
      
      if (!data.address || !data.rpcUrl || !data.sessionToken || !data.chainId) {
        throw new Error('Invalid response from wallet server');
      }

      const { address, rpcUrl, sessionToken, chainId } = data;
      
      console.log('Initializing provider with:', {
        address,
        rpcUrl,
        chainId
      });
      
      // Save connection info to localStorage
      localStorage.setItem('nija_wallet_connection', JSON.stringify({ 
        address, 
        rpcUrl,
        chainId,
        timestamp: Date.now() 
      }));
      localStorage.setItem('nija_wallet_session', sessionToken);

      // Create provider with explicit network configuration
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      try {
        // Test the provider with a basic request
        await provider.ready;
        console.log('Provider ready, network:', await provider.getNetwork());
        
        // Create a custom signer that uses the address directly
        const signer = new ethers.JsonRpcSigner(provider, address);
        
        // Verify signer address
        const signerAddress = await signer.getAddress();
        console.log('Signer address:', signerAddress);
        
        if (signerAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Signer address mismatch');
        }
        
        // Update state
        setProvider(provider);
        setSigner(signer);
        setAddress(address);
        setIsConnected(true);
        
        toast.success('Nija Wallet connected successfully!');
      } catch (error) {
        console.error('Error initializing provider:', error);
        throw new Error(`Failed to initialize wallet provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      localStorage.removeItem('nija_wallet_connection');
      localStorage.removeItem('nija_wallet_session');
      setProvider(null);
      setSigner(null);
      setAddress(null);
      setIsConnected(false);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Nija Wallet');
      throw error;
    }
  };

  const disconnect = () => {
    localStorage.removeItem('nija_wallet_connection');
    localStorage.removeItem('nija_wallet_session');
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    toast.info('Nija Wallet disconnected');
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      return await signer.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        provider,
        signer,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Hook for using the wallet context
export const useWallet = () => useContext(WalletContext);

export default WalletContext; 