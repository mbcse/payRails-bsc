const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const { UNKNOWN_TID } = require('../utils/constants')
const logger = require('../utils/logger')
const { getTxExecutedAmounts, getTxEvents } = require('./getTxEvents')

async function getTxEventsGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)
  try {
    logger.debug(`Request For Get Amount with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType } = data
    const txEvents = await getTxEvents(chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType)
    grpcSuccessResponse(callback, 'Tx Events Data', txEvents, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

async function getTxExecutedAmountsGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)
  try {
    console.log('Text', call.request)
    logger.debug(`Request For Get Amount with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType } = data
    const amounts = await getTxExecutedAmounts(chainDetailsId1, txnHash1, chainDetailsId2, txnHash2, bridgeType)
    grpcSuccessResponse(callback, 'Executed Amounts', amounts, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {
  getTxEventsGrpc,
  getTxExecutedAmountsGrpc
}
