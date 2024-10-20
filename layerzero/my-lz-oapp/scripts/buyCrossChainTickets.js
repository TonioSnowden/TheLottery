const hre = require("hardhat");
const { ethers } = require("hardhat");

const { Options } = require('@layerzerolabs/lz-v2-utilities');


async function main() {
  // Define private keys for two users
  const privateKey1 = "cdcf70ffc71a74418b1f007fc5cb6342f853648262cae3f114f3bf4c3832c0a3";
//   const privateKey2 = "281ca2c98338424e4fb1cbb4beb09c88994eb1b370da4b245266b1a4950e6d79";

  // Create wallet instances
  const wallet1 = new ethers.Wallet(privateKey1, hre.ethers.provider);
//   const wallet2 = new ethers.Wallet(privateKey2, hre.ethers.provider);
  
  const UnifiedLottery = await hre.ethers.getContractFactory("UnifiedLottery");
//   const unifiedLottery = UnifiedLottery.attach("0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0"); // Contract address on Amoy
  const unifiedLottery = UnifiedLottery.attach("0x883102E860cC5de035f39629B9566DEef4d031E7"); // Contract address on Amoy

  // Define ticket price in wei (0.001 POL)
  const ticketPrice = ethers.utils.parseEther("0.001");
//   console.log("Current ticket price:", ethers.formatEther(ticketPrice), "POL");

  // Define destination EID
  const dstEid = 40267;

  // First user buys 2 tickets cross-chain
  console.log("Quoting cross-chain ticket purchase...");
  const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex()
  const numberOfTickets = 2;

  // Quote the cross-chain fee
  const fee = await unifiedLottery.quote(dstEid, numberOfTickets, options);
  console.log(`Native fee: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);

  // Calculate total cost including tickets, native fee, and additional 0.1 ETH
  const additionalFee = ethers.utils.parseEther("0.1");
  const totalCost = ticketPrice.mul(numberOfTickets).add(fee.nativeFee).add(additionalFee);

  console.log(`Total cost: ${ethers.utils.formatEther(totalCost)} ETH`);
  console.log(`Buying ${numberOfTickets} tickets cross-chain...`);
  const tx = await unifiedLottery.connect(wallet1).buyTicketsCrossChain(
    dstEid,
    numberOfTickets,
    options,
    { 
      value: totalCost,
      gasLimit: 500000
    }
  );

  console.log("Transaction sent. Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`Transaction confirmed. Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`Transaction hash: ${receipt.transactionHash}`);

//   // Second user buys 3 tickets cross-chain
//   console.log("Second user buying 3 tickets cross-chain...");
//   const tx2 = await polyLottery.connect(wallet2).buyTicketsCrossChain(dstEid, 3, { 
//     value: ticketPrice * 3n,
//     maxFeePerGas: ethers.utils.parseUnits("30", "gwei"),
//     maxPriorityFeePerGas: ethers.utils.parseUnits("25", "gwei")
//   });
//   await tx2.wait();
//   console.log("Second user successfully initiated cross-chain purchase of 3 tickets!");

//   // Get current jackpot
//   const currentJackpot = await polyLottery.getCurrentJackpot();
//   console.log("Current jackpot:", ethers.formatEther(currentJackpot), "POL");

  // Get ticket count for each user
//   const addr1TicketCount = await polyLottery.getTicketCount(wallet1.address);
//   const addr2TicketCount = await polyLottery.getTicketCount(wallet2.address);
//   console.log("First user ticket count:", addr1TicketCount.toString());
//   console.log("Second user ticket count:", addr2TicketCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
