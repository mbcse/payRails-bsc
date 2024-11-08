const redis = require('../DataLayer/redis/redis')
const getNonce = async (provider, chainId, address) => {
  console.log(`Getting Nonce for address ${address} on chainId ${chainId}`)
  const key = address + '-' + chainId
  let redisNonce = null
  try {
    redisNonce = await redis.getStringKey(key)
    console.log('Redis Nonce found = ', redisNonce)
  } catch (error) {
    console.log(error)
  }
  if (redisNonce) {
    console.log(`Nonce ${redisNonce} found in redis for address ${address}`)
    return parseInt(redisNonce)
  } else {
    console.log(`Nonce not found in redis for address ${address}, Fetching from blockchain`)
    const nonce = await provider.getTransactionCount(address)
    console.log(`Nonce fetched from blockchain for address ${address} = `, nonce)
    await redis.pushStringToRedisWithKeyAndExpiry(key, nonce, 300)
    return nonce
  }
}

const updateNonce = async (provider, chainId, address, nonce) => {
  console.log('Updating nonce for address', address, 'with nonce ' + nonce)
  const key = address + '-' + chainId
  await redis.pushStringToRedisWithKeyAndExpiry(key, nonce, 300)
}

module.exports = {
  getNonce,
  updateNonce
}
