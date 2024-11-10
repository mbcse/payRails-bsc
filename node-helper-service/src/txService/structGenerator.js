const { encodeExtraData } = require('./dataEncoderService')
const { splitSignatureToRSV } = require('../web3Helper/signatureUtils')
const { defaultAbiCoder } = require('ethers/lib/utils')

const getApprovalDataStruct = async (permitData) => {
  const { r, s, v } = await splitSignatureToRSV(permitData?.signature)
  const approvalDataStruct = [permitData.deadline || '0', r, s, v, permitData.nonce || '0', permitData.approvalType, permitData.permitAmount || 0]
  return approvalDataStruct
}

const getSwapDataStruct = async (swapRequestData) => {
  let swapRequestDataStruct, swapExtraData

  if (swapRequestData === null) {
    swapExtraData = await encodeExtraData(null, null)
    swapRequestDataStruct = [0, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', 0, 0, 0, swapExtraData]
  } else {
    swapExtraData = await encodeExtraData(swapRequestData.data, swapRequestData.routeName, swapRequestData)
    const swapType = swapRequestData.swapType === 'EXACT_IN' ? 0 : 1
    swapRequestDataStruct = [swapRequestData.routeId, swapRequestData.receiver, swapRequestData.fromTokenAddress, swapRequestData.toTokenAddress, swapRequestData.inAmount, swapRequestData.outAmount, swapType, swapExtraData]
  }

  return swapRequestDataStruct
}
/*
*  For Short Time Backwad Compatibility to Oasys Chain
*/
const getApprovalDataStructOld = async (permitData) => {
  const { r, s, v } = await splitSignatureToRSV(permitData?.signature)
  const approvalDataStruct = [permitData.deadline || '0', r, s, v, permitData.nonce || '0', permitData.approvalType]
  return approvalDataStruct
}

const getSwapDataStructOld = async (swapRequestData) => {
  let swapRequestDataStruct, swapExtraData

  if (swapRequestData === null) {
    swapExtraData = await encodeExtraData(null, null)
    swapRequestDataStruct = [0, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', 0, 0, swapExtraData]
  } else {
    swapExtraData = await encodeExtraData(swapRequestData.data, swapRequestData.routeName, swapRequestData)
    swapRequestDataStruct = [swapRequestData.routeId, swapRequestData.receiver, swapRequestData.fromTokenAddress, swapRequestData.toTokenAddress, swapRequestData.inAmount, swapRequestData.outAmount, swapExtraData]
  }

  return swapRequestDataStruct
}

//* ***************************************************************** */

const getBridgeDataStruct = async (bridgeRequestData) => {
  let bridgeExtraData, bridgeRequestDataStruct
  if (bridgeRequestData === null) {
    bridgeExtraData = await encodeExtraData(null, null)
    bridgeRequestDataStruct = [0, '0x0000000000000000000000000000000000000000', 0, '0x0000000000000000000000000000000000000000', 0, bridgeExtraData]
  } else {
    // bridgeExtraData = defaultAbiCoder.encode(['uint32', 'address', 'bytes'], [70000, '0x7E07E15D2a87A24492740D16f5bdF58c16db0c4E', '0x'])
    bridgeExtraData = await encodeExtraData(bridgeRequestData.data, bridgeRequestData.routeName)
    bridgeRequestDataStruct = [bridgeRequestData.routeId, bridgeRequestData.receiver, bridgeRequestData.destChainId, bridgeRequestData.tokenAddress, bridgeRequestData.amount, bridgeExtraData]
  }
  return bridgeRequestDataStruct
}

const getS9yDataStruct = async (s9yData, adminSignature) => {
  if (!adminSignature) adminSignature = '0x'
  if (!s9yData.s9yFee) s9yData.s9yFee = 0
  if (!s9yData.subTxId || s9yData.subTxId === 'null') s9yData.subTxId = 0
  if (!s9yData.feeRecipientAddress) s9yData.feeRecipientAddress = '0x0000000000000000000000000000000000000000'
  const payThroughContract = s9yData.payThroughContract == true
  const s9yDataStruct = [s9yData.s9yFee, s9yData.subTxId, s9yData.txId, adminSignature, '0x', s9yData.feeRecipientAddress, payThroughContract]
  return s9yDataStruct
}

// For Oasys Backward Compatibility
const getS9yDataStructOld = async (s9yData, adminSignature) => {
  if (!adminSignature) adminSignature = '0x'
  if (!s9yData.s9yFee) s9yData.s9yFee = 0
  if (!s9yData.subTxId || s9yData.subTxId === 'null') s9yData.subTxId = 0
  if (!s9yData.feeRecipientAddress) s9yData.feeRecipientAddress = '0x0000000000000000000000000000000000000000'
  const s9yDataStruct = [s9yData.s9yFee, s9yData.subTxId, s9yData.txId, adminSignature, '0x', s9yData.feeRecipientAddress]
  return s9yDataStruct
}

const getNftMarketplaceTradeDataStruct = async (nftMarketplaceTradeRequestData) => {
  let nftMarketplaceTradeRequestDataStruct, nftMarketplaceTradeExtraData

  if (nftMarketplaceTradeRequestData === null) {
    nftMarketplaceTradeExtraData = await encodeExtraData(null, null)
    nftMarketplaceTradeRequestDataStruct = [0, '0x0000000000000000000000000000000000000000', 0, 0, '0x0000000000000000000000000000000000000000', 0, 0, '0x0000000000000000000000000000000000000000', 0, nftMarketplaceTradeExtraData]
  } else {
    nftMarketplaceTradeRequestData.tradeType = nftMarketplaceTradeRequestData.tradeType === 'BUY' ? 1 : 2
    nftMarketplaceTradeRequestData.nftType = nftMarketplaceTradeRequestData.nftType === 'ERC721' ? 1 : 2
    const reqData = JSON.parse(nftMarketplaceTradeRequestData.data)
    reqData.nftPurchaseAmount = nftMarketplaceTradeRequestData.amount
    nftMarketplaceTradeRequestData.data = JSON.stringify(reqData)

    nftMarketplaceTradeExtraData = await encodeExtraData(nftMarketplaceTradeRequestData.data, nftMarketplaceTradeRequestData.routeName)
    nftMarketplaceTradeRequestDataStruct = [nftMarketplaceTradeRequestData.routeId, nftMarketplaceTradeRequestData.receiver, nftMarketplaceTradeRequestData.tradeType, nftMarketplaceTradeRequestData.nftType, nftMarketplaceTradeRequestData.nftAddress, nftMarketplaceTradeRequestData.nftId, nftMarketplaceTradeRequestData.amount, nftMarketplaceTradeRequestData.paymentTokenAddress, nftMarketplaceTradeRequestData.price, nftMarketplaceTradeExtraData]
  }

  return nftMarketplaceTradeRequestDataStruct
}

const getNftMarketplaceBulkTradeDataStruct = async (nftMarketplaceBulkTradeRequestData) => {
  let nftMarketplaceBulkTradeRequestDataStruct, nftMarketplaceTradeExtraData

  if (nftMarketplaceBulkTradeRequestData === null) {
    nftMarketplaceTradeExtraData = await encodeExtraData(null, null)
    nftMarketplaceBulkTradeRequestDataStruct = [0,
      '0x0000000000000000000000000000000000000000',
      0,
      [],
      '0x0000000000000000000000000000000000000000',
      0,
      false,
      nftMarketplaceTradeExtraData]
  } else {
    nftMarketplaceBulkTradeRequestData.tradeType = nftMarketplaceBulkTradeRequestData.tradeType === 'BUY' ? 1 : 2

    const nftsDataArr = []
    for (let i = 0; i < nftMarketplaceBulkTradeRequestData.nftsBuyData.length; i++) {
      const nftData = nftMarketplaceBulkTradeRequestData.nftsBuyData[i]
      const nftType = nftData.nftType === 'ERC721' ? 1 : 2
      const nftsIds = []
      const nftAmounts = []
      const nftPrices = []
      nftData.singularityNftTypeDataList.forEach(element => {
        nftsIds.push(element.nftId)
        nftAmounts.push(element.amount)
        nftPrices.push(element.price)
      })

      const parsedMarketplaceData = JSON.parse(JSON.parse(nftData.data).marketplaceData)
      const paravoxSignature = parsedMarketplaceData.paravoxSignature
      const deadline = parsedMarketplaceData.deadline

      const encodedExtraData = defaultAbiCoder.encode(['uint256', 'bytes'], [deadline, paravoxSignature])

      nftsDataArr.push([nftType, nftData.nftAddress, nftsIds, nftAmounts, nftPrices, nftData.aggregatedTotalPriceOfNfts, false, encodedExtraData]) // Partial Fill False
    }

    nftMarketplaceTradeExtraData = await encodeExtraData(nftMarketplaceBulkTradeRequestData.data, nftMarketplaceBulkTradeRequestData.routeName)
    nftMarketplaceBulkTradeRequestDataStruct = [nftMarketplaceBulkTradeRequestData.routeId, nftMarketplaceBulkTradeRequestData.receiver, nftMarketplaceBulkTradeRequestData.tradeType, nftsDataArr, nftMarketplaceBulkTradeRequestData.paymentTokenAddress, nftMarketplaceBulkTradeRequestData.aggregatedTotalPrice, false, nftMarketplaceTradeExtraData] // Partial fill false
  }

  return nftMarketplaceBulkTradeRequestDataStruct
}

module.exports = {
  getApprovalDataStruct,
  getSwapDataStruct,
  getBridgeDataStruct,
  getS9yDataStruct,
  getNftMarketplaceTradeDataStruct,
  getApprovalDataStructOld,
  getSwapDataStructOld,
  getS9yDataStructOld,
  getNftMarketplaceBulkTradeDataStruct
}
