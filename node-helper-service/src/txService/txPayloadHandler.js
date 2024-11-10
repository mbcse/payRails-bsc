const { defaultAbiCoder } = require('ethers/lib/utils')
const { getAdminSignature } = require('../signatures/typedDataSigner')
const { getApprovalDataStruct, getBridgeDataStruct, getS9yDataStruct, getSwapDataStruct, getNftMarketplaceTradeDataStruct, getApprovalDataStructOld, getSwapDataStructOld, getS9yDataStructOld, getNftMarketplaceBulkTradeDataStruct } = require('./structGenerator')
const { getStringKey } = require('../DataLayer/redis/redis')

const directTokenTransferHandler = async (txData, userTxNonce, chainId, contractAddress, permitData) => {
  const approvalDataStruct = await getApprovalDataStruct(permitData)
  const s9yDataStruct = await getS9yDataStruct(txData.s9yData, '0x')
  return [txData.sender, txData.paymentAddress, txData.directTransferRequestData.receiver, txData.directTransferRequestData.amount, txData.directTransferRequestData.assetAddress, approvalDataStruct, s9yDataStruct]
}

const directNativeTransferHandler = async (txData, userTxNonce, chainId, contractAddress, permitData) => {
  const s9yDataStruct = await getS9yDataStruct(txData.s9yData, '0x')
  return [txData.sender, txData.paymentAddress, txData.directTransferRequestData.receiver, txData.directTransferRequestData.amount, s9yDataStruct]
}

const swapBridgeTransferHandler = async (txData, userTxNonce, chainId, contractAddress, permitData) => {
  const approvalDataStruct = chainId != 248 ? await getApprovalDataStruct(permitData) : await getApprovalDataStructOld(permitData)
  const swapRequestDataStruct = chainId != 248 ? await getSwapDataStruct(txData.swapRequestData) : await getSwapDataStructOld(txData.swapRequestData)
  const bridgeRequestDataStruct = await getBridgeDataStruct(txData.bridgeRequestData)

  if (!txData.s9yData.feeRecipientAddress) txData.s9yData.feeRecipientAddress = '0x0000000000000000000000000000000000000000'

  const adminSignature = await getAdminSignature('swapBridgeTransfer', { ...txData, bridgeRequestData: { ...txData.bridgeRequestData, data: bridgeRequestDataStruct[bridgeRequestDataStruct.length - 1] }, swapRequestData: { ...txData.swapRequestData, data: swapRequestDataStruct[swapRequestDataStruct.length - 1] }, paymentAssetAddress: '0x0000000000000000000000000000000000000000' }, userTxNonce, chainId, contractAddress)

  const s9yDataStruct = chainId != 248 ? await getS9yDataStruct(txData.s9yData, adminSignature) : await getS9yDataStructOld(txData.s9yData, adminSignature)

  return [txData.sender, txData.paymentAddress, userTxNonce, swapRequestDataStruct, bridgeRequestDataStruct, approvalDataStruct, s9yDataStruct]
}

const swapTradeNftMarketplaceHandler = async (txData, userTxNonce, chainId, contractAddress, permitData) => {
  const approvalDataStruct = await getApprovalDataStruct(permitData)
  const swapRequestDataStruct = await getSwapDataStruct(txData.swapRequestData)
  const nftMarketplaceTradeRequestDataStruct = await getNftMarketplaceTradeDataStruct(txData.nftMarketplaceTradeRequestData)

  if (!txData.s9yData.feeRecipientAddress) txData.s9yData.feeRecipientAddress = '0x0000000000000000000000000000000000000000'

  const adminSignature = await getAdminSignature('swapTradeNftMarketplace', { ...txData, nftMarketplaceTradeRequestData: { ...txData.nftMarketplaceTradeRequestData, data: nftMarketplaceTradeRequestDataStruct[nftMarketplaceTradeRequestDataStruct.length - 1] }, swapRequestData: { ...txData.swapRequestData, data: swapRequestDataStruct[swapRequestDataStruct.length - 1] }, paymentAssetAddress: '0x0000000000000000000000000000000000000000' }, userTxNonce, chainId, contractAddress)

  const s9yDataStruct = chainId != 248 ? await getS9yDataStruct(txData.s9yData, adminSignature) : await getS9yDataStructOld(txData.s9yData, adminSignature)

  return [txData.sender, txData.paymentAddress, userTxNonce, swapRequestDataStruct, nftMarketplaceTradeRequestDataStruct, approvalDataStruct, s9yDataStruct]
}




module.exports = {
  directNativeTransferHandler,
  directTokenTransferHandler,
  swapBridgeTransferHandler,

  swapTradeNftMarketplaceHandler,
}
