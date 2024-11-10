import api from "./api";

const assetAPI = {
  async getPrice(fromAsset, toAsset, quantity, chainID) {
    try {
      const res = await api.post("/v1/sdk-protected/getPrice", {
        body: { fromAsset, toAsset, quantity, chainDetailsId: chainID },
      });
      return res.data;
    } catch (err) {
      throw err.response.data;
    }
  },

  async getAllAssets() {
    try {
      const res = await api.get("/v1/d2c/getAllAssets");
      return res.data;
    } catch (err) {
      throw err.response.data;
    }
  },

  async getAllAssetsByChain(chainDetailsId) {
    try {
      const res = await api.get(
        `/v1/d2c/getAllAssetsByChain?chainDetailsId=${chainDetailsId}`
      );
      return res.data.reverse();
    } catch (err) {
      throw err.response.data;
    }
  },
};

export default assetAPI;
