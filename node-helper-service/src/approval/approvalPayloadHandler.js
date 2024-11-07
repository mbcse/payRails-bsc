const ethers = require('ethers')
const { getEvmProvider } = require('../web3Helper/getProvider')
const { DAI_PERMIT_TYPES, ERC2612_PERMIT_TYPES, ERC20ABI, ERC2612_PERMIT_TYPES_WITH_CHAINID } = require('./constants')

const getNativeApprovalPayload = async (owner, spender, amount, tokenAddress) => {
  const contractInterface = new ethers.utils.Interface(ERC20ABI)
  const params = [spender, amount]
  const data = contractInterface.encodeFunctionData('approve', params)

  return {
    from: owner,
    to: tokenAddress,
    data
  }
}

const getDaiPermitPayload = async (owner, spender, tokenAddress, chainDetailsId, deadline) => {
  const provider = await getEvmProvider(chainDetailsId)
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider)
  const [nonce, domain] = await Promise.all([contract.getNonce(owner), getPermitDomainWithSalt(tokenAddress, chainDetailsId)])
  const types = DAI_PERMIT_TYPES
  const message = {
    holder: owner,
    spender,
    nonce: nonce.toString(),
    deadline,
    allowed: true
  }

  return { domain, types, message, primaryType: 'Permit' }
}

const getERC2612PermitPayload = async (owner, spender, amount, tokenAddress, chainDetailsId, deadline) => {
  const provider = await getEvmProvider(chainDetailsId)
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider)
  const [nonce, domain] = await Promise.all([contract.nonces(owner), getPermitDomainWithSalt(tokenAddress, chainDetailsId)])
  const types = ERC2612_PERMIT_TYPES
  const message = {
    owner,
    spender,
    nonce: nonce.toString(),
    deadline,
    value: amount
  }

  return { domain, types, message, primaryType: 'Permit' }
}

const getERC2612PermitPayloadWithChainId = async (owner, spender, amount, tokenAddress, chainDetailsId, deadline) => {
  const provider = await getEvmProvider(chainDetailsId)
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider)
  const [nonce, domain] = await Promise.all([contract.nonces(owner), getPermitDomainWithChainId(tokenAddress, chainDetailsId)])
  const types = ERC2612_PERMIT_TYPES_WITH_CHAINID
  const message = {
    owner,
    spender,
    nonce: nonce.toString(),
    deadline,
    value: amount
  }

  return { domain, types, message, primaryType: 'Permit' }
}

const getPermitDomainWithSalt = async (tokenAddress, chainDetailsId) => {
  const provider = await getEvmProvider(chainDetailsId)
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider)
  const [name, { chainId }] = await Promise.all([contract.name(), provider.getNetwork()])
  let version = '1'
  try {
    const fetchedVersion = await contract.version()
    if (fetchedVersion) {
      version = fetchedVersion
    }
  } catch (error) {
    // pass
  }
  return {
    name,
    version,
    salt: ethers.utils.hexZeroPad(ethers.BigNumber.from(chainId).toHexString(), 32),
    verifyingContract: tokenAddress
  }
}

const getPermitDomainWithChainId = async (tokenAddress, chainDetailsId) => {
  const provider = await getEvmProvider(chainDetailsId)
  const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider)
  const [name, { chainId }] = await Promise.all([contract.name(), provider.getNetwork()])
  let version = '1'
  try {
    const fetchedVersion = await contract.version()
    if (fetchedVersion) {
      version = fetchedVersion
    }
  } catch (error) {
    // pass
  }
  return {
    name,
    version,
    chainId: ethers.utils.hexZeroPad(ethers.BigNumber.from(chainId).toHexString(), 32),
    verifyingContract: tokenAddress
  }
}

module.exports = {
  getDaiPermitPayload,
  getERC2612PermitPayload,
  getNativeApprovalPayload,
  getERC2612PermitPayloadWithChainId
}
