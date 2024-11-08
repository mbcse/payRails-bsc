const { default: Redlock } = require('redlock')
const connections = require('../Connections/connections.js')

let redLock
let redisClient

const clients = []

async function getRedLock () {
  console.log(`Total Active Redis Clients used by RedLock : ${clients.length}`)

  if (redLock && redisClient) {
    console.log('Redis Client Status : ', redisClient.status)
    console.log('RedLock Instance Available: Reusing ReadLock...')
    return redLock
  }

  redisClient = await connections.getIoRedisClient()

  clients.push(redisClient)

  console.log(redisClient.status)

  redLock = new Redlock(
    // You should have one client for each independent redis node
    // or cluster.
    [redisClient],
    {
      // The expected clock drift; for more details see:
      // http://redis.io/topics/distlock
      driftFactor: 0.01, // multiplied by lock ttl to determine drift time

      // The max number of times Redlock will attempt to lock a resource
      // before erroring.
      retryCount: 9,

      // the time in ms between attempts
      retryDelay: 5000, // time in ms

      // the max time in ms randomly added to retries
      // to improve performance under high contention
      // see https://www.awsarchitectureblog.com/2015/03/backoff.html
      retryJitter: 3000, // time in ms

      // The minimum remaining time on a lock before an extension is automatically
      // attempted with the `using` API.
      automaticExtensionThreshold: 500 // time in ms
    }
  )

  return redLock
}

async function acquireLock (lockKey, expirationTime) {
  console.log(`Acquiring Lock on ${lockKey}`)
  try {
    const redlock = await getRedLock()
    const lock = await redlock.acquire([lockKey], expirationTime)
    return lock
  } catch (error) {
    console.log(`Acquiring Lock on ${lockKey} failed because of error ${error.message}`)
    // console.log(error)
    throw error
  }
}

async function releaseLock (lockKey, lock) {
  console.log(`Release lock on ${lockKey}`)
  try {
    await lock.release()
    console.log(`Release lock on ${lockKey} successful`)
  } catch (error) {
    console.log(`Release lock on ${lockKey} failed because of error ${error.message}`)
    // console.log(error)
    throw error
  }
}

// async function acquireLock (lockKey, expirationTime, trials = 0) {
//   console.log(`Acquiring Lock on ${lockKey} Trial: ${trials}`)
//   try {
//     const client = await connections.getRedisClient()
//     const reply = await client.set(lockKey, 'locked', {
//       NX: true,
//       EX: 10
//     })

//     if (reply === 'OK') {
//       console.log(`Acquiring Lock on ${lockKey} successful`)
//       return true // Lock acquired
//     } else {
//       if (trials < 20) {
//         console.log(`Acquiring Lock on ${lockKey} failed, Trying again after 3 Secs, Trial No: ${trials}`)
//         setTimeout(async () => {
//           const success = await acquireLock(lockKey, expirationTime, trials + 1)
//           return success
//         }, 3 * 1000)
//       } else {
//         console.log(`All retrials to acquire lock failed for ${lockKey}`)
//         throw new Error('Acquiring lock failed, Transaction Processing Failed')
//       }
//       // resolve(false) // Lock not acquired
//     }
//   } catch (error) {
//     console.log(`Acquiring Lock on ${lockKey} failed because of error,  Trial No: ${trials}`)
//     throw error
//   }
// }

// async function releaseLock (lockKey) {
//   console.log(`Release lock on ${lockKey}`)
//   try {
//     const client = await connections.getRedisClient()
//     const result = await client.del(lockKey)
//     console.log(`Release lock on ${lockKey} successful`)
//     return (result === 1) // Lock released if the key was deleted
//   } catch (error) {
//     console.log(`Release lock on ${lockKey} failed because of error`)
//     throw error
//   }
// }

module.exports = {
  acquireLock,
  releaseLock
}

// const testRedLock = async () => {
//   await new Promise(resolve => setTimeout(resolve, 5000))
//   const lockKey = 'testLock1'
//   const expirationTime = 50000
//   const lock = await acquireLock(lockKey, expirationTime)
//   console.log('Lock1 Acquired: ')
//   setTimeout(async () => {
//     await releaseLock(lockKey, lock)
//   }, 20000)
// }
// const testRedLock2 = async () => {
//   await new Promise(resolve => setTimeout(resolve, 5000))
//   const lockKey = 'testLock2'
//   const expirationTime = 50000
//   const lock = await acquireLock(lockKey, expirationTime)
//   console.log('Lock2 Acquired: ')
//   setTimeout(async () => {
//     await releaseLock(lockKey, lock)
//   }, 15000)
// }

// const testRedLock3 = async () => {
//   await new Promise(resolve => setTimeout(resolve, 25000))
//   const lockKey = 'testLock2'
//   const expirationTime = 50000
//   const lock = await acquireLock(lockKey, expirationTime)
//   console.log('Lock3 Acquired: ')
//   setTimeout(async () => {
//     await releaseLock(lockKey, lock)
//   }, 80000)
// }

// const testRedLock4 = async () => {
//   await new Promise(resolve => setTimeout(resolve, 15000))
//   const lockKey = 'testLock1'
//   const expirationTime = 50000
//   const lock = await acquireLock(lockKey, expirationTime)
//   console.log('Lock4 Acquired: ')
//   setTimeout(async () => {
//     await releaseLock(lockKey, lock)
//   }, 10000)
// }

// testRedLock()
// testRedLock2()

// testRedLock2()

// testRedLock3()
// testRedLock4()
