import { ethers } from 'ethers';

export const FRACTIONAL_NFT_ABI = [
  // Constructor and Metadata
  "constructor()",
  "function name() view returns (string)",
  "function uri(uint256 id) view returns (string)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  
  // ERC1155 Core Functions
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[] memory)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)",
  
  // FractionalNFT Specific Functions
  "function fractionalize(address nftContract, uint256 tokenId, uint256 supply, string memory tokenURI, address royaltyRecipient, uint256 royaltyPercentage) returns (uint256)",
  "function transferToMultipleRecipients(uint256 fractionId, address[] memory recipients, uint256[] memory amounts)",
  "function batchTransferToMultipleRecipients(uint256[] memory fractionIds, address[] memory recipients, uint256[] memory amounts)",
  "function redeemNFT(uint256 fractionId)",
  "function fractionDetails(uint256 fractionId) view returns (address originalContract, uint256 originalTokenId, uint256 fractionSupply, string memory tokenURI, bool locked, address originalOwner)",
  "function getRoyaltyInfo(uint256 fractionId) view returns (address recipient, uint256 percentage)",
  
  // Admin Functions
  "function pause()",
  "function unpause()",
  
  // Events
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
  "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
  "event URI(string value, uint256 indexed id)",
  "event NFTFractionalized(address indexed originalContract, uint256 indexed originalTokenId, uint256 indexed fractionId, uint256 fractionSupply, address owner)",
  "event NFTRedeemed(uint256 indexed fractionId, address indexed redeemer, address originalContract, uint256 originalTokenId)",
  "event FractionTransferred(uint256 indexed fractionId, address indexed from, address indexed to, uint256 amount)",
  "event RoyaltySet(uint256 indexed fractionId, address recipient, uint256 percentage)",
  "event BatchFractionsTransferred(uint256[] fractionIds, address indexed from, address[] recipients, uint256[] amounts)"
];

export interface FractionalizedNFT {
  originalContract: string;
  originalTokenId: ethers.BigNumber;
  fractionSupply: ethers.BigNumber;
  tokenURI: string;
  locked: boolean;
  originalOwner: string;
}

export interface RoyaltyInfo {
  recipient: string;
  percentage: ethers.BigNumber;
}

export interface FractionalNFTContract extends ethers.Contract {
  // ERC1155 Core Functions
  balanceOf(account: string, id: number | string | ethers.BigNumber): Promise<ethers.BigNumber>;
  balanceOfBatch(accounts: string[], ids: (number | string | ethers.BigNumber)[]): Promise<ethers.BigNumber[]>;
  setApprovalForAll(operator: string, approved: boolean): Promise<ethers.ContractTransaction>;
  isApprovedForAll(account: string, operator: string): Promise<boolean>;
  safeTransferFrom(from: string, to: string, id: number | string | ethers.BigNumber, amount: number | string | ethers.BigNumber, data: string): Promise<ethers.ContractTransaction>;
  safeBatchTransferFrom(from: string, to: string, ids: (number | string | ethers.BigNumber)[], amounts: (number | string | ethers.BigNumber)[], data: string): Promise<ethers.ContractTransaction>;
  
  // Metadata
  uri(id: number | string | ethers.BigNumber): Promise<string>;
  
  // FractionalNFT Specific Functions
  fractionalize(
    nftContract: string, 
    tokenId: number | string | ethers.BigNumber, 
    supply: number | string | ethers.BigNumber, 
    tokenURI: string, 
    royaltyRecipient: string, 
    royaltyPercentage: number | string | ethers.BigNumber,
    options?: { gasLimit?: ethers.BigNumber }
  ): Promise<ethers.ContractTransaction>;
  
  transferToMultipleRecipients(
    fractionId: number | string | ethers.BigNumber, 
    recipients: string[], 
    amounts: (number | string | ethers.BigNumber)[],
    options?: { gasLimit?: ethers.BigNumber }
  ): Promise<ethers.ContractTransaction>;
  
  batchTransferToMultipleRecipients(
    fractionIds: (number | string | ethers.BigNumber)[], 
    recipients: string[], 
    amounts: (number | string | ethers.BigNumber)[],
    options?: { gasLimit?: ethers.BigNumber }
  ): Promise<ethers.ContractTransaction>;
  
  redeemNFT(
    fractionId: number | string | ethers.BigNumber,
    options?: { gasLimit?: ethers.BigNumber }
  ): Promise<ethers.ContractTransaction>;
  
  fractionDetails(fractionId: number | string | ethers.BigNumber): Promise<FractionalizedNFT>;
  
  getRoyaltyInfo(fractionId: number | string | ethers.BigNumber): Promise<RoyaltyInfo>;
  
  // Admin Functions
  pause(options?: { gasLimit?: ethers.BigNumber }): Promise<ethers.ContractTransaction>;
  unpause(options?: { gasLimit?: ethers.BigNumber }): Promise<ethers.ContractTransaction>;
} 