/**
 * Hardhat Configuration for NFTGen
 *
 * Updated configuration for real Sepolia testnet deployment
 * with proper Alchemy integration and verification support.
 */

require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337
    },
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL || "https://eth-sepolia.g.alchemy.com/v2/nPU0zHCA4z7BgFOCWbIuEQ_fMu8aSJnZ",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
      confirmations: 2
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 60000
  }
};