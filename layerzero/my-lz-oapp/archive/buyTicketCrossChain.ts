import { ethers } from "hardhat";
import { UserLottery__factory, Lottery__factory } from "../typechain-types";

async function main() {
  const [signer] = await ethers.getSigners();

  console.log("Using signer address:", signer.address);

  // Contract addresses
  const userLotteryAddress = "0x708E2DC246ddA8bb60Ad6250326164C09f48dd7d";
//   const lotteryAddress = "0xaA3E22eD307F9AF1C70a4AB6e75f988e3F30D8Fa";

  // Connect to UserLottery on Base
  const userLotteryFactory = await ethers.getContractFactory("UserLottery") as UserLottery__factory;
  const userLottery = userLotteryFactory.attach(userLotteryAddress);


  // Buy a ticket
  const ticketPrice = await userLottery.ticketPrice();
//   console.log("Ticket price:", ethers.formatEther(ticketPrice), "ETH");

  console.log("Buying a ticket...");
  const tx = await userLottery.buyTickets(1, { value: ticketPrice });
  await tx.wait();
  console.log("Ticket bought. Transaction hash:", tx.hash);

  // Wait for a bit to allow the cross-chain message to be processed
  console.log("Waiting for 60 seconds to allow cross-chain message processing...");
  await new Promise(resolve => setTimeout(resolve, 60000));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});