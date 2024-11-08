const express = require('express')
const router = express.Router()
const responseUtils = require('../utils/responseUtils')
const Sentry = require('@sentry/node')
const logger = require('../utils/logger')
const { getL2TransactionInfo } = require('./index')
const {UNKNOWN_TID} = require("../utils/constants");

router.post('/info/l2', async (req, res) => {
  const tid = req.headers.tid ?? UNKNOWN_TID
  try {
    logger.debug(`Request for L2 Transaction Status Info, Body: ${JSON.stringify(req.body)}`, ({
      tid: tid
    }))

    const { l1ChainDetailId, l2ChainDetailId, l1TxHash, bridgeId, bridgeType } = req.body
    // eslint-disable-next-line camelcase
    const l2Info = await getL2TransactionInfo(l1ChainDetailId, l2ChainDetailId, l1TxHash, bridgeId, bridgeType, tid)

    return responseUtils.successResponse(res, 'L2 Transaction Info', l2Info)
  } catch (error) {
    logger.error(`error: ${error}`, ({
      tid: tid,
      error: error
    }))
    Sentry.captureException(error)
    return responseUtils.serverErrorResponse(res, error)
  }
})

module.exports = router
