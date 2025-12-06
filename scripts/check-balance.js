/**
 * Check wallet balance and network connectivity
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking wallet balance and network connectivity...");
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📋 Wallet address:", deployer.address);
    
    // Check balance
    const balance = await deployer.getBalance();
    console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Check network
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);
    
    // Check if we have enough for deployment (estimate ~0.01 ETH)
    const minRequired = ethers.utils.parseEther("0.01");
    if (balance.lt(minRequired)) {
      console.log("❌ Insufficient balance for deployment");
      console.log("💡 Need at least 0.01 ETH for contract deployment");
      console.log("🔗 Get Sepolia ETH from:");
      console.log("   - https://sepoliafaucet.com/");
      console.log("   - https://faucets.chain.link/sepolia");
      console.log("   - https://sepolia-faucet.pk910.de/");
    } else {
      console.log("✅ Sufficient balance for deployment");
    }
    
    // Test provider connection
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("📦 Latest block:", blockNumber);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
