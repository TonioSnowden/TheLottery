const hre = require("hardhat");

async function main() {
  const ticketPrice = hre.ethers.parseEther("0.001"); // 0.001 MATIC
  const lotteryDuration = 3600; // 1 hour
  const vrfCoordinator = "0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2"; // Amoy VRF Coordinator
  const subscriptionId = "112126700563929212635047358461348113459517158692596716182031959155606886216369"; // Replace with your actual subscription ID
  const keyHash = "0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899"; // Amoy keyHash
  const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // Amoy LayerZero endpoint

  const Lottery = await hre.ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy(
    lzEndpoint,
    await hre.ethers.provider.getSigner().getAddress(), // owner
    ticketPrice,
    lotteryDuration,
    vrfCoordinator,
    keyHash,
    subscriptionId,
    500000, // callbackGasLimit
    3, // requestConfirmations
    1 // numWords
  );

  await lottery.waitForDeployment();

  console.log("Lottery deployed to:", await lottery.getAddress());

  // Add the contract to the VRFCoordinatorV2

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
