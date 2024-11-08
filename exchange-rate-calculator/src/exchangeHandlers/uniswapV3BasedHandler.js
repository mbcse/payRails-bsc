const {ethers} = require("ethers");
const {UNISWAP_V3_BASED_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const {getPairPrice: pairUp} = require("../priceExporterHandler/index")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");
const { getPath, getEncodedUniswapV3Path, savePathDataInRedis } = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");

const contractAddresses = {
    1: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },
    5: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },
    137: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },
    80001: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },
    420: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },
    10: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },

    42161: {
        dex: "UNISWAP V3",
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', 
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', 
    },

    8453: {
        dex: "UNISWAP V3",
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', 
        quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', 
    
    },

    1088: {
        dex: "HERCULES",
        factory: '0xC5BfA92f27dF36d268422EE314a1387bB5ffB06A', 
        quoter: '0xdc2496c72911542a359B9c4d6Fc114c9a392e3D7',
    },

}

const getAmountIn = async (quoterContractAddress, provider, amountOut, path ) => {
    const quoter = new ethers.Contract(
        quoterContractAddress,
        UNISWAP_V3_BASED_ABI,
        provider
    );

    const inAmount = await quoter.callStatic.quoteExactOutput(path, amountOut);
    
    return inAmount;
}

const getAmountOut = async (quoterContractAddress, provider, amountIn, path ) => {
    const quoter = new ethers.Contract(
        quoterContractAddress,
        UNISWAP_V3_BASED_ABI,
        provider
    );

    const outAmount = await quoter.callStatic.quoteExactInput(path, amountIn);
    return outAmount
}





const getPairPriceOnParent = async (childTokenIn, childTokenOut, childAmount, tradeType) => {
    try{
        const {tokenIn, tokenOut, amount} = await getAssetDetailsOfParent(childTokenIn, childTokenOut, childAmount);
        const path = await getPath(tokenIn, tokenOut);
        return await getPairPriceHandler(tokenIn, tokenOut, amount, tradeType, path);
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

                        // const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenIn.contract_address, 3000, tokenOut.contract_address])
                        const encodedPath = await getEncodedUniswapV3Path(path, provider)

                        const outAmount = await getAmountOut(contractAddresses[tokenIn.network_id].quoter, provider,
                            amountInInUnits,  encodedPath);
                        console.log(`OutAmount Recieved from Dex-> ${outAmount} ${tokenOut.asset_name}`)

                        const parsedOutAmount = ethers.utils.formatUnits(outAmount.toString(), tokenOut.decimals);
                        console.log(`Formated OutAmount After Decimal Processing -> ${parsedOutAmount} ${tokenOut.asset_name}`)

                        return parsedOutAmount; 

                    }else { // Out Amount Given condition

                        console.log(`Getting In Amount For Pair`)
                        console.log(`OutAmount Provided -> ${amount} ${tokenOut.asset_name}`)


                        const amountOutInUnits = ethers.utils.parseUnits(amount, tokenOut.decimals);
                        console.log(`Parsed OutAmount After Decimal Processing -> ${amountOutInUnits} ${tokenOut.asset_name}`)

                        // Remember in get amount In the path should be tokenOut -> tokenIn I.E, in reverse order
                        // const path = ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenOut.contract_address, 3000, tokenIn.contract_address])
                        const encodedPath = await getEncodedUniswapV3Path(path.reverse(), provider)

                        const inAmount = await getAmountIn(contractAddresses[tokenIn.network_id].quoter, provider,
                            amountOutInUnits,  encodedPath);
                        console.log(`InAmount Recieved from Dex-> ${inAmount} ${tokenIn.asset_name}`)

                        const parsedInAmount = ethers.utils.formatUnits(inAmount.toString(), tokenIn.decimals);
                        console.log(`Formated InAmount After Decimal Processing -> ${parsedInAmount} ${tokenIn.asset_name}`);

                        //Saving Exact Out Path 
                        await savePathDataInRedis(tokenIn, tokenOut, 'EXACT_OUT', encodedPath);
                        //Saving Exact In Path 
                        const encodedPathIN = await getEncodedUniswapV3Path(path.reverse(), provider)
                        await savePathDataInRedis(tokenIn, tokenOut, "EXACT_IN", encodedPathIN);
                        
                        return parsedInAmount

                    }
        } catch (error) {
            logger.warn(`Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetching Failed with error ${error}`, ({
                tid: tid
            }))
            if(error.code === "NETWORK_ERROR") {
                throw error
            }
            if(tokenIn.chain_details_id !== tokenIn.parent_chain_details_id){
                logger.info(`Trying Pair(${tokenIn.asset_name} -> ${tokenOut.asset_name}) Price Fetch on Parent Network`, ({
                    tid: tid
                }))
                return await getPairPriceOnParent(tokenIn, tokenOut, amount, tradeType)
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