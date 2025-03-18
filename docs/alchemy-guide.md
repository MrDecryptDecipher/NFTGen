# Alchemy API Integration Guide for NFTGen

This comprehensive guide covers Alchemy APIs integration for NFT generation and blockchain applications. It includes detailed information on NFT APIs, token APIs, transfers APIs, and more, specifically tailored for the NFTGen application.

## Table of Contents

- [NFT Development](#nft-development)
  - [NFT Minter Tutorial](#nft-minter-tutorial)
  - [Creating an NFT](#creating-an-nft)
  - [Minting an NFT](#minting-an-nft-from-code)
  - [Viewing Your NFT](#how-to-view-your-nft-in-your-wallet)
  - [Creating ERC-1155 Tokens](#creating-erc-1155-tokens)
- [IPFS Integration](#ipfs-integration)
  - [Pinata Setup](#pinata-setup)
  - [Uploading to IPFS](#uploading-to-ipfs)
  - [Metadata Standards](#metadata-standards)
- [Smart Contract Integration](#smart-contract-integration)
  - [Deploying to Sepolia Testnet](#deploying-to-sepolia-testnet)
  - [Contract Interaction](#contract-interaction)
- [Alchemy Core APIs](#alchemy-core-apis)
  - [Transfers API](#transfers-api)
  - [Token API](#token-api)
  - [Prices API](#prices-api)
- [Advanced Topics](#advanced-topics)
  - [Subgraphs](#subgraphs)
  - [Getting On-chain Events](#getting-on-chain-events)
  - [Transaction Receipts](#transaction-receipts)

## NFT Development

### NFT Minter Tutorial

The NFT Minter Tutorial is a comprehensive guide to building a full-stack dApp that connects your smart contract to a React frontend using Metamask and Web3 tools. This tutorial covers:

1. Setting up your development environment
2. Creating a React UI for minting NFTs
3. Connecting to Metamask via your frontend
4. Uploading NFT assets to IPFS
5. Calling smart contract methods from your frontend
6. Signing transactions using Metamask

Key components of the NFT minter include:
- A form to input the NFT's asset link, name, and description
- Wallet connection functionality
- Minting functionality that interacts with your smart contract

### Creating an NFT

NFTs (Non-Fungible Tokens) are unique digital assets stored on the blockchain. Creating an NFT involves:

1. Setting up your environment with MetaMask, Solidity, Hardhat, and Alchemy
2. Writing a smart contract that adheres to the ERC-721 standard
3. Deploying the contract to a testnet like Sepolia
4. Testing your deployed contract

Sample ERC-721 contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor(address initialOwner) ERC721("MyNFT", "NFT") Ownable(initialOwner) {}

    function mintNFT(address recipient, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds++;

        uint256 newItemId = _tokenIds;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}
```

### Minting an NFT from Code

After deploying your contract, you'll need to:

1. Create metadata for your NFT (name, description, image, etc.)
2. Upload this metadata to IPFS for decentralized storage
3. Call the `mintNFT` function on your deployed contract with the recipient address and metadata URI

Example code for minting:

```javascript
require('dotenv').config();
const ethers = require('ethers');

// Get Alchemy API Key
const API_KEY = process.env.API_KEY;

// Define an Alchemy Provider
const provider = new ethers.AlchemyProvider('sepolia', API_KEY)

// Get contract ABI file
const contract = require("../artifacts/contracts/MyNFT.sol/MyNFT.json");

// Create a signer
const privateKey = process.env.PRIVATE_KEY
const signer = new ethers.Wallet(privateKey, provider)

// Get contract ABI and address
const abi = contract.abi
const contractAddress = '0xYourContractAddress'

// Create a contract instance
const myNftContract = new ethers.Contract(contractAddress, abi, signer)

// Get the NFT Metadata IPFS URL
const tokenUri = "https://gateway.pinata.cloud/ipfs/YourMetadataHash"

// Call mintNFT function
const mintNFT = async () => {
    let nftTxn = await myNftContract.mintNFT(signer.address, tokenUri)
    await nftTxn.wait()
    console.log(`NFT Minted! Check it out at: https://sepolia.etherscan.io/tx/${nftTxn.hash}`)
}

mintNFT()
```

### How to View Your NFT in Your Wallet

After minting an NFT, you can view it in your wallet by:

1. Opening your MetaMask wallet
2. Clicking on the "NFTs" tab
3. Clicking "Import NFTs"
4. Entering the contract address and token ID of your NFT

If your NFT doesn't appear automatically, you may need to add it manually:

1. Get the contract address from Etherscan
2. Find the token ID from the transaction details
3. Add these details to your wallet's "Import NFT" feature

### Creating ERC-1155 Tokens

ERC-1155 is a multi-token standard that allows for both fungible and non-fungible tokens within a single contract.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract AwesomeGame is ERC1155 {
    uint256 public constant GOLD = 0;
    uint256 public constant SILVER = 1;
    uint256 public constant SWORD = 2;
    uint256 public constant SHIELD = 3;
    uint256 public constant CROWN = 4;

    constructor() ERC1155("https://awesomegame.com/assets/{id}.json") {
        _mint(msg.sender, GOLD, 10**18, "");
        _mint(msg.sender, SILVER, 10**18, "");
        _mint(msg.sender, SWORD, 1000, "");
        _mint(msg.sender, SHIELD, 1000, "");
        _mint(msg.sender, CROWN, 1, "");
    }
}
```

## IPFS Integration

### Pinata Setup

Pinata is a convenient IPFS API and toolkit for storing NFT assets and metadata. To set up Pinata:

1. Create a free Pinata account at [pinata.cloud](https://pinata.cloud)
2. Generate an API key from the Pinata dashboard
3. Store your API key and secret in a secure environment file

Example `.env` file:

```
REACT_APP_PINATA_KEY = <your-pinata-api-key>
REACT_APP_PINATA_SECRET = <your-pinata-api-secret>
```

### Uploading to IPFS

To upload files to IPFS using Pinata:

```javascript
import axios from 'axios';

export const pinFileToIPFS = async (file) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    
    // Create form data
    let formData = new FormData();
    formData.append('file', file);
    
    // Pinata specific metadata
    const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
            createdBy: 'NFTGen'
        }
    });
    formData.append('pinataMetadata', metadata);
    
    // Pinning options
    const pinataOptions = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);
    
    try {
        const response = await axios.post(url, formData, {
            maxBodyLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                pinata_api_key: process.env.REACT_APP_PINATA_KEY,
                pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET,
            },
        });
        
        return {
            success: true,
            pinataUrl: "https://gateway.pinata.cloud/ipfs/" + response.data.IpfsHash
        };
    } catch (error) {
        console.log(error);
        return {
            success: false,
            message: error.message,
        };
    }
};
```

For JSON metadata:

```javascript
export const pinJSONToIPFS = async (JSONBody) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    
    return axios
        .post(url, JSONBody, {
            headers: {
                pinata_api_key: process.env.REACT_APP_PINATA_KEY,
                pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET,
            }
        })
        .then(function (response) {
           return {
               success: true,
               pinataUrl: "https://gateway.pinata.cloud/ipfs/" + response.data.IpfsHash
           };
        })
        .catch(function (error) {
            console.log(error)
            return {
                success: false,
                message: error.message,
            }
        });
};
```

### Metadata Standards

NFT metadata should follow a standard format to ensure compatibility with marketplaces and wallets:

```json
{
    "name": "NFT Name",
    "description": "Description of the NFT",
    "image": "ipfs://QmHash/image.png",
    "attributes": [
        {
            "trait_type": "Rarity",
            "value": "Legendary"
        },
        {
            "trait_type": "Type",
            "value": "Artwork"
        }
    ]
}
```

## Smart Contract Integration

### Deploying to Sepolia Testnet

To deploy a smart contract to Sepolia:

1. Set up your development environment with Hardhat
2. Configure Hardhat to connect to Sepolia via Alchemy
3. Create your smart contract
4. Compile the contract
5. Write a deployment script
6. Run the deployment script targeting Sepolia

Example Hardhat configuration:

```javascript
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");

const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
}
```

### Contract Interaction

To interact with your deployed contract from a frontend application:

1. Create a contract instance using ethers.js
2. Connect to the user's wallet
3. Call contract methods

Example:

```javascript
import { ethers } from 'ethers';
import contractABI from './contractABI.json';

// Contract address
const contractAddress = "0xYourContractAddress";

// Connect to the user's wallet
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            return accounts[0];
        } catch (error) {
            console.error("User denied account access");
            return null;
        }
    } else {
        console.error("Ethereum provider not found");
        return null;
    }
}

// Mint an NFT
async function mintNFT(tokenURI) {
    if (!window.ethereum) return { success: false, status: "Please install MetaMask" };
    
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        
        // Call the mintNFT function
        const transaction = await contract.mintNFT(await signer.getAddress(), tokenURI);
        await transaction.wait();
        
        return {
            success: true,
            status: `NFT minted! Check it out at: https://sepolia.etherscan.io/tx/${transaction.hash}`
        };
    } catch (error) {
        return {
            success: false,
            status: "Error: " + error.message
        };
    }
}
```

## Alchemy Core APIs

### Transfers API

The Transfers API allows you to easily fetch historical transactions for any address without scanning the entire chain.

Types of transfers supported:
1. External ETH transfers
2. ERC20 transfers
3. ERC721 transfers
4. ERC1155 transfers
5. Internal ETH transfers
6. Special NFT transfers (CryptoPunks, CryptoKitties)

Example query using Alchemy SDK:

```javascript
import { Alchemy, Network } from "alchemy-sdk";

const config = {
  apiKey: "your-api-key",
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

// Address we want get NFT mints from
const toAddress = "0x1E6E8695FAb3Eb382534915eA8d7Cc1D1994B152";

const res = await alchemy.core.getAssetTransfers({
  fromBlock: "0x0",
  fromAddress: "0x0000000000000000000000000000000000000000",
  toAddress: toAddress,
  excludeZeroValue: true,
  category: ["erc721", "erc1155"],
});

console.log(res);
```

### Token API

The Token API provides information about token balances, metadata, and allowances.

Available endpoints:
- `alchemy_getTokenAllowance`: Returns allowance info
- `alchemy_getTokenBalances`: Returns token balances
- `alchemy_getTokenMetadata`: Returns token metadata

Example using Alchemy SDK:

```javascript
import { Alchemy, Network } from "alchemy-sdk";

const settings = {
  apiKey: "your-api-key",
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(settings);

// The wallet address we want to query
const ownerAddr = "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be";
const balances = await alchemy.core.getTokenBalances(ownerAddr, [
  "0x607f4c5bb672230e8672085532f7e901544a7375",
]);

// The token address we want metadata for
const metadata = await alchemy.core.getTokenMetadata(
  "0x607f4c5bb672230e8672085532f7e901544a7375"
);

console.log("Token Balances:", balances);
console.log("Token Metadata:", metadata);
```

### Prices API

The Prices API provides current and historical token prices from both centralized and decentralized exchanges.

Available endpoints:
- Token Prices By Symbol
- Token Prices By Address
- Historical Prices By Symbol Or Address

Example using Alchemy SDK:

```javascript
import { Alchemy } from "alchemy-sdk";

const apiKey = "your-api-key";
const alchemy = new Alchemy({ apiKey });

// Define the symbols you want to fetch prices for
const symbols = ["ETH", "BTC", "USDT"];

alchemy.prices.getTokenPriceBySymbol(symbols)
  .then(data => {
    console.log("Token Prices By Symbol:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => console.error("Error:", error));
```

## Advanced Topics

### Subgraphs

Alchemy Subgraphs allow developers to create specialized APIs that define how to ingest, process, and store blockchain data.

To create a subgraph:
1. Install the Graph CLI: `npm install -g @graphprotocol/graph-cli`
2. Create a new subgraph: `graph init --from-contract <CONTRACT_ADDRESS>`
3. Define your GraphQL schema in `schema.graphql`
4. Configure data sources in `subgraph.yaml`
5. Write handlers in AssemblyScript
6. Deploy your subgraph to Alchemy Subgraphs

### Getting On-chain Events

To query blockchain events, use the `eth_getLogs` method:

```javascript
const { Alchemy, Utils } = require("alchemy-sdk");

const settings = {
  apiKey: "your-api-key",
};

const alchemy = new Alchemy(settings);

const main = async () => {
  let logs = await alchemy.core.getLogs({
    fromBlock: "0x429d3b",
    toBlock: "0x429d3b",
    address: "0xb59f67a8bff5d8cd03f6ac17265c550ed8f33907",
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
      "0x00000000000000000000000000b46c2526e227482e2ebb8f4c69e4674d262e75", // From address
      "0x00000000000000000000000054a2d42a40f51259dedd1978f6c118a0f0eff078", // To address
    ],
  });
  console.log(logs);
};
```

### Transaction Receipts

The `alchemy_getTransactionReceipts` API gets all transaction receipts for a given block by number or hash:

```javascript
import { Alchemy, Network } from "alchemy-sdk";

const config = {
  apiKey: "your-api-key",
  network: Network.ETH_MAINNET,
};
const alchemy = new Alchemy(config);

const main = async () => {
  const params = {
    blockNumber: "0x18760312114f3fdf11f9d5846245995835aa59994d5fc4203faee52d2f7eaabe"
  };

  let response = await alchemy.core.getTransactionReceipts(params);
  console.log(response);
};
```

## Additional Resources

For more detailed information, visit the [Alchemy Documentation](https://docs.alchemy.com/). 