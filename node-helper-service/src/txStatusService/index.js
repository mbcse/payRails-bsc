const { SynapseSDK } = require('@synapsecns/sdk-router')
const optimismSDK = require('@eth-optimism/sdk')
const { getEvmProvider } = require('../web3Helper/getProvider')
const logger = require('../utils/logger')
const { getRouteOperationDetailsById } = require('../DataLayer/database/database')
const { default: axios } = require('axios')
const { UNKNOWN_TID } = require('../utils/constants')
const findSynapseBridgeEvent = require('./findSynapseBridgeEvent')

const MessageStatus = [
  /**
   * Message is an L1 to L2 message and has not been processed by the L2.
   */
  'UNCONFIRMED_L1_TO_L2_MESSAGE',

  /**
   * Message is an L1 to L2 message and the transaction to execute the message failed.
   * When this status is returned, you will need to resend the L1 to L2 message, probably with a
   * higher gas limit.
   */
  'FAILED_L1_TO_L2_MESSAGE',

  /**
   * Message is an L2 to L1 message and no state root has been published yet.
   */
  'STATE_ROOT_NOT_PUBLISHED',

  /**
   * Message is ready to be proved on L1 to initiate the challenge period.
   */
  'READY_TO_PROVE',

  /**
   * Message is a proved L2 to L1 message and is undergoing the challenge period.
   */
  'IN_CHALLENGE_PERIOD',

  /**
   * Message is ready to be relayed.
   */
  'READY_FOR_RELAY',

  /**
   * Message has been relayed.
   */
  'RELAYED'
]

const getL2TransactionInfo = async (l1ChainDetailId, l2ChainDetailId, l1TxHash, bridgeId, bridgeType, tid = UNKNOWN_TID) => {
  const bridgeDetails = await getRouteOperationDetailsById(bridgeId)
  if (bridgeDetails.bridge_direction === 'L2_L1') {
    console.log('L2 to L1 Case ')
    // swap chainIds
    const temp = l2ChainDetailId
    l2ChainDetailId = l1ChainDetailId
    l1ChainDetailId = temp
  }

  console.log(l1ChainDetailId)
  console.log(l2ChainDetailId)
  console.log(l1TxHash)

  const [l1Provider, l2Provider] = await Promise.all([getEvmProvider(l1ChainDetailId), getEvmProvider(l2ChainDetailId)])
  const [{ chainId: l1ChainId }, { chainId: l2ChainId }] = await Promise.all([l1Provider.getNetwork(), l2Provider.getNetwork()])

  if (bridgeDetails.bridge_type === 'OPTIMISTIC') {
    let crossChainMessenger
    if (bridgeDetails.data && bridgeDetails.data.contracts && bridgeDetails.data.contracts[l2ChainId]) {
      crossChainMessenger = new optimismSDK.CrossChainMessenger({
        l1ChainId,
        l2ChainId,
        l1SignerOrProvider: l1Provider,
        l2SignerOrProvider: l2Provider,
        contracts: { l2: bridgeDetails.data.contracts[l2ChainId], l1: bridgeDetails.data.contracts[l2ChainId] },
        bedrock: true
      })
    } else {
      logger.warn(`No bridge data found for ${bridgeId}}, Processing it on default chain optimism`, ({
        tid
      }))
      crossChainMessenger = new optimismSDK.CrossChainMessenger({
        l1ChainId,
        l2ChainId,
        l1SignerOrProvider: l1Provider,
        l2SignerOrProvider: l2Provider,
        bedrock: true
      })
    }

    if (bridgeDetails.bridge_direction === 'L1_L2') {
      console.log('Bridge direction is L1_TO_L2')
      const [status, l2Rcpt] = await Promise.all([crossChainMessenger.getMessageStatus(l1TxHash), crossChainMessenger.getMessageReceipt(l1TxHash)])
      logger.debug(`Status: ${status}`, ({
        tid,
        status
      }))
      logger.debug(`l2Rcpt: ${l2Rcpt}`, ({
        tid,
        l2Rcpt
      }))
      let l2TxHash = null

      if (l2Rcpt && l2Rcpt.transactionReceipt) {
        l2TxHash = l2Rcpt.transactionReceipt.transactionHash
      }

      return { status: MessageStatus[status], l2TxHash }
    } else {
      console.log('Bridge direction is L2_TO_L1')
      const [status, l2Rcpt] = await Promise.all([crossChainMessenger.getMessageStatus(l1TxHash), crossChainMessenger.getMessageReceipt(l1TxHash)])
      logger.debug(`Status: ${status}`, ({
        tid,
        status
      }))
      logger.debug(`l2Rcpt: ${l2Rcpt}`, ({
        tid,
        l2Rcpt
      }))
      let l2TxHash = null

      if (l2Rcpt && l2Rcpt.transactionReceipt) {
        l2TxHash = l2Rcpt.transactionReceipt.transactionHash
      }

      return { status: MessageStatus[status], l2TxHash }
    }
  } else if (bridgeDetails.bridge_type === 'SYNAPSE') {
    const bridgeStatus = await getSynapseBridgingStatus(l1TxHash, l1ChainId, tid)
    console.log(bridgeStatus)
    if (bridgeStatus.status !== 'RELAYED') {
      return await getDirectOnchainSynapseBridgeStatus(l1TxHash, l1ChainId, l2ChainId, l1Provider, l2Provider, tid)
    }
    return bridgeStatus
  } else {
    throw new Error('Unknown bridge')
  }
}

const getSynapseBridgingStatus = async (l1TxHash, l1ChainId, tid = UNKNOWN_TID) => {
  try {
    logger.info('Finding Transaction using Secondary Queries', ({
      tid
    }))
    const originTxdata = await axios.get(`https://explorer.omnirpc.io/graphql?query=%7B%0A%20%20origin%3A%20getOriginBridgeTx(chainID%3A%20${l1ChainId}%2C%20txnHash%3A%20%22${l1TxHash}%22%2C%20bridgeType%3A%20BRIDGE)%20%7B%0A%20%20%20%20bridgeTx%20%7B%0A%20%20%20%20%20%20txnHash%0A%20%20%20%20%20%20time%0A%20%20%20%20%20%20address%0A%20%20%20%20%20%20destinationChainID%0A%20%20%20%20%7D%0A%20%20%20%20pending%0A%20%20%20%20kappa%0A%20%20%7D%0A%7D%0A`)
    const { data: { origin: { bridgeTx: { destinationChainID, time, address }, kappa } } } = originTxdata.data
    logger.debug(`originTxdata.data: ${originTxdata.data}`, ({
      tid,
      originTxdataValue: originTxdata.data
    }))
    console.log(originTxdata.data.data)

    if (!destinationChainID || !time || !address || !kappa) throw new Error('Got Incomplete Data from Origin Query')
    try {
      console.log('Executing Destination Query 1')
      const destTxData = await axios.get(`https://explorer.omnirpc.io/graphql?query=%7B%0A%20%20destination%3A%20getDestinationBridgeTx(chainID%3A%20${destinationChainID}%2C%20kappa%3A%20%22${kappa}%22%2C%20address%3A%20%22${address}%22%2C%20timestamp%3A%20${time}%2C%20bridgeType%3A%20BRIDGE%2C%20historical%3A%20false)%20%7B%0A%20%20%20%20bridgeTx%20%7B%0A%20%20%20%20%20%20txnHash%0A%20%20%20%20%7D%0A%20%20%20%20pending%0A%20%20%7D%0A%7D%0A`)
      console.log(destTxData.data.data)
      const destBridgeData = destTxData.data.data.destination
      if (destBridgeData) {
        if (destBridgeData.pending) {
          return { status: 'UNCONFIRMED_L1_TO_L2_MESSAGE', l2TxHash: null }
        } else {
          return { status: 'RELAYED', l2TxHash: destBridgeData.bridgeTx.txnHash }
        }
      } else {
        throw new Error('Tx Not Found in Recent Blocks on L2, Quering Historical Data')
      }
    } catch (error) {
      logger.info(`Error: ${error}`, ({
        tid,
        error
      }))
      console.log('Executing Destination Query 2(Historical)')
      const destTxData = await axios.get(`https://explorer.omnirpc.io/graphql?query=%7B%0A%20%20destination%3A%20getDestinationBridgeTx(chainID%3A%20${destinationChainID}%2C%20kappa%3A%20%22${kappa}%22%2C%20address%3A%20%22${address}%22%2C%20timestamp%3A%20${time}%2C%20bridgeType%3A%20BRIDGE%2C%20historical%3A%20true)%20%7B%0A%20%20%20%20bridgeTx%20%7B%0A%20%20%20%20%20%20txnHash%0A%20%20%20%20%7D%0A%20%20%20%20pending%0A%20%20%7D%0A%7D%0A`)
      const destBridgeData = destTxData.data.data.destination
      if (destBridgeData) {
        if (destBridgeData.pending) {
          return { status: 'UNCONFIRMED_L1_TO_L2_MESSAGE', l2TxHash: null }
        } else {
          return { status: 'RELAYED', l2TxHash: destBridgeData.bridgeTx.txnHash }
        }
      } else {
        return { status: 'NOT_FOUND', l2TxHash: null }
      }
    }
  } catch (err) {
    logger.info('Finding Transaction using Base Query', ({
      tid
    }))
    try {
      const resdata = await axios.get(`https://explorer.omnirpc.io/graphql?query=query%20GetBridgeTransactionsQuery(%24chainIDFrom%3A%20%5BInt%5D%2C%20%24chainIDTo%3A%20%5BInt%5D%2C%20%24addressFrom%3A%20String%2C%20%24addressTo%3A%20String%2C%20%24maxAmount%3A%20Int%2C%20%24minAmount%3A%20Int%2C%20%24maxAmountUsd%3A%20Int%2C%20%24minAmountUsd%3A%20Int%2C%20%24startTime%3A%20Int%2C%20%24endTime%3A%20Int%2C%20%24txnHash%3A%20String%2C%20%24kappa%3A%20String%2C%20%24pending%3A%20Boolean%2C%20%24page%3A%20Int%2C%20%24tokenAddressFrom%3A%20%5BString%5D%2C%20%24tokenAddressTo%3A%20%5BString%5D%2C%20%24useMv%3A%20Boolean)%20%7B%0A%20%20bridgeTransactions(%0A%20%20%20%20chainIDFrom%3A%20%24chainIDFrom%0A%20%20%20%20chainIDTo%3A%20%24chainIDTo%0A%20%20%20%20addressFrom%3A%20%24addressFrom%0A%20%20%20%20addressTo%3A%20%24addressTo%0A%20%20%20%20maxAmount%3A%20%24maxAmount%0A%20%20%20%20minAmount%3A%20%24minAmount%0A%20%20%20%20maxAmountUsd%3A%20%24maxAmountUsd%0A%20%20%20%20minAmountUsd%3A%20%24minAmountUsd%0A%20%20%20%20startTime%3A%20%24startTime%0A%20%20%20%20endTime%3A%20%24endTime%0A%20%20%20%20txnHash%3A%20%24txnHash%0A%20%20%20%20kappa%3A%20%24kappa%0A%20%20%20%20pending%3A%20%24pending%0A%20%20%20%20page%3A%20%24page%0A%20%20%20%20useMv%3A%20%24useMv%0A%20%20%20%20tokenAddressFrom%3A%20%24tokenAddressFrom%0A%20%20%20%20tokenAddressTo%3A%20%24tokenAddressTo%0A%20%20)%20%7B%0A%20%20%20%20...TransactionInfo%0A%20%20%20%20__typename%0A%20%20%7D%0A%7D%0A%0Afragment%20TransactionInfo%20on%20BridgeTransaction%20%7B%0A%20%20fromInfo%20%7B%0A%20%20%20%20...SingleSideInfo%0A%20%20%20%20__typename%0A%20%20%7D%0A%20%20toInfo%20%7B%0A%20%20%20%20...SingleSideInfo%0A%20%20%20%20__typename%0A%20%20%7D%0A%20%20kappa%0A%20%20pending%0A%20%20swapSuccess%0A%20%20__typename%0A%7D%0A%0Afragment%20SingleSideInfo%20on%20PartialInfo%20%7B%0A%20%20chainID%0A%20%20destinationChainID%0A%20%20address%0A%20%20hash%3A%20txnHash%0A%20%20value%0A%20%20formattedValue%0A%20%20tokenAddress%0A%20%20tokenSymbol%0A%20%20time%0A%20%20__typename%0A%7D&operationName=GetBridgeTransactionsQuery&variables=%7B%0A%20%20%22page%22%3A%201%2C%0A%20%20%22useMv%22%3A%20true%2C%0A%20%20%22txnHash%22%3A%20%22${l1TxHash}%22%0A%7D`)
      console.log(resdata.data.data.bridgeTransactions[0])
      const bridgingData = resdata.data.data.bridgeTransactions[0]
      if (bridgingData) {
        if (bridgingData.pending) {
          return { status: 'UNCONFIRMED_L1_TO_L2_MESSAGE', l2TxHash: null }
        } else {
          return { status: 'RELAYED', l2TxHash: bridgingData.toInfo.hash }
        }
      } else {
        return { status: 'NOT_FOUND', l2TxHash: null }
      }
    } catch (error) {
      console.log(error)
      return { status: 'NOT_FOUND', l2TxHash: null }
    }
  }
}

const getDirectOnchainSynapseBridgeStatus = async (l1TxHash, l1ChainId, l2ChainId, l1Provider, l2Provider, tid = UNKNOWN_TID) => {
  try {
    console.log('Getting Tx Status Using Falback Method(SDK)')
    const chainIds = [l1ChainId, l2ChainId]
    const providers = [l1Provider, l2Provider]
    const synapseSDK = new SynapseSDK(chainIds, providers)
    const synapseTxId = await synapseSDK.getSynapseTxId(
      // Chain ID of the ORIGIN chain
      l1ChainId,
      'SynapseBridge',
      // Transaction hash of the bridge transaction on the origin chain
      l1TxHash
    )

    // console.log(synapseTxId)

    const status = await synapseSDK.getBridgeTxStatus(
      // Chain ID of the DESTINATION chain
      l2ChainId,
      'SynapseBridge',
      synapseTxId
    )

    if (status) {
      const txHash = await findSynapseBridgeEvent(l2ChainId, l2Provider, synapseTxId)
      if (!txHash) {
        return { status: 'RELAYED_BUT_TXHASH_NOT_FOUND', l2TxHash: null }
      }
      return { status: 'RELAYED', l2TxHash: txHash }
    } else {
      return { status: 'UNCONFIRMED_L1_TO_L2_MESSAGE', l2TxHash: null }
    }
  } catch (error) {
    logger.error(error.message, {
      err: error
    })
    return { status: 'NOT_FOUND', l2TxHash: null }
  }
}

module.exports = {
  getL2TransactionInfo
}

// getSynapseBridgingStatus('0x9f696c95408a1e485f6c2e8b52b99492991412597679db202c2464591e09d2bc', '43114').then((data) => {
//   console.log(data)
// })

// getSynapseBridgingStatus('0x5667483e9fd341b95c622861b80352fa94d820ca3cc14c83c330cad59e9e8d53', '43114').then((data) => {
//   console.log(data)
// })

// getL2TransactionInfo('1a01d245-cde4-49bc-b0c2-ccafde1d5da8', '3096ecf6-859a-49cc-bcbd-cd3eb25b834c', '0x00056c36d0a924c5a28ce8ef568fde4b367451c03c9a88ed4e803b1cdb3fa477', '1692965019260477').then((data) => console.log(data))
