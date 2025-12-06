/**
 * This script deploys the MyNFT contract using Nwallet instead of Metamask
 * It connects to the Nwallet API to get a signer and deploys the contract
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Nwallet API settings
const NWALLET_API_URL = process.env.REACT_APP_NWALLET_API_URL || 'http://localhost:3001';
const CONTRACT_ABI_PATH = path.join(process.cwd(), 'artifacts/contracts/MyNFT.sol/MyNFT.json');

async function main() {
  try {
    console.log('Deploying MyNFT contract using Nwallet...');
    
    // Connect to Nwallet API
    console.log('Connecting to Nwallet API at:', NWALLET_API_URL);
    
    // Get wallet address from Nwallet
    const accountResponse = await axios.get(`${NWALLET_API_URL}/api/wallet/address`);
    const deployerAddress = accountResponse.data.address;
    
    if (!deployerAddress) {
      throw new Error('Failed to get wallet address from Nwallet');
    }
    
    console.log('Deploying contract with account:', deployerAddress);
    
    // Get provider from Nwallet or Alchemy
    const alchemyUrl = process.env.API_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';
    const provider = new ethers.providers.JsonRpcProvider(alchemyUrl);
    
    // Get signer via Nwallet API
    // Note: This is a simplified example. In a real implementation, 
    // you would need to use Nwallet's signing mechanism to sign the deployment transaction
    
    // Load contract ABI and bytecode
    const contractJson = JSON.parse(fs.readFileSync(CONTRACT_ABI_PATH, 'utf8'));
    const bytecode = contractJson.bytecode;
    
    // Create a deployment transaction to send to Nwallet for signing
    const factory = new ethers.ContractFactory(
      contractJson.abi,
      bytecode,
      provider
    );
    
    const deployTx = factory.getDeployTransaction(deployerAddress);
    const deployData = deployTx.data;
    const estimatedGas = await provider.estimateGas({
      from: deployerAddress,
      data: deployData
    });
    
    console.log('Contract deployment prepared. Estimated gas:', estimatedGas.toString());
    console.log(`
To deploy the contract:
1. Copy this deployment data
2. Use Nwallet to create a transaction with this data
3. After deployment, add the contract address to your .env file as:
   REACT_APP_CONTRACT_ADDRESS=<deployed-contract-address>
   
Deployment Data:
${deployData}
`);
  } catch (error) {
    console.error('Error deploying contract:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 