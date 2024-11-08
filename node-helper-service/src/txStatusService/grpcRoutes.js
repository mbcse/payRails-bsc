const { getL2TransactionInfo } = require('./index')
const { UNKNOWN_TID } = require('../utils/constants')
const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const Sentry = require('@sentry/node')
const logger = require('../utils/logger')

async function getL2HashGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)

  try {
    logger.debug(`Request for L2 Transaction Status Info, Body: ${JSON.stringify(data)}`, ({
      tid
    }))

    const { l1ChainDetailId, l2ChainDetailId, l1TxHash, bridgeId, bridgeType } = data
    // eslint-disable-next-line camelcase
    const l2Info = await getL2TransactionInfo(l1ChainDetailId, l2ChainDetailId, l1TxHash, bridgeId, bridgeType, tid)

    grpcSuccessResponse(callback, 'L2 Transaction Info', l2Info, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {
  getL2HashGrpc
}
