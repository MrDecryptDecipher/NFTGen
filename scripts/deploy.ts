import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the NFT contract
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy(deployer.address);
  await nft.deployed();
  console.log("NFT contract deployed to:", nft.address);

  // Verify the contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: nft.address,
      constructorArguments: [deployer.address],
    });
    console.log("Contract verified on Etherscan");
  }

  // Log deployment information
  console.log("\nDeployment Information:");
  console.log("----------------------");
  console.log("Contract Address:", nft.address);
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Block Number:", await ethers.provider.getBlockNumber());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 