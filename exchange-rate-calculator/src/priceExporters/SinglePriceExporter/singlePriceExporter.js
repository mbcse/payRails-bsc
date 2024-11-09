const redis = require("../../DataLayer/redis/redis");
const database = require("../../DataLayer/database");
const Sentry = require("@sentry/node");
const generatePairRedisKey = require("../../priceExporterHelpers/generatePairRedisKey");
const {getPairPrice, pairPriceGenerator} = require("../../priceExporterHandler")
const logger = require("../../utils/logger");
const {UNKNOWN_TID} = require("../../constants");
const { getPriceInUSD } = require("../BulkExporter/bulkPriceExporter");


 const singlePairPriceUpload = async (priceRequest) => {
        try {
            let [fromToken,toToken] = await Promise.all([
                database.getAssetData(priceRequest.fromTokenName, priceRequest.chainDetailsId),
                database.getAssetData(priceRequest.toTokenName, priceRequest.chainDetailsId)
            ]);

            console.log(`!-----------------------------------------STARTING SINGLE PAIR PRICE EXPORT FOR PAIR ${fromToken.asset_name} -> ${toToken.asset_name}-----------------------------------------!`)

            if(fromToken.is_native){
                logger.debug("From Token is Found as Native Currency, Fetching Price using Wrapped Token")
                fromToken = await database.getAssetData("W"+priceRequest.fromTokenName, priceRequest.chainDetailsId);
            }

            if(toToken.is_native){
                logger.debug("To Token is Found as Native Currency, Fetching Price using Wrapped Token")
                toToken = await database.getAssetData("W"+priceRequest.toTokenName, priceRequest.chainDetailsId);
            }

            let redisKeyName = generatePairRedisKey(priceRequest.chainDetailsId, priceRequest.fromTokenName, priceRequest.toTokenName);
            const pricesMap = await pairPriceGenerator(fromToken, toToken);
            await redis.pushMapToRedisWithKey(redisKeyName, Object.fromEntries(pricesMap));
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-SINGLE PAIR PRICE EXPORT COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`)
            return pricesMap;
        }catch (err){
            console.log(err)
            throw err;
        }
}


const singleAssetUsdPriceUpload = async (priceRequest) => {
    try {
        let token = await  database.getAssetData(priceRequest.tokenName, priceRequest.chainDetailsId);


        console.log(`!-----------------------------------------STARTING USD PRICE EXPORT FOR ASSET ${token.asset_name} -> ${priceRequest.chainDetailsId}-----------------------------------------!`)

        if(token.is_native){
            logger.debug("Token is Found as Native Currency, Fetching Price using Wrapped Token")
            token = await database.getAssetData("W"+priceRequest.tokenName, priceRequest.chainDetailsId);
        }

         // Calculating currency price in USD....
         let USDRedisKeyName= generatePairRedisKey(priceRequest.chainDetailsId, priceRequest.tokenName, "USD");
         let priceInUSD = 0;
         priceInUSD = await getPriceInUSD(token);
         
         console.log(token.asset_name +" Price in USD -> " + priceInUSD)
         await redis.pushStringToRedisWithKey(USDRedisKeyName, priceInUSD);
         return {priceInUSD: priceInUSD}
    }catch (err){
        console.log(err)
        throw err;
    }
}


module.exports = {
        singlePairPriceUpload,
        singleAssetUsdPriceUpload
}