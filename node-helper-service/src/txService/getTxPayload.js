const ethers = require('ethers')
const { getEvmProvider } = require('../web3Helper/getProvider')
const txPayloadHandler = require('./txPayloadHandler')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')
const BigNumber = require('bignumber.js')
const { pushStringToRedisWithKey, getStringKey } = require('../DataLayer/redis/redis')

const createTxPayload = async (contractAbi, contractAddress, functionName, txData, chainDetailId, isNativeTx, permitData, tid = UNKNOWN_TID, gasCostRedisKey) => {
  const provider = await getEvmProvider(chainDetailId)
  const contractInterface = new ethers.utils.Interface(contractAbi)
  const contract = new ethers.Contract(contractAddress, contractAbi, provider)

  // Tx Nonce For Singulairty Signatures
  const [{ chainId }, userTxNonce] = await Promise.all([provider.getNetwork(), contract.getUserCurrentTxNonce(txData.sender)])

  let value = 0
  if (isNativeTx) {
    value = (txData.directTransferRequestData && txData.directTransferRequestData.amount) ||
    (txData.swapRequestData && Number(txData.swapRequestData.routeId) !== 0 && txData.swapRequestData.inAmount) ||
    (txData.bridgeRequestData && Number(txData.bridgeRequestData.routeId) !== 0 && txData.bridgeRequestData.amount) ||
    (txData.nftMarketplaceTradeRequestData && txData.nftMarketplaceTradeRequestData.price) ||
    (txData.nftMarketplaceBulkTradeRequestData && txData.nftMarketplaceBulkTradeRequestData.aggregatedTotalPrice)
    // Add S9Y Fee
    value = (BigInt(value) + BigInt(txData.s9yData.s9yFee)).toString()
    console.log(value)
  }

  const params = await getTxParams(functionName, txData, userTxNonce, chainId, contractAddress, permitData)
  logger.debug(`Tx Params for ${functionName} are ${JSON.stringify(params)}`, ({
    tid
  }))
  const data = contractInterface.encodeFunctionData(functionName, params)

  const txObject = {
    from: txData.paymentAddress,
    to: contractAddress,
    data,
    value
  }

  if (txData.bridgeRequestData && Number(txData.bridgeRequestData.routeId) !== 0) {
    txObject.gasLimit = 5000000
  }

  if (!gasCostRedisKey) {
    gasCostRedisKey = `${chainDetailId}${txData.directTransferRequestData && txData.directTransferRequestData.amount != 0 ? '-DIRECT' : ''}${txData.swapRequestData && txData.swapRequestData.routeId != 0 ? '-SWAP' : ''}${txData.bridgeRequestData && txData.bridgeRequestData.routeId != 0 ? '-BRIDGE' : ''}${txData.nftMarketplaceTradeRequestData && txData.nftMarketplaceTradeRequestData.routeId != 0 ? '-NFT_TRADE' : ''}`
  }

  try {
    const gas = await provider.estimateGas(txObject)
    txObject.gasLimit = gas.toNumber().toString()
    logger.debug(`Estimated Gas for ${functionName} is ${gas}`, ({
      tid
    }))
    const storedGasValue = await getStringKey(gasCostRedisKey)
    if (storedGasValue && Number(storedGasValue) < Number(txObject.gasLimit)) {
      pushStringToRedisWithKey(gasCostRedisKey, txObject.gasLimit)
    }
  } catch (e) {
    logger.error(`Error while estimating gas for ${functionName} tx: ${e.message}`, {
      tid, err: e
    })

    if (!txObject.gasLimit) {
      txObject.gasLimit = await getStringKey(gasCostRedisKey) || BigNumber(5000000).toString()
    }
  }

  logger.debug(`Generated Tx Object for ${functionName} is ${JSON.stringify(txObject)}`, ({
    tid
  }))
  return txObject
}

const getTxParams = async (functionName, txData, userTxNonce, chainId, contractAddress, permitData) => {
  switch (functionName) {
    
    case 'swapBridgeTransfer': return txPayloadHandler.swapBridgeTransferHandler(txData, userTxNonce, chainId, contractAddress, permitData)

    case 'directTokenTransferWithTokenExchange' : return txPayloadHandler.directTokenTransferWithTokenExchangeHandler(txData, userTxNonce, chainId, contractAddress, permitData)
    case 'directNativeTransferWithTokenExchange': return txPayloadHandler.directNativeTransferWithTokenExchangeHandler(txData, userTxNonce, chainId, contractAddress, permitData)

    case 'directTokenTransferWithNftExchange' : return txPayloadHandler.directTokenTransferWithNftExchangeHandler(txData, userTxNonce, chainId, contractAddress, permitData)
    case 'directNativeTransferWithNftExchange' : return txPayloadHandler.directNativeTransferWithNftExchangeHandler(txData, userTxNonce, chainId, contractAddress, permitData)

    case 'swapTokenPaymentWithTokenExchange' : return txPayloadHandler.swapTokenPaymentWithTokenExchangeHandler(txData, userTxNonce, chainId, contractAddress, permitData)
    default: throw new Error(`Unknown transaction type: ${functionName}`)
  }
}

module.exports = {
  createTxPayload
}
