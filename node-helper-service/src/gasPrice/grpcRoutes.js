const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const { getChainGasPriceHandler } = require('./getGasPrice')
const { UNKNOWN_TID } = require('../utils/constants')
const logger = require('../utils/logger')

async function getChainGasPriceGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)

  try {
    const gasPrice = await getChainGasPriceHandler(data.chainDetailsId)

    grpcSuccessResponse(callback, 'Gas Price', { gasPrice }, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {

  getChainGasPriceGrpc
}
