const {ethers} = require("ethers");
const {UNISWAP_V2_BASED_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");

const contractAddresses = {
    97: {
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', 
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', 
    },
    56: {
        factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', 
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', 
    },

}


const getAmountIn = async (routerContractAddress, provider, amountOut, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        UNISWAP_V2_BASED_ABI,
        provider
    );

    const amounts = await router.getAmountsIn(amountOut,  path);

    return amounts[0]
}


const getAmountOut = async (routerContractAddress, provider, amountIn, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        UNISWAP_V2_BASED_ABI,
        provider
    );

    const amounts = await router.getAmountsOut(amountIn,  path);
    return amounts[1]
}



const getPairPriceOnParent = async (childTokenIn, childTokenOut, childAmount, tradeType) => {
        try{
            const {tokenIn, tokenOut, amount} = await getAssetDetailsOfParent(childTokenIn, childTokenOut, childAmount);
            return await getPairPriceHandler(tokenIn, tokenOut, amount, tradeType);
        }catch(err) {
            console.log(err)
            logger.error(`Error while getting Pair Price On Parent`)
            Sentry.captureException(err)
            throw err;
        }
      
}


const getPairPriceHandler = async (tokenIn, tokenOut, amount, tradeType) => {
        try {
                    logger.info(`Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) on chain ${tokenIn.chain_details_id} Price Fetch From Pancake Swap V2 Exchange`)
                    const provider = await getEvmProvider(tokenIn.chain_details_id);
                    if(tradeType === "IN") {
                        const amountInInUnits = ethers.utils.parseUnits(amount, tokenIn.decimals);
            
                        const outAmount = await getAmountOut(contractAddresses[tokenIn.network_id].router, provider,
                            amountInInUnits,  [tokenIn.contract_address, tokenOut.contract_address]);
                
                        return ethers.utils.formatUnits(outAmount.toString(), tokenOut.decimals);

                    }else { // Out condition
                        const amountOutInUnits = ethers.utils.parseUnits(amount, tokenOut.decimals);
            
                        const inAmount = await getAmountIn(contractAddresses[tokenIn.network_id].router, provider,
                            amountOutInUnits,  [tokenIn.contract_address, tokenOut.contract_address]);
                
                        return ethers.utils.formatUnits(inAmount.toString(), tokenIn.decimals);
                    }
                    
        } catch (error) {
            logger.warn(`Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetching Failed with error ${error}`)
            if(error.code === "NETWORK_ERROR") {
                throw error
            }
            if(tokenIn.chain_details_id != tokenIn.parent_chain_details_id){
                logger.info(`Trying Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetch on Parent Network`)
                return await getPairPriceOnParent(tokenIn, tokenOut, amount, tradeType)
            }
            else{
                logger.error(`All Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetch Trials on Parent Network Failed`)
                Sentry.captureException(error);
                throw error
            }      
        }
}




module.exports = getPairPriceHandler;