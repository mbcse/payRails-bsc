const { defaultAbiCoder, BigNumebr } = require('ethers/lib/utils')
const { constants: { HashZero } } = require('ethers')
const { getSynapseBridgeData } = require('../web3Helper/getSynapseBridgeData.js')
const logger = require('../utils/logger.js')

const encodeExtraData = async (extraDataString, routeName, fullData) => {
  const extraData = extraDataString ? JSON.parse(extraDataString) : null
  // if (extraData) {
  //   if (!extraData.path) extraData.path = []
  //   else {
  //     extraData.path = extraData.path.split(',')
  //     console.log(`Path -> ${extraData.path}`)
  //   }
  // }

  if (extraData && !extraData.path) { extraData.path = '0x' }

  switch (routeName) {
    case 'UNISWAP_V3': {
      return extraData
        ? defaultAbiCoder.encode(['uint256', 'uint24', 'uint160', 'bytes'], [extraData.deadline, extraData.fee, extraData.sqrtPriceLimitX96, extraData.path])
        : defaultAbiCoder.encode(['bytes'], [0])
    }
    case 'PANCAKE_V2': {
      return extraData
        ? defaultAbiCoder.encode(['uint256', 'uint24', 'uint160', 'address[]'], [extraData.deadline, extraData.fee, extraData.sqrtPriceLimitX96, JSON.parse(extraData.path)])
        : defaultAbiCoder.encode(['bytes'], [0])
    }
    case 'TRADERJOE_V1': {
      return extraData
        ? defaultAbiCoder.encode(['uint256', 'uint24', 'uint160', 'address[]'], [extraData.deadline, extraData.fee, extraData.sqrtPriceLimitX96, JSON.parse(extraData.path)])
        : defaultAbiCoder.encode(['bytes'], [0])
    }

    case 'TRADERJOE_V2': {


      const encodedData = defaultAbiCoder.encode(
        ['uint256', 'uint24', 'uint160', 'tuple(uint256[] pairBinSteps, uint8[] versions, address[] tokenPath)'],
        [extraData.deadline, extraData.fee, extraData.sqrtPriceLimitX96, JSON.parse(extraData.path)]
      )
      console.log(encodedData)
      return extraData
        ? encodedData
        : defaultAbiCoder.encode(['bytes'], [0])
    }

    case 'DFKDEX_V2': {
      return extraData
        ? defaultAbiCoder.encode(['uint256', 'uint24', 'uint160', 'address[]'], [extraData.deadline, extraData.fee, extraData.sqrtPriceLimitX96, JSON.parse(extraData.path)])
        : defaultAbiCoder.encode(['bytes'], [0])
    }



  
    

    case 'SYNAPSE_BRIDGE_V1': {
      const { originQuery, destQuery } = await getSynapseBridgeData(extraData.originChainDetailsId,
        extraData.destChainDetailsId, extraData.fromTokenAddress, extraData.toTokenAddress,
        extraData.amount, extraData.deadlineOrigin, extraData.deadlineDest, extraData.slippage)
      console.log(originQuery)
      console.log(destQuery)

      const encodedQueries = defaultAbiCoder.encode(
        ['tuple(address, address, uint256, uint256, bytes)', 'tuple(address, address, uint256, uint256, bytes)'],
        [originQuery, destQuery]
      )

      console.log(encodedQueries)
      return encodedQueries
    }
  }}
module.exports = {
  encodeExtraData
}
