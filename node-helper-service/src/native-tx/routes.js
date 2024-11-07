const express = require('express')
const router = express.Router()
const responseUtils = require('../utils/responseUtils')
const { createNativeTxPayload } = require('./index')
const { getSmartContractDetails } = require('../DataLayer/database/database')

router.post('/payload', async (req, res) => {
  try {
    const { userAddress, functionName, chainDetailId, txData, contractName } = req.body
    // eslint-disable-next-line camelcase
    const { contract_address, abi } = await getSmartContractDetails(contractName, chainDetailId)
    const txObject = await createNativeTxPayload(abi, contract_address, functionName, txData, chainDetailId, userAddress)
    responseUtils.successResponse(res, `${functionName} Payload`, txObject)
  } catch (err) {
    console.log(err)
    return null
  }
})

module.exports = router
