import api from "./api";

const chainAPI = {
  async getAllChains() {
    try {
      const res = await api.get("/v1/d2c/getAllChains");
      return res.data;
    } catch (err) {
      throw err.response.data;
    }
  },

  async getChainData(chainDetailsId) {
    try {
      const res = await api.get(
        `/v1/d2c/getChainData?chainDetailsId=${chainDetailsId}`
      );
      return res.data;
    } catch (err) {
      throw err.response.data;
    }
  },
};

export default chainAPI;
