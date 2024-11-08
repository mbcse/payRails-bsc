const { ethers } = require('ethers')
const { synapseABI } = require('../getEventsData/synapseABI')
const logger = require('../utils/logger')

const synapseContractAddresses = {
  53935: '0xE05c976d3f045D0E6E7A6f61083d98A15603cF6A',
  7700: '0xDde5BEC4815E1CeCf336fb973Ca578e8D83606E0',
  42161: '0x6F4e8eBa4D337f874Ab57478AcC2Cb5BACdc19c9',
  8453: '0xf07d1C752fAb503E47FEF309bf14fbDD3E867089',
  137: '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280',
  1: '0x2796317b0fF8538F253012862c06787Adfb8cEb6',
  10: '0xAf41a65F786339e7911F4acDAD6BD49426F2Dc6b',
  56: '0xd123f70AE324d34A9E76b67a27bf77593bA8749f',
  43114: '0xC05e61d0E7a63D27546389B7aD62FdFf5A91aACE'
}

// Function to process events
async function findSynapseBridgeEvent (chainId, provider, kappa) {
  try {
    console.log('Finding Synapse Event and Tx Hash by manual Method')
    // Initialize contract instance
    const synapseContractAddressForChain = synapseContractAddresses[chainId]
    const contract = new ethers.Contract(synapseContractAddressForChain, synapseABI, provider)

    const currentBlockNumber = await provider.getBlockNumber()
    const maxFromBlockNumberToSearch = currentBlockNumber - 100000

    let checkFromBlockNumber = currentBlockNumber - 2047
    let checkToBlockNumber = currentBlockNumber

    while (checkFromBlockNumber >= maxFromBlockNumberToSearch) {
    // Event filter
      const filter = {
        address: synapseContractAddressForChain,
        topics: [
          [// keccak256 hash of the event signature
            ethers.utils.id('TokenMint(address,address,uint256,uint256,bytes32)'),
            ethers.utils.id('TokenMintAndSwap(address,address,uint256,uint256,uint8,uint8,uint256,uint256,bool,bytes32)')
          ]
        ],
        // Additional filters
        fromBlock: checkFromBlockNumber, // Start block
        toBlock: checkToBlockNumber // End block (or "latest" for latest block)
      }
      const events = await provider.getLogs(filter)
      for (let j = 0; j < events.length; j++) {
        const event = events[j]
        const parsedEvent = contract.interface.parseLog(event)
        console.log(parsedEvent)
        const kappaFromEvent = parsedEvent.args.kappa // Extracting Kappa
        if (kappaFromEvent === kappa) {
          console.log('Found event:', parsedEvent)
          return event.transactionHash
        }
      }
      checkToBlockNumber = checkFromBlockNumber
      checkFromBlockNumber = checkToBlockNumber - 2047
      if (checkFromBlockNumber < maxFromBlockNumberToSearch) {
        checkFromBlockNumber = maxFromBlockNumberToSearch
      }
    }
    return null
  } catch (error) {
    logger.error('Error in findSynapseBridgeEvent', { error })
    return null
  }
}

module.exports = findSynapseBridgeEvent
