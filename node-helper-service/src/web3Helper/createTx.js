const { Transaction } = require('@ethereumjs/tx')
const { Common, CustomChain } = require('@ethereumjs/common')
const Web3 = require('web3')
const { getAdminWallet } = require('./walletManager')
const logger = require('../utils/logger')
const { UNKNOWN_TID } = require('../utils/constants')
const { sendSlackAlert } = require('../utils/slackBot')
const { acquireLock } = require('../utils/distributedLock')
const { getNonce } = require('./nonceManager')
const { pushStringToRedisWithKey } = require('../DataLayer/redis/redis')
const args = process.argv

const chainCommonObjects = {
  80001: Common.custom(CustomChain.PolygonMumbai),
  137: Common.custom(CustomChain.PolygonMainnet),
  11155111: Common.custom({ chainId: 11155111 }),
  5: Common.custom({ chainId: 5 })
}

const createTx = async (txObject, provider, chainId, tid = UNKNOWN_TID, gasCostRedisKey) => {
  logger.debug('Creating and Signing Tx', ({
    tid
  }))
  const common = chainCommonObjects[chainId] || Common.custom({ chainId })
  const ADMIN_WALLET = await getAdminWallet(provider, tid)

  async function checkValueAndBalance () {
    try {
      const balanceInWei = await provider.getBalance(ADMIN_WALLET.address)
      const balance = parseFloat(Web3.utils.fromWei(balanceInWei.toString()))
      const valueAmount = parseFloat(Web3.utils.fromWei(txObject.value.toString()))
      console.log('Balance of Admin Account Doing Transaction is ' + balance)
      console.log('Value Required :' + valueAmount)
      if (balance <= valueAmount) {
        console.log('Balance is Less, Transaction will Probably Fail, Sending Alert!')
        const { name: networkName } = await provider.getNetwork()
        const balDiff = balance - valueAmount
        sendSlackAlert(`Insufficient Funds Alert: (A Transaction Might Fail)\nThis is probably a NFT checkout or similar Transaction which needs our account to pay for Tx(Value is Passed)\nNetwork Name: ${networkName}\nChainId: ${chainId}\nPlease Fill the Admin Wallet Account(${ADMIN_WALLET.address}) urgently so that the transactions can be processed\nEnvironment: ${args[2].toUpperCase()}\nAmount Required: ${valueAmount}\nCurrent Balance: ${balance}\nTopup Amount Required: ${balDiff}`)
      }

      // check contract balance if chain is homeverse
      if (chainId == 19011) {
        const contractBalanceInWei = await provider.getBalance(txObject.to)
        const contractBalance = parseFloat(Web3.utils.fromWei(contractBalanceInWei.toString()))
        console.log('Balance of Contract Account is ' + contractBalance)
        if (contractBalance <= 10000) {
          console.log('Contract Balance is Less, Further Transaction will Probably Fail, Sending Alert!')
          const { name: networkName } = await provider.getNetwork()
          sendSlackAlert(`Insufficient Funds Alert for Future Transactions on Homeverse: (A Transaction Might Fail)\nHomeverse Contract Balance is less than 10000 OAS which can cause ubisoft txs to fail in future. Please Top Up as soon as possible\nNetwork Name: ${networkName}\nChainId: ${chainId}\nPlease Fill the Contract Account(${txObject.to}) urgently so that the transactions can be processed\nEnvironment: ${args[2].toUpperCase()}\nAmount Required: ${valueAmount}\nCurrent Balance: ${contractBalance}\nTopup Amount Required: ${balDiff}`)
        }
      }
    } catch (error) {
      console.log(error)
    }
  }

  checkValueAndBalance()

  const lockKey = ADMIN_WALLET.address

  const lock = await acquireLock(lockKey, 60000)
  let [gasPrice, nonce] = await Promise.all([provider.getGasPrice(), getNonce(provider, chainId, ADMIN_WALLET.address)])
  logger.info('Gas Price ' + gasPrice.toString(), ({
    tid
  }))
  if (chainId === 53935) {
    gasPrice = gasPrice * 2
    logger.info('Increased Gas Price' + gasPrice.toString(), ({
      tid
    }))
  }
  txObject.from = ADMIN_WALLET.address
  txObject.gasPrice = Web3.utils.toHex(gasPrice)
  txObject.nonce = Web3.utils.toHex(nonce)
  txObject.gasLimit = 2000000
  txObject.value = Web3.utils.toHex(txObject.value)
  console.log(`Nonce and address being used for tid ${tid} =>  nonce = ${nonce} & address  = ${ADMIN_WALLET.address}`)
  try {
    txObject.gasLimit = await provider.estimateGas({
      from: txObject.from,
      to: txObject.to,
      data: txObject.data,
      nonce: txObject.nonce,
      value: txObject.value
    })
    logger.debug(`Estimated Gas ${txObject.gasLimit.toNumber() + 50000}`, ({
      tid
    }))
    pushStringToRedisWithKey(gasCostRedisKey, txObject.gasLimit.toNumber())
    txObject.gasLimit = Web3.utils.toHex((txObject.gasLimit.toNumber() + 50000))
  } catch (err) {
    logger.debug('Was not able to estimate gas, Going with default value of 2000000', ({
      tid,
      err
    }))
  }

  logger.debug(`Final Tx Object ${JSON.stringify(txObject)}`, ({
    tid
  }))

  const tx = Transaction.fromTxData(txObject, { common })

  logger.debug('Singing Transaction', ({
    tid
  }))

  // eslint-disable-next-line new-cap
  const privateKey = new Buffer.from(ADMIN_WALLET.privateKey.slice(2), 'hex')
  const signedTx = tx.sign(privateKey)

  const serializedTx = signedTx.serialize()

  logger.debug(`Generated Tx hash: ${'0x' + serializedTx.toString('hex')}`, ({
    tid
  }))
  return { tx: '0x' + serializedTx.toString('hex'), lockKey, nonce, adminAddress: ADMIN_WALLET.address, lock }
}

module.exports = createTx
