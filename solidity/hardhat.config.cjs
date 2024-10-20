require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY_MAIN = process.env.PRIVATE_KEY_MAIN;
const PRIVATE_KEY_TEST_1 = process.env.PRIVATE_KEY_TEST_1;
const PRIVATE_KEY_TEST_2 = process.env.PRIVATE_KEY_TEST_2;


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/c3fcc3655d78435ea4624d14e8b8ffa0",
        accounts:["0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"],
        blockNumber: 20997268 // Use a specific block number for consistent testing
      }
    },
    localhost: {
      chainId: 31337
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY_MAIN, PRIVATE_KEY_TEST_1, PRIVATE_KEY_TEST_2],
      chainId: 80002,
      timeout: 60000 // Increase timeout to 60 seconds
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY_MAIN, PRIVATE_KEY_TEST_1, PRIVATE_KEY_TEST_2],
      chainId: 84532,
      timeout: 60000 // Increase timeout to 60 seconds
    }
  }
};

// task("check-fork", "Checks if mainnet forking is working")
//   .setAction(async (taskArgs, hre) => {
//     const provider = new hre.ethers.providers.JsonRpcProvider("http://localhost:8545");
//     const blockNumber = await provider.getBlockNumber();
//     console.log("Current block number:", blockNumber);

//     // Check a known contract on mainnet
//     const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
//     const daiAbi = ["function name() view returns (string)"];
//     const daiContract = new hre.ethers.Contract(daiAddress, daiAbi, provider);
//     const daiName = await daiContract.name();
//     console.log("DAI token name:", daiName);
//   });
