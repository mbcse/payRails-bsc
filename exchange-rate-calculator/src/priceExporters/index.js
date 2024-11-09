const bulkExporter = require('./BulkExporter/bulkPriceExporter.js')
const singlePriceExporter = require("./SinglePriceExporter/singlePriceExporter.js");
const fetchLivePriceExporter = require("./SinglePriceExporter/fetchLivePriceExporter.js");
const SentryGenerataor = require("../utils/sentry.js");
const {UNKNOWN_TID} = require("../constants");
SentryGenerataor.startSentry();

module.exports = {

    bulkPriceUpload: async function () {
        await bulkExporter.bulkPriceUpload();
    },


    bulkPriceUploadByChain: async function (chainDetailsId) {
        await bulkExporter.bulkPriceUploadByChain(chainDetailsId);
    },

    singlePriceUpload: async function (priceRequest) {
        return await singlePriceExporter.singlePairPriceUpload(priceRequest)
    },

    fetchPrice: async function (priceRequest, tid = UNKNOWN_TID) {
        return await fetchLivePriceExporter.fetchPrice(priceRequest, tid)
    },

    bulkUsdPriceUpload : async function () {
        return await bulkExporter.bulkUsdPriceUpload();
    },

    bulkUsdPriceUploadByChain : async function (chainDetailsId) {
        return await bulkExporter.bulkUsdPriceUploadByChain(chainDetailsId);
    },

    bulkUsdPriceUploadByChains : async function (chainDetailsIds) {
        for(var i = 0; i < chainDetailsIds.length; i++) {
            bulkExporter.bulkUsdPriceUploadByChain(chainDetailsIds[i]);
        }
    },

    usdPriceUploadByAsset: async function (priceRequest) {
        return await singlePriceExporter.singleAssetUsdPriceUpload(priceRequest);
    }
}
