const {ethers} = require("ethers");
const {UNISWAP_V2_BASED_ABI, CANTO_V1_BASED_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");
const { getPath, savePathDataInRedis } = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");

const contractAddresses = {
    7700: {
        dex: "Canto Dex",
        factory: '0xE387067f12561e579C5f7d4294f51867E0c1cFba', 
        router: '0xa252eEE9BDe830Ca4793F054B506587027825a8e', 
    },

}


const STABLES_LIST = ["0xd567B3d7B8FE3C79a1AD8dA978812cfC4Fa05e75", "0x80b5a32E4F032B2a058b4F29EC95EEfEEB87aDcd", "0x4e71A2E537B7f9D9413D3991D37958c0b5e1e503"]


const getRoutePath = async (path) => {
    let routePath = []
    for(let i = 0; i < path.length-1; i++){
        let stable = false
        if(STABLES_LIST.includes(path[i]) && STABLES_LIST.includes(path[i+1])) stable = true
        routePath.push([ path[i], path[i+1], stable])
    }

    return routePath
}

const getAmountIn = async (routerContractAddress, provider, amountOut, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        CANTO_V1_BASED_ABI,
        provider
    );

    const amounts = await router.getAmountsIn(amountOut,  path);
    console.log(amounts.toString())
    return amounts[0]
}


const getAmountOut = async (routerContractAddress, provider, amountIn, path ) => {
    let routePath = []
    for(let i = 0; i < path.length-1; i++){
        let stable = false

        if(STABLES_LIST.includes(path[i]) && STABLES_LIST.includes(path[i+1])) stable = true
        routePath.push([ path[i], path[i+1], stable])
    }

    console.log(routePath)

    const router = new ethers.Contract(
        routerContractAddress,
        CANTO_V1_BASED_ABI,
        provider
    );



    const amounts = await router.getAmountsOut(amountIn,  routePath);
    console.log(amounts.toString())
    return {val:amounts[path.length - 1], routePath: routePath}
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

                    let originaTradeType = tradeType

                    if(tradeType === 'OUT'){
                        let temp = tokenIn;
                        tokenIn = tokenOut;
                        tokenOut = temp;
                        tradeType = "IN"  // Canto Dex V1 Only Have ExactIn Functions 
                    }

                   
                    if(tradeType === "IN") {
                        

                        let originalPath = Array.from(path) // Shallow Copy
                        if(originaTradeType === 'OUT') {
                            path.reverse()
                        }

                        console.log(`Getting Out Amount For Pair`)
                        console.log(`InAmount Provided -> ${amount} ${tokenIn.asset_name}`)

                        const amountInInUnits = ethers.utils.parseUnits(amount, tokenIn.decimals);
                        console.log(`Parsed InAmount After Decimal Processing -> ${amountInInUnits} ${tokenIn.asset_name}`)

                        const {val: outAmount, routePath} = await getAmountOut(contractAddresses[tokenIn.network_id].router, provider,
                            amountInInUnits,  path);
                        console.log(`OutAmount Recieved from Dex-> ${outAmount} ${tokenOut.asset_name}`)

                        const parsedOutAmount = ethers.utils.formatUnits(outAmount.toString(), tokenOut.decimals);
                        console.log(`Formated OutAmount After Decimal Processing -> ${parsedOutAmount} ${tokenOut.asset_name}`)

                        if(originaTradeType === "OUT") {
                            // as this was out condition and we swapped the places of in and out for calculation we need to save path in correct order so thats why tokenOut -> tokenIn 
                            let originalRoutePath = await getRoutePath(originalPath)
                            await savePathDataInRedis(tokenOut, tokenIn,"EXACT_OUT", originalRoutePath)
                            await savePathDataInRedis(tokenOut, tokenIn,"EXACT_IN", originalRoutePath)
                        }

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