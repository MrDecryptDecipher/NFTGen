import { ethers } from 'ethers';

export function getNFTContract(
  signer?: ethers.JsonRpcSigner | null,
  provider?: ethers.JsonRpcProvider | null
): ethers.Contract;

export function mintNFT(
  signer: ethers.JsonRpcSigner,
  to: string,
  tokenURI: string
): Promise<string>;

export function getTokenURI(
  provider: ethers.JsonRpcProvider,
  tokenId: number
): Promise<string>;

declare const nftContract: {
  getNFTContract: typeof getNFTContract;
  mintNFT: typeof mintNFT;
  getTokenURI: typeof getTokenURI;
};

export default nftContract; 