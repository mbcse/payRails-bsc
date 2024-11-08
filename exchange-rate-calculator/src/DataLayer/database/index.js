const queries = require('../query.js');
const connections = require('../../Connections/connections.js');
const GET_ALL_ASSETS_DATA_QUERY = queries.get_all_asset_data_query;
const GET_ASSET_DATA_QUERY = queries.get_asset_data_query;
const GET_CHAIN_DATA_FROM_ID_QUERY = queries.get_chain_data_from_id
const GET_ALL_ASSETS_DATA_OF_CHAIN_QUERY = queries.get_all_asset_data_of_chain_query;
const GET_ROUTE_PATH_QUERY = queries.get_route_path_query;


module.exports = {
    getAllAssetsData: async () => {
        try {
            const pool = await connections.getPoolClient();
            const result = await pool.query(GET_ALL_ASSETS_DATA_QUERY);
            return result;
        } catch (err) {
            throw err;
        }
    },
    getAllAssetsDataOfChain: async (chainDetailsId) => {
        try {
            const pool = await connections.getPoolClient();
            const result = await pool.query(GET_ALL_ASSETS_DATA_OF_CHAIN_QUERY, [chainDetailsId]);
            return result;
        } catch (err) {
            throw err;
        }
    },
    getAssetData: async (currencyName, chainDetailsId) => {
        try {
            const pool = await connections.getPoolClient();
            let queryResult = await pool.query(GET_ASSET_DATA_QUERY, [currencyName, chainDetailsId]);
            return queryResult.rows[0];
        } catch (err) {
            throw err;
        }
    },
    getChainDataFromId: async function getChainDataFromId(chainDetailsId) {
        try {
            const pool = await connections.getPoolClient();
            let queryResult = await pool.query(GET_CHAIN_DATA_FROM_ID_QUERY, [chainDetailsId]);
            return queryResult.rows[0];
        } catch (err) {
            throw err;
        }
    },

    getRoutePath :  async function getRoutePath(fromAssetId, toAssetId) {
        try {
            const pool = await connections.getPoolClient();
            let queryResult = await pool.query(GET_ROUTE_PATH_QUERY, [fromAssetId, toAssetId]);
            if(queryResult.rows.length>0)
            return queryResult.rows[0].path;
            else
            return null;
        } catch (error) {
            throw error;
        }
    }
}


