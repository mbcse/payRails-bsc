const database = require("../DataLayer/database")

const getAssetDetailsOfParent = async (childTokenIn, childTokenOut, amount) => {
    const parentTokenInData = await database.getAssetData(childTokenIn.asset_name, childTokenIn.parent_chain_details_id);
    const parentTokenOutData = await database.getAssetData(childTokenOut.asset_name, childTokenOut.parent_chain_details_id);
    return {tokenIn: parentTokenInData, tokenOut: parentTokenOutData, amount};
}


module.exports = {
    getAssetDetailsOfParent
}