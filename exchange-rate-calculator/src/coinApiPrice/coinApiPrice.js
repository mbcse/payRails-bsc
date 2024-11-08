const ethers = require("ethers");
const constants = require('../constants');

module.exports = {
    getExchangeRate: async (assetBase, assetQuote) => {
        try {
            const provider = new ethers.providers.JsonRpcProvider(constants.quickNodeUrl);
            
            const response = await provider.send("v1/getCurrentExchangeRates", [
                { asset_id_base: assetBase },
                { asset_id_quote: assetQuote }
            ]);
            
            return response;
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
            return null;
        }
    }
};
