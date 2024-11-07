const { grpcSuccessResponse, grpcServerErrorResponse } = require('../utils/responseUtils')
const { getApprovalPayload } = require('./getApprovalPayload')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')

async function getApprovalPayloadGrpc (call, callback) {
  const { tid = UNKNOWN_TID, data, requestId } = JSON.parse(call.request.text)
  try {
    logger.debug(`Request For Approval payload with Body: ${JSON.stringify(data)}`, ({
      tid
    }))
    const { owner, spender, amount, tokenAddress, chainDetailsId, approvalType, deadline } = data
    const payload = await getApprovalPayload(owner, spender, amount, tokenAddress, chainDetailsId, approvalType, deadline)
    grpcSuccessResponse(callback, `${approvalType} Payload`, payload, tid, requestId)
  } catch (err) {
    logger.error(`${err.message}`, ({
      tid,
      err
    }))
    grpcServerErrorResponse(callback, err, {}, tid, requestId)
  }
}

module.exports = {

  getApprovalPayloadGrpc

}
