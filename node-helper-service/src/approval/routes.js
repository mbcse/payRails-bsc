const express = require('express')
const router = express.Router()
const responseUtils = require('../utils/responseUtils')
const { getApprovalPayload } = require('./getApprovalPayload')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')

router.post('/payload', async (req, res) => {
  try {
    logger.debug(`Request For Approval payload with Body: ${JSON.stringify(req.body)}`, ({
      tid: req.headers.tid ?? UNKNOWN_TID
    }))
    const { owner, spender, amount, tokenAddress, chainDetailsId, approvalType, deadline } = req.body
    const payload = await getApprovalPayload(owner, spender, amount, tokenAddress, chainDetailsId, approvalType, deadline)
    responseUtils.successResponse(res, `${approvalType} Payload`, payload)
  } catch (error) {
    logger.error(`error: ${error}`, ({
      tid: req.headers.tid ?? UNKNOWN_TID,
      error
    }))
    return responseUtils.serverErrorResponse(res, error)
  }
})

module.exports = router
