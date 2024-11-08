/* eslint-disable camelcase */
const ethers = require('ethers')
const { getChainDetailsFromId } = require('../DataLayer/database/database')
const { checkAndSelectRpc } = require('./rpcHelpers')
const { pushStringToRedisWithKeyAndExpiry, getStringKey } = require('../DataLayer/redis/redis')
const getEvmProvider = async (chainDetailId) => {
  console.time('timelog:read chain details')

  const workingRpcUrlFromRedis = await getStringKey(chainDetailId + '_rpcurl')

  if (workingRpcUrlFromRedis) {
    console.timeEnd('timelog:read chain details')
    return new ethers.providers.JsonRpcProvider(workingRpcUrlFromRedis)
  }

  const [cachedChainRpcUrls, dbRpcUrls] = await Promise.all([getCachedRpcUrls(chainDetailId), getDbRpcUrls(chainDetailId)])
  const rpcUrls = cachedChainRpcUrls && cachedChainRpcUrls.length == dbRpcUrls.length ? cachedChainRpcUrls : dbRpcUrls

  const workingRpcUrl = await checkAndSelectRpc(rpcUrls, chainDetailId)

  pushWorkingChainRpcUrl(chainDetailId, workingRpcUrl)

  console.timeEnd('timelog:read chain details')
  return new ethers.providers.JsonRpcProvider(workingRpcUrl)
}

const pushWorkingChainRpcUrl = async (chainDetailId, workingRpcUrl) => {
  const workingRpcUrlTtl = parseInt(await getStringKey('working_rpcurl_ttl') || 180) // 2 mins default
  await pushStringToRedisWithKeyAndExpiry(chainDetailId + '_rpcurl', workingRpcUrl, workingRpcUrlTtl)
}

const getDbRpcUrls = async (chainDetailId) => {
  let { rpc_url, api_key, fallback_rpcs } = await getChainDetailsFromId(chainDetailId)
  if (!fallback_rpcs) fallback_rpcs = []
  return [rpc_url.replace('%s', api_key), ...fallback_rpcs]
}

const getCachedRpcUrls = async (chainDetailId) => {
  const val = await getStringKey(chainDetailId + '_rpcurls')
  return JSON.parse(val)
}

module.exports = {
  getEvmProvider
}
