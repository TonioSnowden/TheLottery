const { expect } = require("chai");
const { ethers, network } = require("hardhat");
require("dotenv").config();

describe("Cross-Chain Lottery", function () {
  let lottery, userLottery;
  let owner, addr1;
  const ticketPrice = ethers.parseEther("0.001");
  const amoyChainId = 80002;
  const baseSepoliaChainId = 84532;
  const lotteryAddress = process.env.LOTTERY_CONTRACT_ADDRESS;
  const userLotteryAddress = process.env.USER_LOTTERY_CONTRACT_ADDRESS;

  // Increase timeout to 5 minutes (300000 ms)
  this.timeout(300000);

  before(async function () {
    // Connect to Base Sepolia
    await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: "https://sepolia.base.org",
          blockNumber: await ethers.provider.getBlockNumber()
        },
      }],
    });

    [owner, addr1] = await ethers.getSigners();

    // Attach to the deployed UserLottery contract on Base Sepolia
    const UserLottery = await ethers.getContractFactory("UserLottery");
    userLottery = UserLottery.attach(userLotteryAddress);

    // Connect to Amoy
    await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: "https://rpc-amoy.polygon.technology",
          blockNumber: await ethers.provider.getBlockNumber()
        },
      }],
    });

    // Attach to the deployed Lottery contract on Amoy
    const Lottery = await ethers.getContractFactory("Lottery");
    lottery = Lottery.attach(lotteryAddress);

    // Add this new function to check network connection
    async function waitForConnection(maxAttempts = 30, interval = 2000) {
      for (let i = 0; i < maxAttempts; i++) {
        try {
          console.log(`Attempt ${i + 1} to connect to the network...`);
          await ethers.provider.getNetwork();
          console.log("Successfully connected to the network!");
          return true;
        } catch (error) {
          console.log(`Connection attempt failed: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      throw new Error("Failed to connect to the network after multiple attempts");
    }

    // Wait for connection before proceeding
    await waitForConnection();
  });

  it("Should allow cross-chain ticket purchase and run a full lottery cycle", async function () {
    try {
      console.log("Starting cross-chain lottery test...");

      // Switch to Base Sepolia for buying tickets
      await network.provider.request({
        method: "hardhat_reset",
        params: [{
          forking: {
            jsonRpcUrl: "https://sepolia.base.org",
            blockNumber: await ethers.provider.getBlockNumber()
          },
        }],
      });

      // Buy tickets from Base Sepolia
      console.log("Buying tickets from Base Sepolia...");
      const numberOfTickets = 2;
      const totalCost = ticketPrice * BigInt(numberOfTickets);
      const tx = await userLottery.connect(addr1).buyTickets(numberOfTickets, { value: totalCost });
      await tx.wait();
      console.log(`Addr1 bought ${numberOfTickets} tickets`);

      // Wait for the cross-chain message to be processed
      console.log("Waiting for cross-chain message to be processed...");
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30 seconds

      // Switch back to Amoy for checking tickets and ending the lottery
      await network.provider.request({
        method: "hardhat_reset",
        params: [{
          forking: {
            jsonRpcUrl: "https://rpc-amoy.polygon.technology",
            blockNumber: await ethers.provider.getBlockNumber()
          },
        }],
      });

      // Check total tickets sold on Amoy
      console.log("Checking participants and tickets on Amoy...");
      const participants = await lottery.getParticipants();
      console.log("Participants:", participants);
      expect(participants).to.include(addr1.address);

      const totalTickets = await lottery.getTotalTickets();
      console.log("Total tickets:", totalTickets);
      expect(totalTickets).to.equal(numberOfTickets);

      // ... (rest of the test remains the same)
    } catch (error) {
      console.error("Detailed error:", error);
      throw error;
    }
  });
});
