const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Addresses of the contracts
  const unifiedLotteryAddress = "0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0";
  const vrfHandlerAddress = "0x23a73E04c06ea18b29eCd9D96578598c0783Aac0";

  // Get the contract factories
  const UnifiedLottery = await ethers.getContractFactory("UnifiedLottery");
  const VRFHandler = await ethers.getContractFactory("VRFHandler");

  // Attach to the deployed contracts
  const unifiedLottery = await UnifiedLottery.attach(unifiedLotteryAddress);
  const vrfHandler = await VRFHandler.attach(vrfHandlerAddress);

  console.log("Checking addresses...");

  // Check UnifiedLottery's VRF handler address
  const setVRFHandler = await unifiedLottery.vrfHandler();
  console.log("VRF Handler address set in UnifiedLottery:", setVRFHandler);
  console.log("Expected VRF Handler address:", vrfHandlerAddress);
  console.log("VRF Handler address correctly set:", setVRFHandler.toLowerCase() === vrfHandlerAddress.toLowerCase());

  // Check VRFHandler's lottery contract address
  const setLotteryContract = await vrfHandler.lotteryContract();
  console.log("Lottery contract address set in VRFHandler:", setLotteryContract);
  console.log("Expected Lottery contract address:", unifiedLotteryAddress);
  console.log("Lottery contract address correctly set:", setLotteryContract.toLowerCase() === unifiedLotteryAddress.toLowerCase());

  // Check UnifiedLottery owner
  const unifiedLotteryOwner = await unifiedLottery.owner();
  console.log("UnifiedLottery owner:", unifiedLotteryOwner);

  // Check VRFHandler owner (if it has an owner function)
  try {
    const vrfHandlerOwner = await vrfHandler.owner();
    console.log("VRFHandler owner:", vrfHandlerOwner);
  } catch (error) {
    console.log("VRFHandler doesn't have an owner function or is not Ownable");
  }

  console.log("Address check completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });