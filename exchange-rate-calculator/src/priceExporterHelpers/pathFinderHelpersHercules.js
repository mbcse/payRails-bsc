const { ethers } = require("ethers")
const database = require("../DataLayer/database");
const {  ALGEBRA_BASED_FACTORY_ABI, ALGEBRA_BASED_POOL_ABI } = require("./factoryABI");
const redis = require("../DataLayer/redis/redis");

const getAlgebraFactoryAddress = (chainId) => {
    switch(chainId) {
        case 1088: return "0xC5BfA92f27dF36d268422EE314a1387bB5ffB06A";
        default: return "0xC5BfA92f27dF36d268422EE314a1387bB5ffB06A";
    }
}

const getUnWrappedId = async (token) => {
    console.log(`Getting Unwrapped Token ID, for Asset Id -> ${token.asset_id}`)
    // const idlen= token.asset_id.length
    // if(token.asset_name.startsWith("W")){
    //     const nativeTokenAssetId = token.asset_id.substring(0,idlen-2)
    //     console.log("THIS SEEMS TO BE WRAPPED TOKEN : QUERYING PATH ON NATIVE TOKEN WITH ASSET ID -> "+ nativeTokenAssetId)
    //     return nativeTokenAssetId
    // }
    // console.log("THIS DOESN'T SEEMS TO BE WRAPPED TOKEN")
    // return token.asset_id

    const UnwrappedTokenName = token.asset_name.substring(1) //Removing W
    const UnwrappedToken = await database.getAssetData(UnwrappedTokenName, token.chain_details_id)
    console.log(`UnWrapped Token Id -> ${UnwrappedToken.asset_id}`)
    return UnwrappedToken.asset_id
}



const getUniswapV3PathFee = async (token1Address, token2Address, provider) => {
    console.log(`Finding Uniswap V3 Fee Tier for pair ${token1Address} <-> ${token2Address}`)
    if(await algebraV3PoolExists(token1Address, token2Address, provider, '3000')){
        console.log("Pool Found with fee 0.3%")
        return '3000'
    }else if(await algebraV3PoolExists(token1Address, token2Address, provider, '500')){
        console.log("Pool Found with fee 0.05%")
        return '500'
    }else if(await algebraV3PoolExists(token1Address, token2Address, provider, '10000')){
        console.log("Pool Found with fee 1%")
        return '10000'
    }else if(await algebraV3PoolExists(token1Address, token2Address, provider, '100')){
        console.log("Pool Found with fee 0.01%")
        return '100'
    }else{
        throw new Error("Find Pool Fee Error => All Fee Tiers Scanned : No Pool Found")
    }
}

const algebraV3PoolExists = async (token1Address, token2Address, provider, fee) => {
    console.log(`Finding Pool with fee: ${fee/10000}% between ${token1Address} <-> ${token2Address}`)
    const {chainId} = await provider.getNetwork();
    const factoryAddress = getAlgebraFactoryAddress(chainId)
    try{
            const factoryContract = new ethers.Contract(factoryAddress, ALGEBRA_BASED_FACTORY_ABI, provider);
            const poolAddress = await factoryContract.poolByPair(token1Address, token2Address);
            console.log("PoolAddress => "+ poolAddress)
            if(poolAddress === '0x0000000000000000000000000000000000000000') {
                console.log(`No Pool Found with fee tier: ${fee/10000}%`)
                return false
            };
            const poolContract = new ethers.Contract(poolAddress, ALGEBRA_BASED_POOL_ABI, provider);

            const globalState = await poolContract.globalState();

            return globalState[2] == fee;
        
    }catch(err){
        console.log("Something Went Wrong while finding Pool: " + err)
        return false;
    }
}

const getPath = async (tokenIn, tokenOut) => {
    console.log(`Finding Path for Pair ${tokenIn.asset_name} -> ${tokenOut.asset_name}`)

    let path = await database.getRoutePath(tokenIn.asset_id, tokenOut.asset_id);
    console.log(`${path && path.length > 0 ? `${`Intermediate Token Path Found for pair ${tokenIn.asset_name} -> ${tokenOut.asset_name} with addresses => `+ path}` : `No Path Found for pair ${tokenIn.asset_name} -> ${tokenOut.asset_name}...Executing on Default`}`)
    if(!path) path = []
    path.unshift(tokenIn.contract_address)
    path.push(tokenOut.contract_address)
    console.log(`Final Path => ${path}`)
    return path
}

const getEncodedAlgebraV3Path = async (path, provider) => {
    console.log(`Getting Uniswap V3 Encoded Path`)
    let typeArray  = []
    let pathArray = []
    // const fee = 3000;
    const pathLen = path.length
    for(let i=0; i<pathLen; i++){
        // if(i==0) continue;
        typeArray.push('address')
        pathArray.push(path[i])

    }
    console.log(`Final Algebra V3 Path Constructed = ${pathArray}`)
    const encodedPath = ethers.utils.solidityPack(typeArray, pathArray)
    return encodedPath
}


const savePathDataInRedis = async (fromToken, toToken, swapType, pathData) => {
    console.log(`Saving Path Data in Redis`)
    const key = `pathData/${fromToken.asset_id}/${toToken.asset_id}/${swapType}`
    await redis.pushStringToRedisWithKey(key, pathData)
    if(fromToken.is_wrapped){
        const unWrappedId =  await getUnWrappedId(fromToken)
        const key = `pathData/${unWrappedId}/${toToken.asset_id}/${swapType}`
        await redis.pushStringToRedisWithKey(key, pathData)
    }else if(toToken.is_wrapped){
        const unWrappedId =  await getUnWrappedId(toToken)
        const key = `pathData/${fromToken.asset_id}/${unWrappedId}/${swapType}`
        await redis.pushStringToRedisWithKey(key, pathData)
    }
}


module.exports = {getPath, getEncodedAlgebraV3Path, savePathDataInRedis}