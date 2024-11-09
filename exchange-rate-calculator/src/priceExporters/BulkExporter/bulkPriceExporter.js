const database = require("../../DataLayer/database");
const combinations = require("../../priceExporterHelpers/generateCombinations");
const redis = require("../../DataLayer/redis/redis");
const Sentry = require("@sentry/node");
const minCryptoCompare = require('../../coinApiPrice/coinApiPrice')
const constants = require("../../constants");
const {getPairPrice, pairPriceGenerator, getChainUSDCTokenData} = require('../../priceExporterHandler');
const sentry = require("../../utils/sentry");
const logger = require("../../utils/logger");
const generatePairRedisKey = require("../../priceExporterHelpers/generatePairRedisKey");


const getPriceInUSD = async (tokenData) => {
    let priceInUSD = 0;
    try{
        console.log("GetPriceInUSD from cryptocompare")
        priceInUSD = await minCryptoCompare.getCryptoComparePrice(tokenData);
        if(!priceInUSD) throw new Error("Could not get USD Price from CryptoCompare")
    }catch (err) {
        console.log("Getting Price from CryptoCompare failed with error")
        console.log("GetPriceInUSD from Dex")
        logger.warn("Could not get USD Price from CryptoCompare, Trying to get from Dex", {err})
        const USDEquivalentTokenData = await getChainUSDCTokenData(tokenData)

       try {
         priceInUSD = await getPairPrice(tokenData, USDEquivalentTokenData, '1', "IN");
       } catch (error) {
            console.log("Get Price in USD for 1 failed, Trying for 0.1 to 1 ")
            logger.warn("Get Price in USD for 1 failed, Trying for 0.1 to 1 ", {error})
            let usdPricesForN = 0;
            let n=0
            for(let i = 0.1; i <= 1;i+=0.1){
                console.log('usdPriceN-> ',usdPricesForN)
                console.log('n-> ',n)
                try {
                    let priceInUSDForI = (await getPairPrice(tokenData, USDEquivalentTokenData, i.toString(), "IN"))/i
                    console.log(priceInUSDForI)
                    usdPricesForN += priceInUSDForI
                    n++
                } catch (error) {
                    continue;
                }  
            }
            console.log('usdPriceN-> ',usdPricesForN)
            console.log('n-> ',n)
            priceInUSD = usdPricesForN/n
       }

        
        
    }
    if(tokenData.asset_name === 'OAS' || tokenData.asset_name === 'WOAS'){
        console.log("Case of OAS, mul by 1.05")
        console.log(typeof(priceInUSD))
        console.log(`original priceInUSD -> ${priceInUSD} new priceInUSD -> ${(priceInUSD * 1.05).toFixed(5)}`)
        return (priceInUSD * 1.05).toFixed(5)
    }
    return priceInUSD;
}

const bulkPriceUpload = async () => {
    try {
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING STARTED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            const result = await database.getAllAssetsData();
            const uniqueCurrencyCombinationsMap = await combinations.getUniqueCombinations(result.rows);
            let pushedKeysData = {}
            for (let currencyKey of uniqueCurrencyCombinationsMap.keys()) {
                console.log(`\n!-------------------------------------------------------${currencyKey}------------------------------------------------------------------!\n`)
                console.log(`!----------------------------------------STARTING PRICE EXPORTING FOR ALL PAIRS OF CHAIN -> ${currencyKey}----------------------------------------!`);
                const pushedKeysList = await exportBulkPrices(currencyKey, uniqueCurrencyCombinationsMap.get(currencyKey));
                pushedKeysData[currencyKey] = pushedKeysList;
                console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-ALL PAIRS PRICE EXPORTING COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            }
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            console.log("!X-------------KEYS EXPORTED TO REDIS-------------------X!")
            console.log(pushedKeysData)
    } catch (err) {
        console.log(err)
        Sentry.captureException(err);
        logger.error("Error While Bulk Exporting")
    }
}


const bulkPriceUploadByChain = async (chainDetailsId) => {
    try {
            console.log(`!----------------------------------------------------BULK EXPORTING BY CHAIN STARTED -----------------------------------------------------!`);
            const result = await database.getAllAssetsDataOfChain(chainDetailsId);
            // console.log(result.rows)
            const uniqueCurrencyCombinationsMap = await combinations.getUniqueCombinations(result.rows);
            // console.log(uniqueCurrencyCombinationsMap)
            let pushedKeysData = {}
            for (let currencyKey of uniqueCurrencyCombinationsMap.keys()) {
                console.log(`\n!-------------------------------------------------------${currencyKey}------------------------------------------------------------------!\n`)
                console.log(`!----------------------------------------STARTING PRICE EXPORTING FOR ALL PAIRS OF CHAIN -> ${currencyKey}----------------------------------------!`);
                const pushedKeysList = await exportBulkPrices(currencyKey, uniqueCurrencyCombinationsMap.get(currencyKey));
                pushedKeysData[currencyKey] = pushedKeysList;
                console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-ALL PAIRS PRICE EXPORTING COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            }
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING BY CHAIN COMPLETED -XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            console.log("!X-------------Keys Exported to Redis-------------------X!")
            console.log(pushedKeysData)
    } catch (err) {
        console.log(err)
        Sentry.captureException(err);
        logger.error("Error While Bulk Exporting")
    }
}




const exportBulkPrices = async (currencyKey, value) => {
    console.log("Executing Export Bulk Prices")
    let pushedKeysList = []
    const value2 = value
    for (let currencyOne of value) {
        const fromCurrencyName = currencyOne.asset_name;
        if(currencyOne.is_native){
            console.log("Currency 1 is found as Native Currency, Fetching Price using Wrapped Token")
            currencyOne = await database.getAssetData("W"+currencyOne.asset_name, currencyOne.chain_details_id); 

            //Save Native Token Price With Respect to Wrapped Token
            let nativeWrappedredisKeyName = generatePairRedisKey(currencyKey, fromCurrencyName, currencyOne.asset_name);
            let wrappedNativeredisKeyName = generatePairRedisKey(currencyKey, currencyOne.asset_name, fromCurrencyName);
            await redis.pushMapToRedisWithKey(nativeWrappedredisKeyName,{'1000.00000':'1.00000'});
            await redis.pushMapToRedisWithKey(wrappedNativeredisKeyName, {'1000.00000':'1.00000'});
            pushedKeysList.push(nativeWrappedredisKeyName);
            pushedKeysList.push(wrappedNativeredisKeyName);

        }
        for (let currencyTwo of value2) {
            const toCurrencyName = currencyTwo.asset_name;
            if(currencyTwo.is_native){
                console.log("Currency 2 is found as Native Currency, Fetching Price using Wrapped Token")
                currencyTwo = await database.getAssetData("W"+currencyTwo.asset_name, currencyTwo.chain_details_id); 
            }
            if (currencyOne.asset_name != currencyTwo.asset_name) {
                console.log(`Exporting Price for Pair ${currencyOne.asset_name} -> ${currencyTwo.asset_name}`)
                let redisKeyName = generatePairRedisKey(currencyKey, fromCurrencyName, toCurrencyName);

                console.log("Getting Price For Key -> " + redisKeyName)
                try {
                    let prices = await pairPriceGenerator(currencyOne, currencyTwo);

                    var pricesObject = Object.fromEntries(prices);
            
                    Sentry.addBreadcrumb({message: "Pushing to redis with Key" + redisKeyName, level: "info"});

                    await redis.pushMapToRedisWithKey(redisKeyName, pricesObject);
                    pushedKeysList.push(redisKeyName);
                    
                    // Calculating currencyOne price in USD....

                    let USDRedisKeyName= generatePairRedisKey(currencyKey, fromCurrencyName, "USD");
                    Sentry.addBreadcrumb({message: "Pushing to redis with Key" + USDRedisKeyName, level: "info"});

                    let priceInUSD = 0;
                    priceInUSD = await getPriceInUSD(currencyOne);
                    
                    console.log(currencyOne.asset_name +" Price in USD -> " + priceInUSD)
                    await redis.pushStringToRedisWithKey(USDRedisKeyName, priceInUSD);
                    pushedKeysList.push(USDRedisKeyName);

                } catch (err) {
                    console.log(err)
                    logger.warn(err)
                    logger.warn(`Exchange Rate Calculation failed for Pair ${currencyOne.asset_name} -> ${currencyTwo.asset_name}`);
                    Sentry.captureException(err);
                    if(err.code === "NETWORK_ERROR") {
                        console.log("Skipping this Chain due to network Failure")
                        break;
                    }
                    continue;
                }
            }
        }
    }

    return pushedKeysList;
}


const bulkUsdPriceUpload = async () => {
    try {
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING USD PRICES STARTED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            const result = await database.getAllAssetsData();
            const uniqueCurrencyCombinationsMap = await combinations.getUniqueCombinations(result.rows);
            let pushedKeysData = {}
            for (let currencyKey of uniqueCurrencyCombinationsMap.keys()) {
                console.log(`\n!-------------------------------------------------------${currencyKey}------------------------------------------------------------------!\n`)
                console.log(`!----------------------------------------STARTING USD PRICE EXPORTING FOR ALL ASSETS OF CHAIN -> ${currencyKey}----------------------------------------!`);
                const pushedKeysList = await exportBulkUsdPrices(currencyKey, uniqueCurrencyCombinationsMap.get(currencyKey));
                pushedKeysData[currencyKey] = pushedKeysList;
                console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-ALL ASSETS USD PRICE EXPORTING COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            }
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING USD PRICES COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            console.log("!X-------------KEYS EXPORTED TO REDIS-------------------X!")
            console.log(pushedKeysData)
    } catch (err) {
        console.log(err)
        Sentry.captureException(err);
        logger.error("Error While Bulk Exporting USD PRICES")
    }
}


const bulkUsdPriceUploadByChain = async (chainDetailsId) => {
    try {
            console.log(`!----------------------------------------------------BULK EXPORTING BY CHAIN STARTED -----------------------------------------------------!`);
            const result = await database.getAllAssetsDataOfChain(chainDetailsId);
            // console.log(result.rows)
            const uniqueCurrencyCombinationsMap = await combinations.getUniqueCombinations(result.rows);
            // console.log(uniqueCurrencyCombinationsMap)
            let pushedKeysData = {}
            for (let currencyKey of uniqueCurrencyCombinationsMap.keys()) {
                console.log(`\n!-------------------------------------------------------${currencyKey}------------------------------------------------------------------!\n`)
                console.log(`!----------------------------------------STARTING USD PRICE EXPORTING FOR ALL ASSETS OF CHAIN -> ${currencyKey}----------------------------------------!`);
                const pushedKeysList = await exportBulkUsdPrices(currencyKey, uniqueCurrencyCombinationsMap.get(currencyKey));
                pushedKeysData[currencyKey] = pushedKeysList;
                console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-ALL ASSETS USD PRICE EXPORTING COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            }
            console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-BULK EXPORTING USD PRICES BY CHAIN COMPLETED -XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX!`);
            console.log("!X-------------Keys Exported to Redis-------------------X!")
            console.log(pushedKeysData)
    } catch (err) {
        console.log(err)
        Sentry.captureException(err);
        logger.error("Error While Bulk Exporting")
    }
}



const exportBulkUsdPrices = async (currencyKey, value) => {
    console.log("Executing Export Bulk USD Prices")
    let pushedKeysList = []
    for (let currency of value) {
        const currencyName = currency.asset_name
        if(currency.is_native){
            console.log("Currency is found as Native Currency, Fetching Price using Wrapped Token")
            currency = await database.getAssetData("W"+currency.asset_name, currency.chain_details_id); 
        }
        // Calculating currency price in USD....
        let USDRedisKeyName= generatePairRedisKey(currencyKey, currencyName, "USD");
        let priceInUSD = 0;
        priceInUSD = await getPriceInUSD(currency);
        
        console.log(currency.asset_name +" Price in USD -> " + priceInUSD)
        await redis.pushStringToRedisWithKey(USDRedisKeyName, priceInUSD);
        pushedKeysList.push(USDRedisKeyName);
    }

    return pushedKeysList;
}





module.exports = {
    bulkPriceUpload,
    bulkPriceUploadByChain,
    bulkUsdPriceUpload,
    bulkUsdPriceUploadByChain,
    getPriceInUSD
}
