const { getEvmProvider } = require('../web3Helper/getProvider')
const { getSmartContractDetails, getChainDetailsFromId } = require('../DataLayer/database/database')
const { decodeEventData } = require('../event')
const { synapseABI } = require('./synapseABI')
const logger = require('../utils/logger')
const { sendSlackBlockAlert } = require('../utils/slackBot')
const getTxEvents = async (chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType) => {
  try {
    const provider = await getEvmProvider(chainDetailsId1)
    const { abi: routerABI } = await getSmartContractDetails('SINGULARITY_ROUTER', chainDetailsId1)
    const { abi: singularityABI } = await getSmartContractDetails('SINGULARITY', chainDetailsId1)
    const { chainId } = await provider.getNetwork()

    const receipt = await provider.getTransactionReceipt(txnHash1)
    console.log(receipt)
    if (!receipt) {
      logger.debug(`Transaction Receipt Not found for Given TxHash ${txnHash1}`)
      throw new Error(`Transaction Receipt Not found for Given TxHash ${txnHash1}`)
    }
    const events = receipt.logs
    const eventData = {}
    for (const log of events) {
      try {
        const decodedEventDataForRouter = await decodeEventData(routerABI, { data: log.data, topics: log.topics })
        // logger.debug(log)
        // logger.debug('Decoded Log:', decodedEventDataForRouter)
        if (decodedEventDataForRouter.eventName === 'Swapped') {
          logger.debug('Swapped Event Found', {
            info: decodedEventDataForRouter
          })
          sendSlackBlockAlert('contract-events-alert', 'Swap Event Alert ', { ...decodedEventDataForRouter, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })
          eventData.swap = decodedEventDataForRouter
        } else if (decodedEventDataForRouter.eventName === 'Bridged') {
          logger.debug('Bridged Event Found', {
            info: decodedEventDataForRouter
          })
          eventData.bridge = decodedEventDataForRouter
          if (bridgeType === 'SYNAPSE') {
            const { amount, fee } = await getSynapseBridgeEventData(chainDetailsId2, txnHash2)
            eventData.bridge.amount = amount
            eventData.bridge.fee = fee
            decodedEventDataForRouter.amount = amount
            decodedEventDataForRouter.fee = fee
          }
          sendSlackBlockAlert('contract-events-alert', 'Bridge Event Alert ', { ...decodedEventDataForRouter, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })
        } else if (decodedEventDataForRouter.eventName === 'NftMarketplaceTrade') {
          logger.debug('NftMarketplaceTrade Event Found', {
            info: decodedEventDataForRouter
          })
          sendSlackBlockAlert('contract-events-alert', 'Nft Marketplace Trade Event Alert ', { ...decodedEventDataForRouter, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })
          eventData.nftMarketplaceTrade = decodedEventDataForRouter
        }
      } catch (decodeError) {
        logger.debug(`Not An Error: EventHash ${log.topics[0]} doesn't correspond to Router Contract, Ignoring!!`, {
          err: decodeError
        })
      }

      try {
        const decodedEventDataForSingularity = await decodeEventData(singularityABI, { data: log.data, topics: log.topics })

        if (decodedEventDataForSingularity.eventName === 'FeeCollected') {
          logger.debug('FeeCollected Event Found ', {
            info: decodedEventDataForSingularity
          })
          sendSlackBlockAlert('fee-collection-alert', 'Fee Collected Event Alert ', { ...decodedEventDataForSingularity, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })

          eventData.s9yFee = decodedEventDataForSingularity
        } else if (decodedEventDataForSingularity.eventName === 'TokenTransferred') {
          logger.debug('Token Transferred Event Found', {
            info: decodedEventDataForSingularity
          })
          sendSlackBlockAlert('contract-events-alert', 'TokenTransferred Event Alert ', { ...decodedEventDataForSingularity, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })
          eventData.directTransfer = decodedEventDataForSingularity
        } else if (decodedEventDataForSingularity.eventName === 'ExternalFiatTransfer') {
          logger.debug('ExternalFiatTransfer Event Found', {
            info: decodedEventDataForSingularity
          })
          sendSlackBlockAlert('contract-events-alert', 'External Fiat Transfer Event Alert ', { ...decodedEventDataForSingularity, txHash: txnHash1, chainId, blockNumber: receipt.blockNumber })
          eventData.fiatTransfer = decodedEventDataForSingularity
        }
      } catch (decodeError) {
        logger.debug(`Not An Error: EventHash ${log.topics[0]} doesn't correspond to Singularity Contract, Ignoring!!`, {
          err: decodeError
        })
      }
    }

    return eventData
  } catch (err) {
    logger.debug(err)
    throw err
  }
}

const getTxExecutedAmounts = async (chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType) => {
  try {
    const provider = await getEvmProvider(chainDetailsId1)
    const { abi } = await getSmartContractDetails('SINGULARITY_ROUTER', chainDetailsId1)
    const receipt = await provider.getTransactionReceipt(txnHash1)
    if (!receipt) {
      logger.debug('Transaction receipt not found')
      throw new Error(`Transaction Receipt Not found for Given TxHash ${txnHash1}`)
    }
    const events = receipt.logs
    const eventData = {}
    let inAmount = 0
    let outAmount = 0
    let fee = 0
    for (const log of events) {
      try {
        const decodedEventData = await decodeEventData(abi, { data: log.data, topics: log.topics })
        // logger.debug('Decoded Log:', decodedEventData)
        if (decodedEventData.eventName === 'Swapped') {
          logger.debug('Swapped Event Found', { info: decodeEventData })
          eventData.swap = decodedEventData
          inAmount = eventData.swap.inAmount
          outAmount = eventData.swap.outAmount
        } else if (decodedEventData.eventName === 'Bridged') {
          logger.debug('Bridged Event Found', { info: decodeEventData })
          eventData.bridge = decodedEventData
          if (bridgeType === 'SYNAPSE') {
            const { amount, fee } = await getSynapseBridgeEventData(chainDetailsId2, txnHash2)
            eventData.bridge.amount = amount
            eventData.bridge.fee = fee
          }
          inAmount = parseInt(eventData.bridge.amount) + parseInt(eventData?.bridge?.fee || 0)
          outAmount = eventData.bridge.amount
          fee = eventData?.bridge?.fee || 0
        } else if (decodedEventData.eventName === 'NftMarketplaceTrade') {
          logger.debug('NftMarketplaceTrade Event Found', { info: decodeEventData })
          eventData.nftMarketplaceTrade = decodedEventData
        }
      } catch (decodeError) {
        logger.debug(`Not An Error: EventHash ${log.topics[0]} doesn't correspond to Router Contract, Ignoring!!`, {
          err: decodeError
        })
      }
    }

    return { inAmount, outAmount, fee }
  } catch (err) {
    logger.debug(err)
    throw err
  }
}

const getSynapseBridgeEventData = async (chainDetailsId2, txnHash2) => {
  const provider2 = await getEvmProvider(chainDetailsId2)
  const receipt2 = await provider2.getTransactionReceipt(txnHash2)
  if (!receipt2) {
    logger.debug('Bridge L2 Hash Receipiet Not Found!')
    throw new Error(`Bridge L2 Hash Receipiet Not Found for TxHash ${txnHash2}!`)
  }
  const synapseEvents = receipt2.logs
  for (const log2 of synapseEvents) {
    try {
      const decodedEventData2 = await decodeEventData(synapseABI, { data: log2.data, topics: log2.topics })
      if (decodedEventData2.eventName === 'TokenMint') {
        // console.log(decodedEventData2)
        logger.debug('Synapse TokenMint Event Found:', { info: decodedEventData2 })
        return decodedEventData2
      }

      if (decodedEventData2.eventName === 'TokenMintAndSwap') {
        // console.log(decodedEventData2)
        logger.debug('Synapse TokenMintAndSwap Event Found:', { info: decodedEventData2 })
        return decodedEventData2
      }
    } catch (decodeError) {
      logger.debug(`Not An Error: EventHash ${log2.topics[0]} doesn't correspond to Synapse Bridge L2 Contract, Ignoring!!`, {
        err: decodeError
      })
    }
  }
}

module.exports = {
  getTxEvents,
  getTxExecutedAmounts
}

// getTxEvents('1a01d245-cde4-49bc-b0c2-ccafde1d5da8', '0x3fbefb9b4ebd95e8b7977d1020ec4495cab04f71e6f77f2167e717334de25173', '3096ecf6-859a-49cc-bcbd-cd3eb25b834c', '0xf6b9884440f4b550b18165ac2255206bba687c2fa9bf1a67358041215cbb0154', 'SYNAPSE').then(console.log)
// getSynapseBridgeEventData('3096ecf6-859a-49cc-bcbd-cd3eb25b834c', '0xf6b9884440f4b550b18165ac2255206bba687c2fa9bf1a67358041215cbb0154').then(console.log)
