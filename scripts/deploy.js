async function main() {
   const [deployer] = await ethers.getSigners();

   console.log("Deploying ERC1155 NFT contract with account:", deployer.address);
   console.log("Account balance:", (await deployer.getBalance()).toString());

   // Grab the contract factory
   const NFTGenERC1155 = await ethers.getContractFactory("NFTGenERC1155");

   // Start deployment, returning a promise that resolves to a contract object
   const nftContract = await NFTGenERC1155.deploy(deployer.address); // Pass the deployer's address as the initial owner

   await nftContract.deployed();

   console.log("ERC1155 NFT Contract deployed to address:", nftContract.address);
   console.log("Contract owner:", await nftContract.owner());
   console.log("Contract supports ERC1155:", await nftContract.supportsInterface("0xd9b67a26")); // ERC1155 interface ID
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 