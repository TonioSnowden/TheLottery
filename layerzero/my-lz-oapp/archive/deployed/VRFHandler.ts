import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'
// import { ethers } from 'ethers'

// TODO declare your contract name here
const contractName = 'VRFHandler'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)


    const vrfCoordinator = "0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2" // Amoy VRF Coordinator
    const subscriptionId = "112126700563929212635047358461348113459517158692596716182031959155606886216369" // Replace with your actual subscription ID
    const keyHash = "0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899" // Amoy keyHash

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            vrfCoordinator,
            subscriptionId,
            keyHash,
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
