// Define the base NijaWalletProvider interface
export interface NijaWalletProvider {
  isNijaWallet?: boolean;
  isConnected: () => boolean;
  on: (event: string, handler: (payload: any) => void) => void;
  removeListener: (event: string, handler: (payload: any) => void) => void;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  selectedAddress?: string;
  emit?: (eventName: string, params: any) => void;
}

// Extend Window interface globally
declare global {
  interface Window {
    ethereum?: NijaWalletProvider | any;
    nijaWallet?: NijaWalletProvider;
    __nftgenPatched?: boolean;
    nijaHeartbeatInterval?: NodeJS.Timeout;
    originalEthereum?: any;
    [key: string]: any;
  }
}

// Event types
export type WalletEventType = 'accountsChanged' | 'chainChanged' | 'disconnect' | 'connect';

export interface WalletEvent {
  type: WalletEventType;
  data?: any;
}

export interface WalletMessage {
  type: string;
  address?: string;
  event?: string;
  isWalletEvent?: boolean;
}

export interface TransactionParams {
  from: string;
  to: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
}

export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  timestamp: number;
}

export type AccountsChangedCallback = (accounts: string[]) => void;
export type ChainChangedCallback = (chainId: string) => void;
export type DisconnectCallback = () => void;
export type WalletEventHandler = (params: any) => void; 