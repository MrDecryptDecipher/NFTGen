/**
 * Hardhat script to deploy the FractionalNFT contract
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting FractionalNFT contract deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Get account balance
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

  // Deploy the contract
  console.log("Deploying FractionalNFT contract...");
  const FractionalNFT = await hre.ethers.getContractFactory("FractionalNFT");
  const fractionalNFT = await FractionalNFT.deploy();
  await fractionalNFT.deployed();

  console.log(`FractionalNFT contract deployed to: ${fractionalNFT.address}`);

  // Save the contract address to the .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log("No .env file found, creating one...");
  }

  // Update or add the contract address
  if (envContent.includes('VITE_FRACTIONAL_NFT_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /VITE_FRACTIONAL_NFT_CONTRACT_ADDRESS=.*/,
      `VITE_FRACTIONAL_NFT_CONTRACT_ADDRESS=${fractionalNFT.address}`
    );
  } else {
    envContent += `\nVITE_FRACTIONAL_NFT_CONTRACT_ADDRESS=${fractionalNFT.address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with contract address: ${fractionalNFT.address}`);

  // Verify the contract on Etherscan if API key is available
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: fractionalNFT.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.error("Error verifying contract on Etherscan:", error);
    }
  } else {
    console.log("Skipping Etherscan verification (no API key found)");
  }

  console.log("Deployment completed successfully!");
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 