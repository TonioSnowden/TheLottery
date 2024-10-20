const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Define private keys for two users
  const privateKey1 = "cdcf70ffc71a74418b1f007fc5cb6342f853648262cae3f114f3bf4c3832c0a3";
  const privateKey2 = "281ca2c98338424e4fb1cbb4beb09c88994eb1b370da4b245266b1a4950e6d79";

  // Create wallet instances
  const wallet1 = new ethers.Wallet(privateKey1, hre.ethers.provider);
  const wallet2 = new ethers.Wallet(privateKey2, hre.ethers.provider);
  
  const PolyLottery = await hre.ethers.getContractFactory("UnifiedLottery");
  const polyLottery = PolyLottery.attach("0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0"); // Contract address on Amoy

  // Define ticket price in wei (0.001 POL)
  const ticketPrice = BigInt("1000000000000000");
//   console.log("Current ticket price:", ethers.formatEther(ticketPrice), "POL");

  // First user buys 2 tickets
  console.log("First user buying 2 tickets...");
  const tx1 = await polyLottery.connect(wallet1).buyTickets(2, { 
    value: ticketPrice * 2n,
    maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei")
  });
  await tx1.wait();
  console.log("First user successfully bought 2 tickets!");

  // Second user buys 3 tickets
  console.log("Second user buying 3 tickets...");
  const tx2 = await polyLottery.connect(wallet2).buyTickets(3, { 
    value: ticketPrice * 3n,
    maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei")
  });
  await tx2.wait();
  console.log("Second user successfully bought 3 tickets!");

//   // Get current jackpot
//   const currentJackpot = await polyLottery.getCurrentJackpot();
//   console.log("Current jackpot:", ethers.formatEther(currentJackpot), "POL");

  // Get ticket count for each user
  const addr1TicketCount = await polyLottery.getTicketCount(wallet1.address);
  const addr2TicketCount = await polyLottery.getTicketCount(wallet2.address);
  console.log("First user ticket count:", addr1TicketCount.toString());
  console.log("Second user ticket count:", addr2TicketCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
