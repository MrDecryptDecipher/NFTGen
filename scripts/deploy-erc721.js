/**
 * NFTGen ERC-721 Contract Deployment Script
 * 
 * Deploys the NFTGenERC721 contract to Sepolia testnet with proper verification
 * and configuration for production NFT minting.
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting NFTGen ERC-721 contract deployment to Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
  }

  // Contract parameters
  const contractName = "NFTGen";
  const contractSymbol = "NFTG";
  const initialOwner = deployer.address;

  console.log("📝 Contract parameters:");
  console.log("   Name:", contractName);
  console.log("   Symbol:", contractSymbol);
  console.log("   Initial Owner:", initialOwner);

  // Get the contract factory
  console.log("🔧 Getting contract factory...");
  const NFTGenERC721 = await ethers.getContractFactory("NFTGenERC721");

  // Estimate gas for deployment
  console.log("⛽ Estimating gas for deployment...");
  const deploymentData = NFTGenERC721.interface.encodeDeploy([
    contractName,
    contractSymbol,
    initialOwner
  ]);
  
  const gasEstimate = await deployer.estimateGas({
    data: deploymentData
  });
  
  console.log("📊 Estimated gas:", gasEstimate.toString());
  
  // Get current gas price
  const gasPrice = await deployer.getGasPrice();
  console.log("📊 Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
  
  const estimatedCost = gasEstimate.mul(gasPrice);
  console.log("💸 Estimated deployment cost:", ethers.utils.formatEther(estimatedCost), "ETH");

  // Deploy the contract
  console.log("🚀 Deploying NFTGenERC721 contract...");
  const startTime = Date.now();
  
  const nftContract = await NFTGenERC721.deploy(
    contractName,
    contractSymbol,
    initialOwner,
    {
      gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
      gasPrice: gasPrice
    }
  );

  console.log("⏳ Waiting for deployment transaction...");
  await nftContract.deployed();
  
  const deployTime = Date.now() - startTime;
  console.log(`✅ Contract deployed successfully in ${deployTime}ms!`);
  console.log("📍 Contract address:", nftContract.address);
  console.log("🔗 Transaction hash:", nftContract.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await nftContract.deployTransaction.wait(2);
  console.log("✅ Contract confirmed on blockchain");

  // Verify contract deployment
  console.log("🔍 Verifying contract deployment...");
  
  try {
    const contractCode = await ethers.provider.getCode(nftContract.address);
    if (contractCode === "0x") {
      throw new Error("Contract not deployed properly");
    }
    
    // Test contract functions
    const name = await nftContract.name();
    const symbol = await nftContract.symbol();
    const owner = await nftContract.owner();
    const currentTokenId = await nftContract.getCurrentTokenId();
    
    console.log("✅ Contract verification successful:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Owner:", owner);
    console.log("   Current Token ID:", currentTokenId.toString());
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    process.exit(1);
  }

  // Save deployment information
  const deploymentInfo = {
    contractName: "NFTGenERC721",
    contractAddress: nftContract.address,
    transactionHash: nftContract.deployTransaction.hash,
    deployer: deployer.address,
    network: "sepolia",
    chainId: 11155111,
    deploymentTime: new Date().toISOString(),
    gasUsed: gasEstimate.toString(),
    gasPrice: gasPrice.toString(),
    deploymentCost: estimatedCost.toString(),
    contractParams: {
      name: contractName,
      symbol: contractSymbol,
      initialOwner: initialOwner
    },
    abi: NFTGenERC721.interface.format('json')
  };

  // Save to file
  const deploymentPath = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentPath, `nftgen-erc721-sepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentFile);

  // Update environment file
  const envPath = path.join(__dirname, '../api/.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add contract address
  const contractAddressLine = `NFT_CONTRACT_ADDRESS=${nftContract.address}`;
  
  if (envContent.includes('NFT_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/NFT_CONTRACT_ADDRESS=.*/g, contractAddressLine);
  } else {
    envContent += `\n${contractAddressLine}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log("🔧 Updated .env file with new contract address");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Summary:");
  console.log("   Contract:", contractName);
  console.log("   Address:", nftContract.address);
  console.log("   Network: Sepolia Testnet");
  console.log("   Explorer: https://sepolia.etherscan.io/address/" + nftContract.address);
  console.log("   Owner:", owner);
  
  console.log("\n🔗 Next steps:");
  console.log("1. Verify contract on Etherscan (optional)");
  console.log("2. Test minting functionality");
  console.log("3. Update frontend with new contract address");
  
  return {
    contractAddress: nftContract.address,
    transactionHash: nftContract.deployTransaction.hash,
    deploymentInfo
  };
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;
