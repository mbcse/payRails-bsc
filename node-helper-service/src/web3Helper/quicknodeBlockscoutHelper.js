// quicknodeHelper.js
const ethers = require("ethers");

class QuickNodeBlockscoutHelper {
  constructor(rpcUrl) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  async getTransactionByHash(txHash) {
    return await this.provider.send("bs_getTransactionByHash", [txHash]);
  }

  async getTransactionReceipt(txHash) {
    return await this.provider.send("bs_getTransactionReceipt", [txHash]);
  }

  async getTransactionCount(address, blockTag = "latest") {
    return await this.provider.send("bs_getTransactionCount", [address, blockTag]);
  }

  async getBalance(address, blockTag = "latest") {
    return await this.provider.send("bs_getBalance", [address, blockTag]);
  }

  async estimateGas(txParams) {
    return await this.provider.send("bs_estimateGas", [txParams, "latest"]);
  }

  async sendRawTransaction(signedTx) {
    return await this.provider.send("bs_sendRawTransaction", [signedTx]);
  }

  async getLogs(filter) {
    return await this.provider.send("bs_getLogs", [filter]);
  }
}

module.exports = QuickNodeHelper;
