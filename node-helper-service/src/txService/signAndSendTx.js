const { getEvmProvider } = require('../web3Helper/getProvider')
const { createTxPayload } = require('./getTxPayload')
const createTx = require('../web3Helper/createTx')
const { UNKNOWN_TID } = require('../utils/constants')
const { sendSlackAlert } = require('../utils/slackBot')
const { releaseLock } = require('../utils/distributedLock')
const { updateNonce } = require('../web3Helper/nonceManager')
const { getStringKey } = require('../DataLayer/redis/redis')
const logger = require('../utils/logger')
const { checkSequenceMarketRequestIdValid } = require('./sequenceMarketCheck')
const args = process.argv
// eslint-disable-next-line camelcase
const signAndSendTx = async (contractAbi, contractAddress, functionName, txData, chainDetailId, isNativeTx, permitData, tid = UNKNOWN_TID) => {
  const isPayThroughContractEnabled = await getStringKey('isPayThroughContractEnabled') || false
  const payThroughContractEnabledChains = (await getStringKey('payThroughContractEnabledChains') || '').split(',')

  logger.info('signAndSendGrpc.timing signAndSendTx time 1 : ' + (Date.now()), ({
    tid
  }))

  // Check if all the security checks are passed for payingThroughContract
  if (isPayThroughContractEnabled != 'true' || !payThroughContractEnabledChains.includes(chainDetailId) || (functionName != 'swapTradeNftMarketplace' && functionName != 'swapBulkTradeNftMarketplace')) {
    logger.info('Conditions Failed', {
      tid,
      info: {
        isPayThroughContractEnabled,
        payThroughContractEnabledChains,
        payThroughContractNotEnabled: isPayThroughContractEnabled !== 'true',
        payThroughContractNotEnabledChains: !payThroughContractEnabledChains.includes(chainDetailId),
        functionNameInNotSupported: functionName != 'swapTradeNftMarketplace' && functionName != 'swapBulkTradeNftMarketplace'
      }
    })
    txData.s9yData.payThroughContract = false // set pay through contract to false if any of the security checks fail
  }

  const gasCostRedisKey = `${chainDetailId}${txData.directTransferRequestData && txData.directTransferRequestData.amount != 0 ? '-DIRECT' : ''}${txData.swapRequestData && txData.swapRequestData.routeId != 0 ? '-SWAP' : ''}${txData.bridgeRequestData && txData.bridgeRequestData.routeId != 0 ? '-BRIDGE' : ''}${txData.nftMarketplaceTradeRequestData && txData.nftMarketplaceTradeRequestData.routeId != 0 ? '-NFT_TRADE' : ''}`

  const [provider, txObject] = await Promise.all([getEvmProvider(chainDetailId), createTxPayload(contractAbi, contractAddress, functionName, txData, chainDetailId, isNativeTx, permitData, tid, gasCostRedisKey)])
  logger.info('signAndSendGrpc.timing signAndSendTx time 2 : ' + (Date.now()), ({
    tid
  }))
  const { chainId, name: networkName } = await provider.getNetwork()
  let redLock
  let keyLock
  try {
    if (txData.s9yData.payThroughContract && chainId != 248) txObject.value = '0' // If Pay Through Contract is true set the value to 0 before sending tx
    logger.info('signAndSendGrpc.timing signAndSendTx time 3 : ' + (Date.now()), ({
      tid
    }))
    const { tx, lockKey, nonce, adminAddress, lock } = await createTx(txObject, provider, chainId, tid, gasCostRedisKey)
    logger.info('signAndSendGrpc.timing signAndSendTx time 4 : ' + (Date.now()), ({
      tid
    }))
    redLock = lock
    keyLock = lockKey
    const sentTx = await provider.sendTransaction(tx)
    logger.info('signAndSendGrpc.timing signAndSendTx time 5 : ' + (Date.now()), ({
      tid
    }))
    await updateNonce(provider, chainId, adminAddress, nonce + 1)
    logger.info('signAndSendGrpc.timing signAndSendTx time 6 : ' + (Date.now()), ({
      tid
    }))
    await releaseLock(lockKey, redLock)
    logger.info('signAndSendGrpc.timing signAndSendTx time 7 : ' + (Date.now()), ({
      tid
    }))
    return sentTx.hash
  } catch (err) {
    if (redLock) {
      logger.info('signAndSendGrpc.timing signAndSendTx time 8 : ' + (Date.now()), ({
        tid
      }))
      await releaseLock(keyLock, redLock)
      logger.info('signAndSendGrpc.timing signAndSendTx time 9 : ' + (Date.now()), ({
        tid
      }))
    }
    if (err.toString().includes('insufficient funds') || err?.err?.code === 'INSUFFICIENT_FUNDS') {
      sendSlackAlert(`Insufficient Funds Alert: (A Transaction Failed)\nNetwork Name: ${networkName}\nChainId: ${chainId}\nPlease Fill the Admin Wallet Account urgently so that the transactions can be processed\nEnvironment: ${args[2].toUpperCase()}`)
    } else {
      if (chainId === 19011) {
        try {
          logger.info('signAndSendGrpc.timing signAndSendTx time 10 : ' + (Date.now()), ({
            tid
          }))
          const extraData = JSON.parse(txData.nftMarketplaceTradeRequestData.data)
          const parsedMarketplaceData = JSON.parse(extraData.marketplaceData)
          const requestId = JSON.parse(parsedMarketplaceData).requestId
          console.log(`Checking Sequence Request Id ${requestId} valid`)
          const isValid = await checkSequenceMarketRequestIdValid(requestId, txData.nftMarketplaceTradeRequestData.amount, provider)
          logger.info('signAndSendGrpc.timing signAndSendTx time 11 : ' + (Date.now()), ({
            tid
          }))
          console.log('Is RequestId Valid: ' + isValid.valid)
          if (!isValid.valid) { sendSlackAlert(`Invalid Unbisoft/Sequence Market RequestId Alert for TxId = ${txData.s9yData.txId}: (A Transaction Failed)\nNetwork Name: ${networkName}\nChainId: ${chainId}\nThis is probably due to NFT already sold/ Race Condition! \nEnvironment: ${args[2].toUpperCase()}`, 'failed-transactions-alert') }
        } catch (err) {
          console.log('Ignore this Error:: Error checking Request Id: ' + err.message)
        }
      }
    }

    throw err
  }
}

module.exports = {
  signAndSendTx
}
