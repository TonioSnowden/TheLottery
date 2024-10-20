const hre = require("hardhat");

async function main() {
  const ticketPrice = hre.ethers.parseEther("0.001"); // 0.001 ETH equivalent
  const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // Base Sepolia LayerZero endpoint
  const lotteryChainEid = 80002; // Amoy testnet EID (replace with actual EID if different)

  const UserLottery = await hre.ethers.getContractFactory("UserLottery");
  const userLottery = await UserLottery.deploy(
    lzEndpoint,
    await hre.ethers.provider.getSigner().getAddress(), // owner
    ticketPrice,
    lotteryChainEid
  );

  await userLottery.waitForDeployment();

  console.log("UserLottery deployed to:", await userLottery.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
