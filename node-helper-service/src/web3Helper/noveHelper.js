// novesHelper.js
const axios = require("axios");

class NovesHelper {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async describeTransaction(txHash) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/evm/chain/describeTx/${txHash}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching transaction details:", error.message);
      throw error;
    }
  }
}

module.exports = NovesHelper;
