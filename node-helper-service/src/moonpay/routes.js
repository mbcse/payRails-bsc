const HTTP_STATUS_CODES = require('../utils/responseUtils/HTTP_STATUS_CODE')
const { getMoonPaySecret } = require('../Connections/connections')

const express = require('express')
const router = express.Router()


router.post('/moonpay_signature', async (req, res) => {
  try {
    const { urlForSignature } = req.body
    const { MoonPay } = await import('@moonpay/moonpay-node')
    const moonPaySecret = await getMoonPaySecret()
    const moonPay = new MoonPay(moonPaySecret)
    const signature = moonPay.url.generateSignature(urlForSignature)
    res.status(HTTP_STATUS_CODES.OK).send({ signature })
  } catch (e) {
    res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send({ signature: '' })
  }
})

module.exports = router
