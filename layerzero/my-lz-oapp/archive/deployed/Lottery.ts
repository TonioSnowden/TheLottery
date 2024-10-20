import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'
// import { ethers } from 'ethers'

// TODO declare your contract name here
const contractName = 'Lottery'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const ticketPrice = "1000000000000000" // 0.001 POL in wei
    const lotteryDuration = 3600 // 1 hour
    const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f" // Amoy LayerZero endpoint
    const vrfHandler = "0x23a73E04c06ea18b29eCd9D96578598c0783Aac0" // Address of the VRF handler contract

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            lzEndpoint,
            ticketPrice,
            lotteryDuration,
            vrfHandler
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
