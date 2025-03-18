// Fix TypeScript errors with the wagmi library
import { InjectedConnector } from 'wagmi/connectors/injected';

// Declare module augmentation for wagmi
declare module 'wagmi' {
  interface Connector<Provider = any, Options = any> {
    id: string;
    name: string;
    type: string;
    chains?: Chain[];
    options: Options;
    connect(config?: { chainId?: number }): Promise<{
      account: `0x${string}`;
      chain: { id: number; unsupported: boolean };
      provider: Provider;
    }>;
    disconnect(): Promise<void>;
    isAuthorized(): Promise<boolean>;
    getProvider(config?: { chainId?: number }): Promise<Provider>;
    getChainId(): Promise<number>;
    getAccount(): Promise<`0x${string}`>;
    getSigner(config?: { chainId?: number }): Promise<any>;
    getWalletClient(config?: { chainId?: number }): Promise<any>;
    switchChain?(args: { chainId: number }): Promise<Chain>;
    watchAsset?(args: any): Promise<boolean>;
    watchNetwork?(args: any): (err: Error, data: any) => void;
    onAccountsChanged(accounts: string[]): void;
    onChainChanged(chain: number | string): void;
    onDisconnect(error: Error): void;
  }

  // Extend the InjectedConnector to be a valid Connector type
  export interface InjectedConnectorExtended extends Connector {
    id: string;
    name: string;
    chains: Chain[];
  }
}

// Extension of InjectedConnector to match the required interface
declare module 'wagmi/connectors/injected' {
  interface InjectedConnector {
    id: string;
    name: string;
    chains: Chain[];
  }
} 