const { getEvmProvider } = require('./getProvider')
const { maxBy } = require('lodash')

const abi = require('./abis/SynapseBridge.json')
const { ethers } = require('ethers')
const { SynapseSDK } = require('@synapsecns/sdk-router')

const getSynapseBridgeRouterAddress = async (chainId) => {
  switch (chainId) {
    case 43114 : return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 53935 : return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 137 : return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 7700: return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 42161 : return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 8453 : return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 10: return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 1: return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 56: return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    case 1088: return '0x7E7A0e201FD38d3ADAA9523Da6C109a07118C96a'
    default : throw new Error('ChainId not supported in Qal Get Synapse Data Function')
  }
}

const getSynapseRouter = async (chainId, provider) => {
  const address = await getSynapseBridgeRouterAddress(chainId)
  console.log('Synapse Router Address', address)
  return new ethers.Contract(address, abi, provider)
}

async function getSynapseBridgeData (originChainDetailsId, destChainDetailsId, fromTokenAddress, toTokenAddress, amount, deadlineOrigin, deadlineDest, slippage) {
  if (!originChainDetailsId || !destChainDetailsId || !fromTokenAddress || !toTokenAddress || !amount || !deadlineOrigin || !deadlineDest || !slippage) { throw new Error('Missing arguments') }
  const originProvider = await getEvmProvider(originChainDetailsId)
  const destProvider = await getEvmProvider(destChainDetailsId)
  const originChainId = (await originProvider.getNetwork()).chainId
  const destChainId = (await destProvider.getNetwork()).chainId

  if (fromTokenAddress === '0x0000000000000000000000000000000000001010') {
    fromTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  }
  if (toTokenAddress === '0x0000000000000000000000000000000000001010') {
    toTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  }

  // 0. Fetch deployments of SynapseRouter on origin and destiantion chains
  const routerOrigin = await getSynapseRouter(originChainId, originProvider)
  const routerDest = await getSynapseRouter(destChainId, destProvider)

  // 1. Determine the set of bridge tokens that could enable "receive tokenOut on destination chain"
  // For that we pefrorm a static call to SynapseRouter on destination chain
  const bridgeTokens = await routerDest.getConnectedBridgeTokens(toTokenAddress)
  // Then we get the list of bridge token symbols
  const symbols = bridgeTokens.map((token) => token.symbol)

  console.log('Symbols: ' + symbols)

  // 2. Get the list of Queries with possible swap instructions for origin chain
  // For that we pefrorm a static call to SynapseRouter on origin chain
  // This gets us the quotes from tokenIn to every bridge token (one quote per bridge token in the list)
  const originQueries = await routerOrigin.getOriginAmountOut(
    fromTokenAddress,
    symbols,
    amount
  )

  console.log('originQueries', originQueries)
  if (originQueries.length > 0) {
  // 3. Get the list of Queries with possible swap instructions for destination chain
    // First, we form a list of "destiantion requests" by merging
    // list of token symbols with list of quotes obtained in step 2.
    const requests = symbols.map((value, index) => {
      const request = {
        symbol: value,
        amountIn: originQueries[index].minAmountOut
      }
      return request
    })
    // Then we perform a static call to SynapseRouter on destination chain
    // This gets us the quotes from every bridge token to tokenOut (one quote per bridge token in the list)
    // These quotes will take into account the fee for bridging the token to destination chain
    const destQueries = await routerDest.getDestinationAmountOut(requests, toTokenAddress)
    console.log('dest queries: ', destQueries)

    // 4. Pick a pair of originQueries[i], destQueries[i] to pefrom the cross-chain swap
    const destQuery = maxBy(destQueries, (query) => query.minAmountOut)
    console.log('destQuery', JSON.stringify(destQuery))
    const selectedIndex = destQueries.indexOf(destQuery)
    const originQuery = originQueries[selectedIndex]
    console.log('originQuery', JSON.stringify(originQuery))

    const originQueryArr = originQuery.slice(0, 5)
    originQueryArr[3] = deadlineOrigin
    originQueryArr[2] = originQueryArr[2].toString()
    const destQueryArr = destQuery.slice(0, 5)
    destQueryArr[3] = deadlineDest
    destQueryArr[2] = destQueryArr[2].toString()

    return { originQuery: originQueryArr, destQuery: destQueryArr }
  } else {
    try {
      const Synapse = new SynapseSDK([originChainId, destChainId], [originProvider, destProvider])

      const bridgeData = await Synapse.bridgeQuote(originChainId, destChainId, fromTokenAddress,
        toTokenAddress, amount, deadlineDest)
      console.log('BridgeData from SDK', bridgeData)
      const oriQuery = [bridgeData.originQuery.swapAdapter, bridgeData.originQuery.tokenOut, bridgeData.originQuery.minAmountOut, bridgeData.originQuery.deadline, bridgeData.originQuery.rawParams]
      const desQuery = [bridgeData.destQuery.swapAdapter, bridgeData.destQuery.tokenOut, bridgeData.destQuery.minAmountOut, bridgeData.destQuery.deadline, bridgeData.destQuery.rawParams]

      return { originQuery: oriQuery, destQuery: desQuery }
    } catch (error) {
      console.log('Error from Get Synapse Bridge Data from Synapse SDK', error)
    }
  }
}
module.exports = {
  getSynapseBridgeData
}

// getSynapseBridgeData('3096ecf6-859a-49cc-bcbd-cd3eb25b834c', '1a01d245-cde4-49bc-b0c2-ccafde1d5da8', '0xB57B60DeBDB0b8172bb6316a9164bd3C695F133a', '0x0000000000000000000000000000000000001010', '2000000000000000000', 1700000, 8900000, 1)
