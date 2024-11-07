const { decodeEventData } = require('./index')
const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const Sentry = require('@sentry/node')
const { UNKNOWN_TID } = require('../utils/constants')
const logger = require('../utils/logger')

async function decodeDataGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data: mainDataObject, requestId } = JSON.parse(call.request.text)

  try {
    const { data, topics, abi } = mainDataObject
    const decodedEventData = await decodeEventData(abi, { data, topics })
    grpcSuccessResponse(callback, 'Decoded Event Data', decodedEventData, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {

  decodeDataGrpc

}
