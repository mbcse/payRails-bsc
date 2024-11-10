/* eslint-disable camelcase */
const queries = require('../query.js')
const connections = require('../../Connections/connections.js')
const GET_ALL_ASSESTS = queries.all_assets_query
const GET_PARTICULAR_TOKEN_DATA_QUERY = queries.get_particular_token_data_query
const GET_SMART_CONTRACT_DETAILS = queries.get_smart_contract_details
const GET_ASSET_DETAILS_FROM_ASSET_ID = queries.get_asset_details_from_asset_id
const GET_CHAIN_DETAILS_FROM_ID = queries.get_chain_details_from_id_query
const GET_FIAT_PROVIDER_DATA = queries.get_fiat_provider_data
const GET_ROUTE_OPERATION_DETAILS_BY_ID = queries.get_route_operation_details_by_id

async function getAllAssets (pool) {
  return await pool.query(GET_ALL_ASSESTS)
}

module.exports = {
  getAllAssets: async () => {
    const pool = await connections.getPoolClient()
    const result = await getAllAssets(pool)
    return result
  },
  getAssetsDetailsFromAssetId: async (assetId) => {
    const pool = await connections.getPoolClient()
    const result = await pool.query(GET_ASSET_DETAILS_FROM_ASSET_ID, [assetId])
    return result.rows[0]
  },
  getTokenData: async function getTokenData (chainId, chainCategory, currencyType) {
    const pool = await connections.getPoolClient()
    const queryResult = await pool.query(GET_PARTICULAR_TOKEN_DATA_QUERY, [chainId, chainCategory, currencyType])
    return queryResult.rows[0]
  },
  getChainDetailsFromId: async function getChainDetailsFromId (chain_details_id) {
    const pool = await connections.getPoolClient()
    const queryResult = await pool.query(GET_CHAIN_DETAILS_FROM_ID, [chain_details_id])
    return queryResult.rows[0]
  },

  getSmartContractDetails: async function getSmartContractDetails (contractName, chainDetailId) {
    const pool = await connections.getPoolClient()
    const queryResult = await pool.query(GET_SMART_CONTRACT_DETAILS, [contractName, chainDetailId])
    return queryResult.rows[0]
  },

  getFiatProviderDetails: async function getFiatProviderDetails (chainType, providerName) {
    const pool = await connections.getPoolClient()
    const queryResult = await pool.query(GET_FIAT_PROVIDER_DATA, [chainType, providerName])
    return queryResult.rows[0]
  },

  getRouteOperationDetailsById: async function getRouteOperationDetailsById (routeOperationId) {
    const pool = await connections.getPoolClient()
    const queryResult = await pool.query(GET_ROUTE_OPERATION_DETAILS_BY_ID, [routeOperationId])
    return queryResult.rows[0]
  }
}
