const {ethers} = require("ethers");
const {BALANCER_V2_BASED_ABI} = require("../priceExporterHelpers/routerABI")
const {getEvmProvider} = require("../web3Helper/getProvider")
const {getAssetDetailsOfParent} = require("../priceExporterHelpers/assetDataHelper")
const logger = require("../utils/logger")
const Sentry = require("@sentry/node");
const { getPath, savePathDataInRedis } = require("../priceExporterHelpers/pathFinderHelpers");
const {UNKNOWN_TID} = require("../constants");



const contractAddresses = {
    16116 : {
        dex: "Defi Verse Gaming DEX",
        factory: '',
        router: '0x2fa699664752b34e90a414a42d62d7a8b2702b85', 
    },

}

const pools = {
    "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2" : {    // USDC.e
        "0x5a89E11Cb554E00c2f51C4bb7F05bc7Ab0Fa6351" : "0x2c2832dc1e613c4fe8cd58de3b89de1759fdf589000200000000000000000003", //WOAS
    },

    "0x4362Be024eFbb8C6fBcF19675224b58dFd2493Ef" : {  // bccp
        "0x5a89E11Cb554E00c2f51C4bb7F05bc7Ab0Fa6351":"0x202034abf8ce428ae8effb1214a65de398f2dd4b000200000000000000000006", //WOAS
    },

    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" : {  //WBTC
        "0x5a89E11Cb554E00c2f51C4bb7F05bc7Ab0Fa6351": "0x1f712f57a0ad1dbde1accb4d60e3d62e2f51ff60000200000000000000000000", //WOAS
        "0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea":"0x6e338b9dc0056cf26240f1d21273650bebee7a3a000200000000000000000008" //WETH
    },

    "0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea" : {  //WETH
        "0x5a89E11Cb554E00c2f51C4bb7F05bc7Ab0Fa6351": "0xaa497b8ddd92f3a8a82bca33f8adfc7d022d90ba000200000000000000000004", //WOAS
        "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb":"0x6e338b9dc0056cf26240f1d21273650bebee7a3a000200000000000000000008" //WBTC

    }, 
    "0x5a89E11Cb554E00c2f51C4bb7F05bc7Ab0Fa6351" : { // WOAS
        "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2": "0x2c2832dc1e613c4fe8cd58de3b89de1759fdf589000200000000000000000003", //USDC.e
        "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" : "0x1f712f57a0ad1dbde1accb4d60e3d62e2f51ff60000200000000000000000000", //WBTC
        "0xE7798f023fC62146e8Aa1b36Da45fb70855a77Ea": "0xaa497b8ddd92f3a8a82bca33f8adfc7d022d90ba000200000000000000000004", //WETH
        "0x4362Be024eFbb8C6fBcF19675224b58dFd2493Ef": "0x202034abf8ce428ae8effb1214a65de398f2dd4b000200000000000000000006", //BCCP
    }
}


const getExactInPathData = async (path, amountIn) => {

    const swapPath = []

    for(let i=0; i<path.length-1; i++){
        const BatchSwapStep = {
            poolId: pools[ ethers.utils.getAddress(path[i])][ethers.utils.getAddress(path[i+1])],
            assetInIndex: i,
            assetOutIndex: i+1,
            amount: i == 0 ? amountIn: 0,
            userData: "0x" 
        }
        swapPath.push(BatchSwapStep)
    }


    const funds = {
        sender: "0xefb98d7283252d4f6f913e153688C015C18Fa396",
        fromInternalBalance: false,
        recipient: "0xefb98d7283252d4f6f913e153688C015C18Fa396",
        toInternalBalance: false
    }

    return {swapAssets: path, swapPath: swapPath, funds}
}

const getExactOutPathData = async (path, amountOut) => {

    const swapPath = []

    const reversedPath = path.reverse()

    for(let i=0; i<reversedPath.length-1; i++){
        const BatchSwapStep = {
            poolId: pools[ ethers.utils.getAddress(reversedPath[i])][ethers.utils.getAddress(reversedPath[i+1])],
            assetInIndex: i+1,
            assetOutIndex: i,
            amount: i == 0 ? amountOut: 0,
            userData: "0x" 
        }
        swapPath.push(BatchSwapStep)
        // console.log(i)
    }

    // for(let i=path.length-1; i>0; i--){
    //     const BatchSwapStep = {
    //         poolId: pools[ ethers.utils.getAddress(path[i])][ethers.utils.getAddress(path[i-1])],
    //         assetInIndex: i-1,
    //         assetOutIndex: i,
    //         amount: i == path.length-1 ? amountOut: 0,
    //         userData: "0x" 
    //     }
    //     swapPath.push(BatchSwapStep)
    //     console.log(i)
    // }


    const funds = {
        sender: "0xefb98d7283252d4f6f913e153688C015C18Fa396",
        fromInternalBalance: false,
        recipient: "0xefb98d7283252d4f6f913e153688C015C18Fa396",
        toInternalBalance: false
    }

    return {swapAssets: reversedPath, swapPath: swapPath, funds}
}


const getAmountIn = async (routerContractAddress, provider, amountOut, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        BALANCER_V2_BASED_ABI,
        provider
    );

    const pathData = await getExactOutPathData(path, amountOut)

    // console.log(pathData.swapAssets)
    // console.log(pathData.swapPath)
    // console.log(pathData.funds)


    const amounts = await router.callStatic.queryBatchSwap(1, pathData.swapPath, pathData.swapAssets, pathData.funds );
    console.log(amounts.map((am) => am.toString()));
    return {val: amounts[pathData.swapAssets.length-1], pathData}
}


const getAmountOut = async (routerContractAddress, provider, amountIn, path ) => {
    const router = new ethers.Contract(
        routerContractAddress,
        BALANCER_V2_BASED_ABI,
        provider
    );

    const pathData = await getExactInPathData(path, amountIn)

    // console.log(pathData.swapPath)
    // console.log(pathData.funds)

    const amounts = await router.callStatic.queryBatchSwap(0, pathData.swapPath, pathData.swapAssets, pathData.funds );;
    console.log(amounts.map((am) => am.toString()));
    return {val: BigInt(Math.abs(amounts[path.length - 1])), pathData}
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

                        const {val: outAmount, pathData } = await getAmountOut(contractAddresses[tokenIn.network_id].router, provider,
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
            
                        const {val: inAmount, pathData} = await getAmountIn(contractAddresses[tokenIn.network_id].router, provider,
                            amountOutInUnits,  path);
                        console.log(`InAmount Recieved from Dex-> ${inAmount} ${tokenIn.asset_name}`)

                        const parsedInAmount = ethers.utils.formatUnits(inAmount.toString(), tokenIn.decimals);
                        console.log(`Formated InAmount After Decimal Processing -> ${parsedInAmount} ${tokenIn.asset_name}`)
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_OUT", pathData)
                        const exactInPath = pathData.swapAssets.reverse() // Reverse again for storing for exact in i.e, its straight path
                        const exactInPathData = await getExactInPathData(exactInPath, "100")
                        await savePathDataInRedis(tokenIn, tokenOut,"EXACT_IN", exactInPathData)
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