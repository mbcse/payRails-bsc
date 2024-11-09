const pancakeSwapV2Handler = require("../exchangeHandlers/pancakeSwapV2Handler");
const tealSwapV2Handler = require("../exchangeHandlers/tealSwapV2Handler");
const traderJoeV2Handler = require("../exchangeHandlers/traderJoeV2Handler");
const uniswapV2BasedHandler = require("../exchangeHandlers/uniswapV2BasedHandler");
const uniswapV3BasedHandler = require("../exchangeHandlers/uniswapV3BasedHandler");
const balancerV2BasedHandler = require("../exchangeHandlers/balancerV2BasedHandler");
const cantoV1BasedHandler = require("../exchangeHandlers/cantoV1BasedHandler");
const herculesV3BasedHandler = require("../exchangeHandlers/herculesV3BasedHandler");
const Sentry = require("@sentry/node");
const constants = require("../constants");
const database = require("../DataLayer/database");
const logger = require("../utils/logger");
const ethers = require("ethers")
const {getStringKey} = require("../DataLayer/redis/redis");
const {getPath} = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");

async function getChainUSDCTokenData(tokenData){
    if(tokenData.network_id == 56 || tokenData.network_id == 97){
        return await database.getAssetData(constants.BINANCEUSD, tokenData.chain_details_id);
    }
    return await database.getAssetData(constants.USDCCurrencyType, tokenData.chain_details_id);
}

function calcDifference(actualValue, calcValue) {
    let val = ((calcValue - actualValue) / actualValue) * 100;
    return Math.abs(val);
}

function getcalcValue(noOftoken, singleTokenPrice) {
    return noOftoken * singleTokenPrice;
}

function matchDifference(amount1, amount2) {

    if (amount1 > amount2 && amount1 < (amount2 + 0.1)) {
        return true;
    }
    return false;
}


const pairPriceGenerator = async (fromToken, toToken) => {
 try {
        console.log(`!---------------------------STARTING PAIR PRICE GENERATOR BY ALGORITHM FOR PAIR => ${fromToken.asset_name} -> ${toToken.asset_name}---------------------------!`)
        // fetch usdc Token
        let usdTokenData = await getChainUSDCTokenData(fromToken);
        var token1EquivalentAmount = 0;
        if (fromToken.contract_address == usdTokenData.contract_address) {
            token1EquivalentAmount = constants.USDCBaseAmount;
        } else {
            token1EquivalentAmount = await getPairPrice(usdTokenData, fromToken, constants.USDCBaseAmount, "IN")
        }

        // get the equivalent amount recieved for token1 worth 0.01 usdc..

        const token2EquivalentAmount = await getPairPrice(fromToken, toToken, token1EquivalentAmount, "IN");
        // get the base Unit Price..
        const unitPrice = token2EquivalentAmount / token1EquivalentAmount;

        let maxSize = constants.windowMaxSize;
        let minSize = token1EquivalentAmount;
        let toleranceLimitPercentage = constants.toleranceLimit;
        let start = parseFloat(parseFloat(minSize).toFixed(constants.priceDecimalPrecision));
        let end = parseFloat(parseFloat(maxSize).toFixed(constants.priceDecimalPrecision));
        let lastToken1Spent = 0;
        let map = new Map();
        let noValueFound = false;
        while (start < end) {
            // console.log("start-> ",start, "end->", end);
            let limitFound = false;
            while (start < end) {
                let middle;
                try {
                    // console.log("start-> ",start, "end->", end);
                    middle = parseFloat(start + (end - start) / 2);
                    // console.log("middle->", middle)
                    middle = parseFloat(middle.toFixed(constants.priceDecimalPrecision));
                    let middlePrice = await getPairPrice(fromToken, toToken, middle.toString(), "IN");
                    // console.log("middle price->", middlePrice)
                    let differencePercentage = calcDifference(middlePrice, getcalcValue(middle, unitPrice))
                    // console.log("diff percent->", differencePercentage)
                    // console.log("toleance percent->", toleranceLimitPercentage)
                    if (matchDifference(differencePercentage, toleranceLimitPercentage)) {
                        // console.log("match difference executing->")
                        const token1Spend = middle;
                        let token2RecievedWithTolerance = middlePrice / middle;
                        map.set(token1Spend.toFixed(constants.priceDecimalPrecision), token2RecievedWithTolerance);
                        lastToken1Spent = token1Spend;
                        limitFound = true;
                        noValueFound = false;
                        break;
                    } else if (differencePercentage > toleranceLimitPercentage) {
                        end = parseFloat(middle) - 1;
                        // console.log("else if->", end)
                    } else {
                        start = parseFloat(middle) + 1;
                        // console.log("else->", start)
    
                    }
                } catch (error) {
                    // Adjust max size and try again
                    if (middle > 10){
                    end = parseFloat(middle) - 1; // Reduce max size
                    if(end<0) throw error;
                    console.log("error at middle amount-> ", middle, "may be due to liquidity issue, trying at end = ", end)
                    continue; // Retry with the new max size
                    }else{
                        end = parseFloat(middle) - 0.1; // Reduce max size
                        if(end<0) throw error;
                        console.log("error at middle amount-> ", middle, "may be due to liquidity issue, trying at end = ", end)
                        continue; // Retry with the new max size
                    }
                }
            }
            if (!limitFound) {
                // console.log("no limit found")
                noValueFound = true;
                break;
            }
            toleranceLimitPercentage += constants.toleranceLimit;
            // console.log("tolenrance limit percent->", toleranceLimitPercentage)
            start = lastToken1Spent + 1;
            end = maxSize;
        }
        if (noValueFound) {
            // console.log("no limit found")
            map.set(Number.parseFloat(maxSize).toFixed(constants.priceDecimalPrecision), Number.parseFloat(unitPrice).toFixed(constants.priceDecimalPrecision));
        }

        console.log(`!XXXXXXXXXXXXXXXXXXXXXXXXXX-PAIR PRICE GENERATION BY ALGORITHM COMPLETED-XXXXXXXXXXXXXXXXXXXXXXXXXX!`)
        return map;
    } catch (err) {
        console.log(err)
        Sentry.captureException(err);
        logger.debug(err)
        throw err;
    }
}


const getPairPrice = async (tokenIn, tokenOut, amount, tradeType, tid = UNKNOWN_TID, swapType = 'EXACT_IN') => {
    console.log(`!---------------STARTING PAIR PRICE CALCULATION FOR PAIR => ${tokenIn.asset_name} -> ${tokenOut.asset_name}---------------!`)

    if(tokenIn.contract_address == tokenOut.contract_address){
        console.log(`TokenIn and TokenOut Contract Address found same: Seems Bridge Condition, returning same amount!`)
        return amount;
    }

    const path = await getPath(tokenIn, tokenOut)

    let output;
    switch(tokenIn.network_id) {
        case '1088':                                                                       
            output =  await herculesV3BasedHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
            break;
        case '43113':
            output =  await traderJoeV2Handler(tokenIn, tokenOut, amount, tradeType, path, tid);
        case '43114':
            output =  await traderJoeV2Handler(tokenIn, tokenOut, amount, tradeType, path, tid);
            break; 
        case '16116':
            output =  await balancerV2BasedHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
            break;
        case '7700' :   
            output = await cantoV1BasedHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
            break;                
        case '97':
            // output =  await pancakeSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break; 
        case '56':
            // output =  await pancakeSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break;    
        case '248':
            // output =  await tealSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break;
        case '9372':
            // output =  await tealSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break;      
        case '29548':
            // output =  await tealSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break;
        case '20197':
            // output =  await tealSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            // break;
        case '40875':
            // output =  await tealSwapV2Handler(tokenIn, tokenOut, amount, tradeType, path);
            //break;
        case '7225878':
        case '19011':   
        case '16116':   
        case '7225878': 
        case '53935':
            output =  await uniswapV2BasedHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
            break;
        case '8453':
        case '42161':
        case '1':
        default:
            output =  await uniswapV3BasedHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
    }


    if(tokenIn.chain_type == "TESTNET") {
        const slippageKey = swapType === 'EXACT_OUT' ? 'slippage-testnet-out' : 'slippage-testnet-in'
        console.log("Slippage Key being used: ", slippageKey)

        const slippage = parseFloat(await getStringKey(slippageKey))

        if(!slippage) throw new Error ("Testnet Slipage not found in redis")
        else console.log(`Slippage Found with Value ${slippage}`)

        let outputWithSlipage = toFixedRoundUp((output * slippage), constants.priceDecimalPrecision)
        console.log(`Amount After Slippage ${outputWithSlipage}`)

        if(parseFloat(outputWithSlipage) < 0.00001){ 
            console.log(`Resulted Amount seems less than 0.00001, returning min result value = 0.00001`)
            outputWithSlipage = (0.00001).toString()
        }

        console.log(`!XXXXXXXXXXXXX--PAIR PRICE CALCULATION COMPLETED--XXXXXXXXXXXXX!`)

        return outputWithSlipage;
    }else{
        const slippageKey = swapType === 'EXACT_OUT' ? 'slippage-mainnet-out' : 'slippage-mainnet-in'
        console.log("Slippage Key being used: ", slippageKey)

        const slippage = parseFloat(await getStringKey(slippageKey))

        if(!slippage) throw new Error ("Mainnet Slipage not found in redis")
        else console.log(`Slippage Found with Value ${slippage}`)

        let outputWithSlipage = toFixedRoundUp((output * slippage), constants.priceDecimalPrecision)
        console.log(`Amount After Slippage ${outputWithSlipage}`)

        if(parseFloat(outputWithSlipage) < 0.00001) { 
            console.log(`Resulted Amount seems less than 0.00001, returning min result value = 0.00001`)
            outputWithSlipage = (0.00001).toString()
        }
        console.log(`!XXXXXXXXXXXXX--PAIR PRICE CALCULATION COMPLETED--XXXXXXXXXXXXX!`)
        return outputWithSlipage;
    }
}


function toFixedRoundUp(number, precision) {
    const factor = 10 ** precision;
    return (Math.ceil(number * factor) / factor).toFixed(precision);
}



module.exports = {
    pairPriceGenerator,
    getPairPrice,
    getChainUSDCTokenData
}


