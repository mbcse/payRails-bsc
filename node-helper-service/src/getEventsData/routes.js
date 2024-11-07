const express = require('express')
const router = express.Router()
const responseUtils = require('../utils/responseUtils')

const { getTxEvents } = require('./getTxEvents')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')

router.post('/txevents', async (req, res) => {
  try {
    const { chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType } = req.body
    const txEvents = await getTxEvents(chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType)
    return responseUtils.successResponse(res, '', txEvents)
  } catch (err) {
    const tid = req.headers.tid ?? UNKNOWN_TID
    logger.error(`err: ${err}`, ({
      tid,
      err
    }))
    return responseUtils.serverErrorResponse(res, err)
  }
})

module.exports = router
