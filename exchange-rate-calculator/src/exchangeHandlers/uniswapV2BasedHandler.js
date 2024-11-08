const {ethers} = require("ethers");
const {UNISWAP_V2_BASED_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");
const { getPath, savePathDataInRedis } = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");

const contractAddresses = {
    53935 : {
        dex: "DFK DEX V1",
        factory: '0x794C07912474351b3134E6D6B3B7b3b4A07cbAAa',
        router: '0x3C351E1afdd1b1BC44e931E12D4E05D6125eaeCa', 
    },
    97: {
        dex: "PANCAKE SWAP V2",
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', 
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', 
    },
    56: {
        dex: "PANCAKE SWAP V2",
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', 
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', 
    },
    248: {
        dex: "TEAL SWAP V2",
        factory: '0x5200000000000000000000000000000000000018', 
        router: '0x5200000000000000000000000000000000000019', 
    },
    9372: {
        dex: "TEAL SWAP V2",
        factory: '0x5200000000000000000000000000000000000018', 
        router: '0x5200000000000000000000000000000000000019', 
    },
    43114: {
        dex: "TRADER JOE V1",
        factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10', 
        router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', 
    },
    43113: {
        dex: "TRADER JOE V1",
        factory: '0xF5c7d9733e5f53abCC1695820c4818C59B457C2C', 
        router: '0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901', 
    },

    7225878: {
        dex: "Taffy Dex",
        factory: '0xb9FFd4f89A86a989069CAcaE90e9ce824D0c4971', 
        router: '0x62BFfED6057555BaDD59e6C512a46c46898328f7', 
    },



}


const getAmountIn = async (routerContractAddress, provider, amountOut, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        UNISWAP_V2_BASED_ABI,
        provider
    );

    const amounts = await router.getAmountsIn(amountOut,  path);
    console.log(amounts.toString())
    return amounts[0]
}


const getAmountOut = async (routerContractAddress, provider, amountIn, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        UNISWAP_V2_BASED_ABI,
        provider
    );

    const amounts = await router.getAmountsOut(amountIn,  path);
    console.log(amounts.toString())
    return amounts[path.length - 1]
}



const getPairPriceOnParent = async (childTokenIn, childTokenOut, childAmount, tradeType, tid = UNKNOWN_TID) => {
        try{
            const {tokenIn, tokenOut, amount} = await getAssetDetailsOfParent(childTokenIn, childTokenOut, childAmount);
            const path = await getPath(tokenIn, tokenOut);
            return await getPairPriceHandler(tokenIn, tokenOut, amount, tradeType, path, tid);
        }catch(err) {
            console.log(err)
            logger.error(`Error while getting Pair Price On Parent`)
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

                        const outAmount = await getAmountOut(contractAddresses[tokenIn.network_id].router, provider,
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
            
                        const inAmount = await getAmountIn(contractAddresses[tokenIn.network_id].router, provider,
                            amountOutInUnits,  path);
                        console.log(`InAmount Recieved from Dex-> ${inAmount} ${tokenIn.asset_name}`)

                        const parsedInAmount = ethers.utils.formatUnits(inAmount.toString(), tokenIn.decimals);
                        console.log(`Formated InAmount After Decimal Processing -> ${parsedInAmount} ${tokenIn.asset_name}`)
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_OUT", path)
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_IN", path)
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