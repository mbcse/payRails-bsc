const express = require('express')
const router = express.Router()
const { decodeEventData } = require('./index')
const responseUtils = require('../utils/responseUtils')
const Sentry = require('@sentry/node')

router.post('/decode', async (req, res) => {
  try {
    const { data, topics, abi } = req.body
    const decodedEventData = await decodeEventData(abi, { data, topics })
    return responseUtils.successResponse(res, 'Decoded Event Data', decodedEventData)
  } catch (error) {
    Sentry.captureException(error)
    return responseUtils.serverErrorResponse(res, error)
  }
})

module.exports = router
