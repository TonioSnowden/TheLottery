import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'UserLottery'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // Base Sepolia LayerZero endpoint
    const ticketPrice = "1000000000000000" // 0.001 POL in wei
    const lotteryChainEid = 40267 // Example EID for the lottery chain (Amoy testnet)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            lzEndpoint,
            deployer, // owner
            ticketPrice,
            lotteryChainEid
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy