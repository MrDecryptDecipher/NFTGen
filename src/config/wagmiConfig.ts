import { configureChains, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { createCustomConnectors } from './customConnectors';

// Configure chains
export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia], 
  [publicProvider()]
);

// Create wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors: createCustomConnectors(chains) as any,
  publicClient,
  webSocketPublicClient,
});

// Define specific info about our Nija Wallet dApp
export const dAppInfo = {
  name: 'NFTGen Platform',
  description: 'Generate, mint, and trade NFTs with ease',
  url: 'https://nftgenrtr.surge.sh',
  icons: ['https://example.com/icon.png']
};
