const { getEvmProvider } = require('../web3Helper/getProvider')
const { UNKNOWN_TID } = require('../utils/constants')
const logger = require('../utils/logger')
// const logger = require('../utils/logger')
// const args = process.argv
// eslint-disable-next-line camelcase
const sendAndExecuteTx = async (sender, paymentAddress, chainDetailId, signedTx, nonce, tid = UNKNOWN_TID) => {
  const [provider] = await Promise.all([getEvmProvider(chainDetailId)])
  try {
    signedTx = JSON.parse(signedTx)
    const sentTx = await provider.sendTransaction(signedTx.rawTransaction)
    console.log(sentTx)
    return sentTx.hash
  } catch (err) {
    logger.error(err.message, {
      err
    })
    console.log(err)
    if (err.toString().includes('insufficient funds') || err?.err?.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Failed to Send Transaction due to insufficient funds on user side')
    }
    throw err
  }
}

module.exports = {
  sendAndExecuteTx
}
