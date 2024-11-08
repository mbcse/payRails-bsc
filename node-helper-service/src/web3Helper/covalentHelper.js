// covalentHelper.js
const { CovalentClient } = require("@covalenthq/client-sdk");
const fs = require("fs");
const axios = require("axios");

class CovalentHelper {
  constructor(apiKey, goldrushBaseUrl) {
    this.client = new CovalentClient(apiKey);
    this.goldrushBaseUrl = goldrushBaseUrl; // Goldrush API Base URL
  }

  async getAllTransactions(chainId, address) {
    try {
      const transactions = this.client.TransactionService.getAllTransactionsForAddress(chainId, address);
      const result = [];

      for await (const tx of transactions) {
        if (tx.from === address || tx.to === address) {
          result.push(tx);
        }
      }

      return result;
    } catch (error) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
  }

  async getTransactionByHash(chainId, txHash) {
    try {
      const response = await axios.get(`${this.goldrushBaseUrl}/transactions/${chainId}/${txHash}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching transaction by hash:", error.message);
      throw error;
    }
  }

  async getCrossChainTransactions(fromChain, toChain, address) {
    try {
      const response = await axios.get(`${this.goldrushBaseUrl}/cross-chain/transactions`, {
        params: { from_chain: fromChain, to_chain: toChain, address: address },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching cross-chain transactions:", error.message);
      throw error;
    }
  }

  async getCrossChainTransfers(fromChain, toChain, address) {
    try {
      const response = await axios.get(`${this.goldrushBaseUrl}/cross-chain/transfers`, {
        params: { from_chain: fromChain, to_chain: toChain, address: address },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching cross-chain transfers:", error.message);
      throw error;
    }
  }

  async getBlockDetails(chainId, blockHash) {
    try {
      const response = await axios.get(`${this.goldrushBaseUrl}/blocks/${chainId}/${blockHash}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching block details:", error.message);
      throw error;
    }
  }

  async getTokenBalances(chainId, address) {
    try {
      const response = await axios.get(`${this.goldrushBaseUrl}/tokens/${chainId}/${address}/balances`);
      return response.data;
    } catch (error) {
      console.error("Error fetching token balances:", error.message);
      throw error;
    }
  }
}

module.exports = CovalentHelper;
