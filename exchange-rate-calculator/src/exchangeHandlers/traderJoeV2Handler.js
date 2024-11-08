const {ethers, BigNumber} = require("ethers");
const {UNISWAP_V2_BASED_ABI, TRADER_JOE_V2_ABI, TRADER_JOE_V2_QUOTER_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");
const { getPath, savePathDataInRedis } = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");

const contractAddresses = {
    43114: {
        dex: "TRADER JOE V2",
        factory: '0x8e42f2F4101563bF679975178e880FD87d3eFd4e', 
        router: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30', 
        quoter: '0xd76019A16606FDa4651f636D9751f500Ed776250'
    },
    43113: {
        dex: "TRADER JOE V2",
        factory: '0xF5c7d9733e5f53abCC1695820c4818C59B457C2C', 
        router: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30', 
        quoter: '0xd76019A16606FDa4651f636D9751f500Ed776250'
    },

}

function convertBigNumbersToStrings(data) {
    return data.map((row) =>
      row.map((item) => {
        if (item._isBigNumber) {
          return item.toString(); // Convert BigNumber to string
        } else {
          return item; // Keep other values as they are
        }
      })
    );
  }

const getAmountIn = async (quoterContractAddress, provider, amountOut, path ) => {
    const quoter = new ethers.Contract(
        quoterContractAddress,
        TRADER_JOE_V2_QUOTER_ABI,
        provider
    );

    const quote = await quoter.callStatic.findBestPathFromAmountOut(path, amountOut);
    console.log(convertBigNumbersToStrings(quote))
    return {quote:quote[4][0], pathData: [quote[2], quote[3], quote[0]]}
}


const getAmountOut = async (quoterContractAddress, provider, amountIn, path ) => {
    const quoter = new ethers.Contract(
        quoterContractAddress,
        TRADER_JOE_V2_QUOTER_ABI,
        provider
    );

    const quote = await quoter.callStatic.findBestPathFromAmountIn(path, amountIn);
    console.log(convertBigNumbersToStrings(quote))

    return {quote: quote[4][path.length - 1], pathData: null}
}



const getPairPriceOnParent = async (childTokenIn, childTokenOut, childAmount, tradeType, tid = UNKNOWN_TID) => {
        try{
            const {tokenIn, tokenOut, amount} = await getAssetDetailsOfParent(childTokenIn, childTokenOut, childAmount);
            const path = await getPath(tokenIn, tokenOut);
            return await getPairPriceHandler(tokenIn, tokenOut, amount, tradeType, path);
        }catch(err) {
            console.log(err)
            logger.error(`Error while getting Pair Price On Parent`, ({
                tid: tid
            }))
            Sentry.captureException(err)
            throw err;
        }
      
}


const getPairPriceHandler = async (tokenIn, tokenOut, amount, tradeType, path, tid = UNKNOWN_TID) => {

        try {
                    console.log(`Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) on chain ${tokenIn.chain_details_id} Price Fetch From ${contractAddresses[tokenIn.network_id].dex} Exchange`)

                    const provider = await getEvmProvider(tokenIn.chain_details_id);

                    if(tradeType === "IN") {

                        console.log(`Getting Out Amount For Pair`)
                        console.log(`InAmount Provided -> ${amount} ${tokenIn.asset_name}`)

                        const amountInInUnits = ethers.utils.parseUnits(amount, tokenIn.decimals);
                        console.log(`Parsed InAmount After Decimal Processing -> ${amountInInUnits} ${tokenIn.asset_name}`)

                        const {quote: outAmount} = await getAmountOut(contractAddresses[tokenIn.network_id].quoter, provider,
                            amountInInUnits,  path);
                        console.log(`OutAmount Recieved from Dex-> ${outAmount} ${tokenOut.asset_name}`)

                        const parsedOutAmount = ethers.utils.formatUnits(outAmount.toString(), tokenOut.decimals);
                        console.log(`Formated OutAmount After Decimal Processing -> ${parsedOutAmount} ${tokenOut.asset_name}`)
                        return parsedOutAmount;

                    }else { // Out condition
                        console.log(`Getting In Amount For Pair`)
                        console.log(`OutAmount Provided -> ${amount} ${tokenOut.asset_name}`)

                        const amountOutInUnits = ethers.utils.parseUnits(amount, tokenOut.decimals);
                        console.log(`Parsed OutAmount After Decimal Processing -> ${amountOutInUnits} ${tokenOut.asset_name}`)
            
                        const {quote: inAmount, pathData } = await getAmountIn(contractAddresses[tokenIn.network_id].quoter, provider,
                            amountOutInUnits,  path);
                        console.log(`InAmount Recieved from Dex-> ${inAmount} ${tokenIn.asset_name}`)

                        const parsedInAmount= ethers.utils.formatUnits(inAmount.toString(), tokenIn.decimals);
                        console.log(`Formated InAmount After Decimal Processing -> ${parsedInAmount} ${tokenIn.asset_name}`)
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_OUT", pathData)
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_IN", pathData)
                        return parsedInAmount
                    }
                    
        } catch (error) {
            logger.warn(`Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetching Failed with error ${error}`, ({
                tid: tid
            }))
            if(error.code === "NETWORK_ERROR") {
                throw error
            }
            if(tokenIn.chain_details_id != tokenIn.parent_chain_details_id){
                logger.info(`Trying Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetch on Parent Network`, ({
                    tid: tid
                }))
                return await getPairPriceOnParent(tokenIn, tokenOut, amount, tradeType, tid)
            }
            else{
                logger.error(`All Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetch Trials on Parent Network Failed`, ({
                    tid: tid
                }))
                Sentry.captureException(error);
                throw error
            }      
        }
}




module.exports = getPairPriceHandler;