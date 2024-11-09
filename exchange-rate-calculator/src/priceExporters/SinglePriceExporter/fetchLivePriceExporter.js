const redis = require("../../DataLayer/redis/redis");
const database = require("../../DataLayer/database");
const Sentry = require("@sentry/node");
const generatePairRedisKey = require("../../priceExporterHelpers/generatePairRedisKey");
const {getPairPrice, pairPriceGenerator} = require("../../priceExporterHandler")
const logger = require("../../utils/logger");
const {UNKNOWN_TID} = require("../../constants");
const { checkFrequencyAndUpdatePrice } = require("../frequencyBasedExporter");


const fetchPrice = async (priceRequest, tid = UNKNOWN_TID) => {
        try {
            let [fromToken,toToken] = await Promise.all([
                database.getAssetData(priceRequest.fromTokenName, priceRequest.chainDetailsId),
                database.getAssetData(priceRequest.toTokenName, priceRequest.chainDetailsId)
            ]);

            if(fromToken.is_native){
                logger.debug("From Token is Found as Native Currency, Fetching Price using Wrapped Token", ({
                    tid: tid
                }))
                fromToken = await database.getAssetData("W"+priceRequest.fromTokenName, priceRequest.chainDetailsId);
            }

            if(toToken.is_native){
                logger.debug("To Token is Found as Native Currency, Fetching Price using Wrapped Token", ({
                    tid: tid
                }))
                toToken = await database.getAssetData("W"+priceRequest.toTokenName, priceRequest.chainDetailsId);
            }


            let swapType = priceRequest.swapType

            //toToken, fromToken, priceRequest.amount, "OUT"
            //fromToken, toToken, priceRequest.amount, "IN"
            let result = await getPairPrice(toToken, fromToken, priceRequest.amount, "OUT", swapType);

            // Check the pair frequency and call export 
            checkFrequencyAndUpdatePrice(fromToken, toToken);

            return {
                'rate': result
            };
        }catch (err){ 
            logger.error(`Err: ${err}`, ({
                tid: tid,
                err:err
            }));
            throw err;
        }
    }



    module.exports = {
        fetchPrice
    }