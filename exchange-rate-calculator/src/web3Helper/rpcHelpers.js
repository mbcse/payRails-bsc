const fetch = require('node-fetch')
const logger = require('../utils/logger')
const { pushMapToRedisWithKey, pushStringToRedisWithKey, getStringKey } = require('../DataLayer/redis/redis')
const blackListedRpcUrl = "https://rpc.ankr.com/avalanche/6254a9e303347e5d17efda1bd8d58aa997a2c63b8af064579b8545e6a092aea2"

const isEthRpcWorking = async (rpcUrl) => {
  console.log("Making a call to RPC: ", rpcUrl)
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    })

    const data = await response.json()
    return !!(data && data.result)
  } catch (error) {
    console.log('RPC Call failed!', { err: error })
    return false
  }
}

const checkAndSelectRpc = async (chainRPCs, chainDetailId) => {
  // console.log("Checking and Selecting RPCs: ", chainRPCs)
  for (let i = 0; i < chainRPCs.length; i++) {
    const rpcUrl = chainRPCs[i]
    if(rpcUrl == blackListedRpcUrl){
      console.log("Blacklisted RPC URL: ", rpcUrl, " Skipping to next RPC URL")
      continue;
    }
    if (await isEthRpcWorking(rpcUrl)) {
      calculateAndPushRpcUrl(chainRPCs, chainDetailId)
      console.log("Selected RPC URL: ", rpcUrl)
      return rpcUrl
    }
    console.log("RPC URL not working: ", rpcUrl, " Skipping to next RPC URL")
  }
  
  throw new Error('No Working RPC found!')
}

const calculateAndPushRpcUrl = async (chainRPCs, chainDetailId) => {
  // console.log("Calculating and Pushing RPC URL with chainRPCs", chainRPCs)
  let chainRpcUrls = []
  let timeTakenByUrls = []
  for(let i = 0; i < chainRPCs.length; i++){
    const rpcUrl = chainRPCs[i]
    const startTime = performance.now()
    const isWorking = await isEthRpcWorking(rpcUrl)
    const endTime = performance.now()
    const timeTaken = endTime - startTime
    // console.log(`Time Taken by RPC ${rpcUrl} for RPC Call: `, timeTaken)
    if(isWorking){
      if(chainRpcUrls.length == 0 ){
        chainRpcUrls.push(rpcUrl)
        timeTakenByUrls.push(timeTaken)
      }
      else {
        for(let j = 0; j < chainRpcUrls.length; j++){
          if(timeTaken < timeTakenByUrls[j]){
            chainRpcUrls.splice(j, 0, rpcUrl)
            timeTakenByUrls.splice(j, 0, timeTaken)
            break
          }
        }
      }
    }else{
      chainRpcUrls.push(rpcUrl)
      timeTakenByUrls.push(999999999999999)
    }
  }

  const rpcurlsTtl = parseInt(await getStringKey('rpcurls_ttl') || 10800) // default 3 hours ttl
  await pushStringToRedisWithKey(chainDetailId + "_rpcurls", JSON.stringify(chainRpcUrls), rpcurlsTtl) 

  // console.log("Sorted Chain RPC URLs By Response Time: ", chainRpcUrls)
}


module.exports = { isEthRpcWorking, checkAndSelectRpc }
