const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Address of the contract
  const contractAddress = "0x78FE644f0aCEbbe3F2e3294ED0a6a6F0f21bbEb0";

  // Get the contract factory
  const Contract = await ethers.getContractFactory("UnifiedLottery");

  // Attach to the deployed contract
  const contract = await Contract.attach(contractAddress);

  console.log("Setting VRF handler...");

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  // Check if the signer is the owner
  const owner = await contract.owner();
  console.log("Contract owner:", owner);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("The signer is not the contract owner. Only the owner can set the VRF handler.");
    return;
  }

  // Set the VRF handler
  const tx = await contract.setVRFHandler("0xcd81bB01D59BB0Cb9118C795a2E8842046fE8B8F", {
    gasLimit: 300000 // Adjust this value as needed
  });

  // Wait for the transaction to be mined
  await tx.wait();

  console.log("VRF handler set successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
