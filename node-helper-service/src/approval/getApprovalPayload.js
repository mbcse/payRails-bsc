const { getNativeApprovalPayload, getDaiPermitPayload, getERC2612PermitPayload, getERC2612PermitPayloadWithChainId } = require('./approvalPayloadHandler')

const getApprovalPayload = async (owner, spender, amount, tokenAddress, chainDetailsId, approvalType, deadline) => {
  switch (approvalType) {
    case 'NATIVE_APPROVAL' : return getNativeApprovalPayload(owner, spender, amount, tokenAddress)
    case 'PERMIT' : return getERC2612PermitPayload(owner, spender, amount, tokenAddress, chainDetailsId, deadline)
    case 'PERMIT_DAI' : return getDaiPermitPayload(owner, spender, tokenAddress, chainDetailsId, deadline)
    case 'PERMIT_CHAINID' : return getERC2612PermitPayloadWithChainId(owner, spender, amount, tokenAddress, chainDetailsId, deadline)
    default : throw new Error(`Unknown ApprovalType ${approvalType}`)
  }
}

module.exports = { getApprovalPayload }
