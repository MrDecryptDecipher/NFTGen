/**
 * ERC1155 ABI for the FractionalNFT contract
 */
export const ERC1155_ABI = [
  // Read functions
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function uri(uint256 id) view returns (string)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function fractionDetails(uint256 fractionId) view returns (address originalContract, uint256 originalTokenId, uint256 fractionSupply, string tokenURI, bool locked, address originalOwner)",
  "function getRoyaltyInfo(uint256 fractionId) view returns (address recipient, uint256 percentage)",
  
  // Write functions
  "function setApprovalForAll(address operator, bool approved)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
  "function fractionalize(address nftContract, uint256 tokenId, uint256 supply, string tokenURI, address royaltyRecipient, uint256 royaltyPercentage) returns (uint256)",
  "function transferToMultipleRecipients(uint256 fractionId, address[] recipients, uint256[] amounts)",
  "function batchTransferToMultipleRecipients(uint256[] fractionIds, address[] recipients, uint256[] amounts)",
  "function redeemNFT(uint256 fractionId)",
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