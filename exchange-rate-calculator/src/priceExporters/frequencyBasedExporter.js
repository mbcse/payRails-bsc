const database = require("../DataLayer/database");
const redis = require("../DataLayer/redis/redis");
const { getStringKey, pushStringToRedisWithKey, getKeyTtl } = require("../DataLayer/redis/redis");
const { pairPriceGenerator } = require("../priceExporterHandler");
const generatePairRedisKey = require("../priceExporterHelpers/generatePairRedisKey");
const { bulkPriceUploadByChain } = require("./BulkExporter/bulkPriceExporter");
const { singlePairPriceUpload } = require("./SinglePriceExporter/singlePriceExporter");



const checkFrequencyAndUpdatePrice = async (fromToken, toToken) => {

    console.log("Checking Frequency and Updating Price")

    const fromTokenName = fromToken.asset_name;
    const toTokenName = toToken.asset_name;
    const chainDetailsId = fromToken.chain_details_id;

    //Call Single Pair Price Upload for this Pair

    const singlePairExportKey = `${fromTokenName}_${toTokenName}_${chainDetailsId}_single_pair_export_done`
    const singlePairExportTtl = parseInt(await getStringKey("single_pair_export_ttl") || 120); // 2 Mins Default

    const singlePairExportStatus = await getStringKey(singlePairExportKey);
    console.log("Single Pair Export Status: " + singlePairExportStatus)

    if(singlePairExportStatus){
        console.log("Single Pair Export Already Done, Skipping")
    }else{
        console.log("Single Pair Price Upload Called")
        singlePairPriceUpload({fromTokenName, toTokenName, chainDetailsId});
        await pushStringToRedisWithKey(singlePairExportKey, true, singlePairExportTtl);
    }

    // Check and Update Frequency of Chain 

    console.log("Checking chain frequency")

    const chainExportFrequency = await getStringKey(`${chainDetailsId}_chain_export_frequency`);
    console.log("chain export frequency: " + chainExportFrequency)

    const redisExportFrequencyKey = `${chainDetailsId}_chain_export_frequency`
    console.log("redisExportFrequencyKey: " + redisExportFrequencyKey)
    const threshold = parseInt((await getStringKey(`export_frequency_threshold`) || 5)); // 5 Count
    console.log("threshold: " + threshold)
    const thresholdTime = parseInt((await getStringKey(`export_frequency_threshold_time`) || 1800)); // 30 Mins
    console.log("thresholdTime: " + thresholdTime)

    if(!chainExportFrequency){
        console.log("Chain Export Frequency Not Found, Creating New")
        await pushStringToRedisWithKey(redisExportFrequencyKey, 1, thresholdTime);
        return;
    }

    const updatedFrequency = parseInt(chainExportFrequency) + 1;
    console.log("updatedFrequency: " + updatedFrequency)

    if(updatedFrequency > threshold){
        console.log("Threshold Reached, Bulk Price Upload Started")
        bulkPriceUploadByChain(chainDetailsId);
        await pushStringToRedisWithKey(redisExportFrequencyKey,1, thresholdTime);
        return;
    }else{
        const keyTtl = await getKeyTtl(redisExportFrequencyKey);
        console.log("keyTtl is ", keyTtl)
        await pushStringToRedisWithKey(redisExportFrequencyKey, updatedFrequency, keyTtl);
        return;
    }

}



module.exports = {
    checkFrequencyAndUpdatePrice
}