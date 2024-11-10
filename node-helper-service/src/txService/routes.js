const express = require('express')
const router = express.Router()
const responseUtils = require('../utils/responseUtils')
const { getSmartContractDetails } = require('../DataLayer/database/database')
const { createTxPayload } = require('./getTxPayload')
const { signAndSendTx } = require('./signAndSendTx')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')

router.post('/getpayload', async (req, res) => {
  try {
    const tid = req.headers.tid ?? UNKNOWN_TID
    logger.debug(`Request For Get Payload with Body: ${JSON.stringify(req.body)}`, ({
      tid
    }))
    const { functionName, chainDetailId, contractName, txData, isNativeTx, userAddress, permitData } = req.body
    // eslint-disable-next-line camelcase
    const { contract_address, abi } = await getSmartContractDetails(contractName, chainDetailId)
    const txObject = await createTxPayload(abi, contract_address, functionName, txData, chainDetailId, isNativeTx, permitData, tid)
    txObject.from = userAddress
    responseUtils.successResponse(res, `${functionName} Payload`, txObject)
  } catch (err) {
    logger.error(`err: ${err}`, ({
      tid: req.headers.tid ?? UNKNOWN_TID
    }))
    return responseUtils.serverErrorResponse(res, err)
  }
})

router.post('/signandsend', async (req, res) => {
  try {
    const tid = req.headers.tid ?? UNKNOWN_TID
    logger.debug(`Request For SignAndSend with Body: ${JSON.stringify(req.body)}`, ({
      tid
    }))
    const { functionName, chainDetailId, txData, contractName, isNativeTx, permitData } = req.body
    // eslint-disable-next-line camelcase
    const { contract_address, abi } = await getSmartContractDetails(contractName, chainDetailId)
    const txHash = await signAndSendTx(abi, contract_address, functionName, txData, chainDetailId, isNativeTx, permitData, tid)
    responseUtils.successResponse(res, `${functionName} Tx Hash`, { txHash })
  } catch (err) {
    const tid = req.headers.tid ?? UNKNOWN_TID
    logger.error(`err: ${err}`, ({
      tid,
      err
    }))
    if (err.toString().includes('insufficient funds') || err?.err?.code === 'INSUFFICIENT_FUNDS') {
      return responseUtils.serverErrorResponse(res, 'INSUFFICIENT_FUNDS')
    }
    return responseUtils.serverErrorResponse(res, err)
  }
})

module.exports = router
