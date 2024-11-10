const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const { getSmartContractDetails } = require('../DataLayer/database/database')
const { createTxPayload } = require('./getTxPayload')
const { signAndSendTx } = require('./signAndSendTx')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')
const { sendAndExecuteTx } = require('./sendAndExecute')

async function getPayloadGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)

  try {
    logger.debug(`Request For Get Payload with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { functionName, chainDetailId, contractName, txData, isNativeTx, userAddress, permitData } = data
    // eslint-disable-next-line camelcase
    const { contract_address, abi } = await getSmartContractDetails(contractName, chainDetailId)
    const txObject = await createTxPayload(abi, contract_address, functionName, txData, chainDetailId, isNativeTx, permitData, tid)
    txObject.from = userAddress

    grpcSuccessResponse(callback, `${functionName} Payload`, txObject, tid, requestId)

    // responseUtils.successResponse(res, `${functionName} Payload`, txObject)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

async function signAndSendGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)
  const st = Date.now()
  logger.info('signAndSendGrpc.timing start : ' + st, ({
    tid
  }))
  try {
    logger.debug(`Request For SignAndSend with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { functionName, chainDetailId, txData, contractName, isNativeTx, permitData } = data
    // eslint-disable-next-line camelcase
    const { contract_address, abi } = await getSmartContractDetails(contractName, chainDetailId)
    const getSmartContractDetailsTime = Date.now()
    logger.info('signAndSendGrpc.timing getSmartContractDetails time : ' + (getSmartContractDetailsTime - st), ({
      tid
    }))
    const txHash = await signAndSendTx(abi, contract_address, functionName, txData, chainDetailId, isNativeTx, permitData, tid)
    logger.info('signAndSendGrpc.timing signAndSendTx time : ' + (Date.now() - getSmartContractDetailsTime), ({
      tid
    }))

    const et = Date.now()
    logger.info('signAndSendGrpc.timing end : ' + (et - st), ({
      tid
    }))
    grpcSuccessResponse(callback, `${functionName} Tx Hash`, { txHash }, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

async function sendAndExecuteGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)

  try {
    logger.debug(`Request For SendAndExecute Tx with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { sender, paymentAddress, signedTx, nonce, chainDetailId } = data
    // eslint-disable-next-line camelcase
    const txHash = await sendAndExecuteTx(sender, paymentAddress, chainDetailId, signedTx, nonce, tid)
    grpcSuccessResponse(callback, 'Send And Execute Tx Hash', { txHash }, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {
  getPayloadGrpc,

  signAndSendGrpc,
  sendAndExecuteGrpc
}
