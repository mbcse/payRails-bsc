const ethers = require('ethers')

const createNativeTxPayload = async (contractAbi, contractAddress, functionName, txData, chainDetailId, userAddress) => {
  const contractInterface = new ethers.utils.Interface(contractAbi)
  const params = await getTxParams(functionName, txData)
  const data = contractInterface.encodeFunctionData(functionName, params)

  const txObject = {
    from: userAddress,
    to: contractAddress,
    data,
    value: txData.amount
  }

  return txObject
}

const getTxParams = async (functionName, txData) => {
  switch (functionName) {
    case 'directNativePayment' : {
      return [txData.sender, txData.receiver, txData.amount, txData.orderId]
    }

    case 'swapTokenPayment': {
      return [txData.sender, txData.receiver, txData.inToken, txData.outToken, txData.amount, txData.deadline, txData.orderId]
    }
  }
}

module.exports = {
  createNativeTxPayload
}
