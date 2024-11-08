const ethers = require('ethers')

const splitSignatureToRSV = async (signature) => {
  if (signature && signature.length > 0) {
    const r = '0x' + signature.substring(2).substring(0, 64)
    const s = '0x' + signature.substring(2).substring(64, 128)
    const v = parseInt(signature.substring(2).substring(128, 130), 16)
    return { r, s, v }
  }
  return { r: ethers.utils.hexZeroPad(ethers.BigNumber.from(0).toHexString(), 32), s: ethers.utils.hexZeroPad(ethers.BigNumber.from(0).toHexString(), 32), v: 0 }
}

module.exports = { splitSignatureToRSV }
