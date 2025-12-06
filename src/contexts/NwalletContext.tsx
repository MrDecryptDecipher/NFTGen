import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { 
  getNwalletProvider, 
  connectToNwallet, 
  getNwalletSession, 
  createEthersProvider,
  getEthersSigner,
  NwalletSession
} from '../providers/NwalletProvider';

// Define the context type
interface NwalletContextType {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  session: NwalletSession | null;
}

// Create the context with default values
const NwalletContext = createContext<NwalletContextType>({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  provider: null,
  signer: null,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  sendTransaction: async () => '',
  signMessage: async () => '',
  session: null
});

// Provider component
export const NwalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<NwalletSession | null>(null);

  // Initialize the connection state from localStorage on mount
  useEffect(() => {
    const initializeFromSession = async () => {
      try {
        const savedSession = getNwalletSession();
        if (savedSession) {
          console.log("Found saved Nwallet session:", savedSession);
          setAddress(savedSession.address);
          setChainId(savedSession.chainId);
          setIsConnected(true);
          setSession(savedSession);
          
          // Initialize provider and signer
          const ethersProvider = await createEthersProvider();
          if (ethersProvider) {
            setProvider(ethersProvider);
            const ethersSigner = await ethersProvider.getSigner();
            setSigner(ethersSigner);
          }
        }
      } catch (error) {
        console.error("Error initializing from session:", error);
      }
    };
    
    initializeFromSession();
  }, []);

  // Connect to Nwallet
  const connect = async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const userAddress = await connectToNwallet();
      const ethersProvider = await createEthersProvider();

      if (ethersProvider) {
        const chainId = await ethersProvider.getNetwork().then(network => `0x${network.chainId.toString(16)}`);
        const ethersSigner = await ethersProvider.getSigner();
        
        setAddress(userAddress);
        setChainId(chainId);
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        setIsConnected(true);
        
        // Get the session
        const currentSession = getNwalletSession();
        setSession(currentSession);
        
        toast.success('Connected to Nwallet!');
      } else {
        throw new Error('Failed to create Ethers provider');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error);
      toast.error(`Connection error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Nwallet
  const disconnect = () => {
    localStorage.removeItem('nwallet_session');
    setAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
    setSession(null);
    toast.info('Disconnected from Nwallet');
  };

  // Send a transaction
  const sendTransaction = async (transaction: any): Promise<string> => {
    if (!isConnected || !signer) {
      throw new Error('Not connected to Nwallet');
    }
    
    try {
      const tx = await signer.sendTransaction(transaction);
      return tx.hash;
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(`Transaction error: ${error.message}`);
      throw error;
    }
  };

  // Sign a message
  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected || !signer) {
      throw new Error('Not connected to Nwallet');
    }
    
    try {
      return await signer.signMessage(message);
    } catch (error: any) {
      console.error('Signing error:', error);
      toast.error(`Signing error: ${error.message}`);
      throw error;
    }
  };

  // Context value
  const contextValue: NwalletContextType = {
    address,
    chainId,
    isConnected,
    isConnecting,
    provider,
    signer,
    error,
    connect,
    disconnect,
    sendTransaction,
    signMessage,
    session
  };

  return (
    <NwalletContext.Provider value={contextValue}>
      {children}
    </NwalletContext.Provider>
  );
};

// Custom hook to use the Nwallet context
export const useNwallet = () => useContext(NwalletContext);

export default NwalletContext;
