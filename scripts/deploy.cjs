async function main() {
   const [deployer] = await ethers.getSigners();
   
   console.log("Deploying contract with account:", deployer.address);
   
   // Grab the contract factory 
   const MyNFT = await ethers.getContractFactory("MyNFT");

   // Start deployment, returning a promise that resolves to a contract object
   const myNFT = await MyNFT.deploy(deployer.address); // Pass the deployer's address as the initial owner
   
   await myNFT.deployed();

   console.log("Contract deployed to address:", myNFT.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 