const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    const unifiedLotteryAddress = "0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0";
    const vrfHandlerAddress = "0x23a73E04c06ea18b29eCd9D96578598c0783Aac0";

    // Get the contract factories
    // const UnifiedLottery = await ethers.getContractFactory("UnifiedLottery");
    // const VRFHandler = await ethers.getContractFactory("VRFHandler");

    // Attach to the deployed contracts

  // Deploy the UnifiedLottery contract
  const UnifiedLottery = await ethers.getContractFactory("UnifiedLottery");
  const unifiedLottery = await UnifiedLottery.attach(unifiedLotteryAddress);
  // Set up the lottery
  const ticketPrice = ethers.utils.parseEther("0.1"); // 0.1 ETH per ticket
  const lotteryDuration = 3600; // 1 hour
//   await unifiedLottery.startNewLottery(ticketPrice, lotteryDuration);
  console.log("New lottery started");

  // Get some test accounts
//   const [owner, addr1, addr2] = await ethers.getSigners();

//   // Buy tickets for different addresses
//   await unifiedLottery.connect(addr1).buyTickets(1, { value: ticketPrice });
//   await unifiedLottery.connect(addr2).buyTickets(2, { value: ticketPrice.mul(2) });
// //   await unifiedLottery.connect(addr3).buyTickets(3, { value: ticketPrice.mul(3) });
//   console.log("Tickets bought for addr1, addr2, and addr3");

  // Get the list of participants
  const participants = await unifiedLottery.getParticipants();
  console.log("Participants:", participants);

  // Verify the participants
  const expectedParticipants = [addr1.address, addr2.address, addr3.address];
  const participantsMatch = JSON.stringify(participants) === JSON.stringify(expectedParticipants);
  console.log("Participants match expected:", participantsMatch);

  // Additional checks
  console.log("Number of participants:", participants.length);
  for (let i = 0; i < participants.length; i++) {
    const ticketCount = await unifiedLottery.participantTicketCounts(participants[i]);
    console.log(`Address ${participants[i]} has ${ticketCount} tickets`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });