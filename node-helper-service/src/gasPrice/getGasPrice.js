const { ethers } = require('ethers')
const { getEvmProvider } = require('../web3Helper/getProvider')

const getChainGasPriceHandler = async (chainDetailId) => {
  const providerInfo = await getEvmProvider(chainDetailId)
  const ethers = require("ethers");

  const provider = new ethers.providers.JsonRpcProvider(providerInfo.url);
  const network = await provider.send(
    "bn_gasPrice",
    [{"chainid":chainDetailId}]
  );

  return network
}

module.exports = {
  getChainGasPriceHandler
}
