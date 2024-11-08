module.exports = {
    // all_assets_query: "select ch.id,chain.asset_id,chain.contract_address,ch.network_id as parent_network_id,ch.chain_category as \n" +
    //     "parent_chain_category,ch.rpc_url,ch.api_key,chain.parent_id,chain.network_id,chain.chain_category,chain.asset_name,chain.decimals \n" +
    //     " from ces.cerebro_singularity_chain_details as ch,\n" +
    //     "(select * from ces.cerebro_singularity_asset_table as a\n" +
    //     "    inner join ces.cerebro_singularity_chain_details as c on\n" +
    //     "        a.chain_details_id = c.parent_id  where a.asset_payment_supported = true) as chain\n" +
    //     "where ch.id = chain.chain_details_id",
    // get_particular_token_data_query: "select chainData.id, assetData.asset_id, assetData.contract_address,chainData.network_id as parent_network_id,chainData.chain_category as parent_chain_category,chainData.rpc_url,chainData.api_key, assetData.parent_id,assetData.network_id,assetData.chain_category,assetData.asset_name,assetData.decimals\n" +
    //     "from ces.cerebro_singularity_chain_details as chainData,\n" +
    //     "     (select * from ces.cerebro_singularity_asset_table as a\n" +
    //     "         inner join ces.cerebro_singularity_chain_details as c on\n" +
    //     "             a.chain_details_id = c.parent_id  where a.asset_payment_supported = true and  c.network_id = $1 and c.chain_category =$2 and a.asset_name =$3)\n" +
    //     "         as assetData where chainData.id = assetData.chain_details_id",

    get_chain_data_from_id: `select * from 
        ces.cerebro_singularity_chain_details where id = $1`,

    get_asset_data_query: `
                            select
                            assetData.asset_id,
                            assetData.is_wrapped,
                            assetData.asset_name,
                            assetData.contract_address,
                            assetData.decimals,
                            assetData.is_native,
                            chainData.network_id,
                            chainData.chain_category,
                            chainData.chain_type,
                            chainData.rpc_url,
                            chainData.api_key,
                            chainData.id as chain_details_id,
                            chainData.fallback_rpcs,
                            chainData.parent_id as parent_chain_details_id
                            from ces.cerebro_singularity_asset_table as assetData
                            inner join
                            ces.cerebro_singularity_chain_details as chainData
                            on assetData.chain_details_id = chainData.id
                            where
                            assetData.asset_payment_supported = true
                            and
                            assetData.asset_name = $1
                            and
                            chainData.id = $2
    `,

    get_all_asset_data_query: `
                            select
                            assetData.asset_id,
                            assetData.is_wrapped,
                            assetData.asset_name,
                            assetData.contract_address,
                            assetData.decimals,
                            assetData.is_native,
                            chainData.network_id,
                            chainData.chain_category,
                            chainData.chain_type,
                            chainData.rpc_url,
                            chainData.api_key,
                            chainData.id as chain_details_id,
                            chainData.parent_id as parent_chain_details_id
                            from ces.cerebro_singularity_asset_table as assetData
                            inner join
                            ces.cerebro_singularity_chain_details as chainData
                            on assetData.chain_details_id = chainData.id
                            where
                            assetData.asset_payment_supported = true;
    `,

    get_all_asset_data_of_chain_query: `
                            select
                            assetData.asset_id,
                            assetData.is_wrapped,
                            assetData.asset_name,
                            assetData.contract_address,
                            assetData.decimals,
                            assetData.is_native,
                            chainData.network_id,
                            chainData.chain_category,
                            chainData.chain_type,
                            chainData.rpc_url,
                            chainData.api_key,
                            chainData.id as chain_details_id,
                            chainData.parent_id as parent_chain_details_id
                            from ces.cerebro_singularity_asset_table as assetData
                            inner join
                            ces.cerebro_singularity_chain_details as chainData
                            on assetData.chain_details_id = chainData.id
                            where
                            assetData.asset_payment_supported = true
                            and
                            chainData.id = $1;
    `,

    get_route_path_query: `
    select
    path
    from
    ces.route_transaction_path
    where
    from_asset_id = $1
    and
    to_asset_id = $2
    and
    path IS NOT NULL;
`
};
