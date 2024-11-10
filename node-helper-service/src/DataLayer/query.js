module.exports = {
  all_assets_query: 'SELECT * from (\n' +
        '    SELECT chain_id,chain_category\n' +
        '    FROM ces.cerebro_singularity_asset_table\n' +
        '    where asset_payment_supported = true\n' +
        '    GROUP BY chain_id,chain_category\n' +
        '    ) t JOIN ces.cerebro_singularity_asset_table m ON m.chain_id = t.chain_id and m.chain_category = t.chain_category\n' +
        ';',
  get_particular_token_data_query: 'SELECT * from \n' +
        '    ces.cerebro_singularity_asset_table\n' +
        '    where chain_id = $1  AND chain_category = $2 AND asset_name = $3',

  get_chain_details_query: `SELECT * from
    ces.cerebro_singularity_chain_details
    where id = $1`,

  get_asset_details_from_asset_id: 'SELECT * from \n' +
        '    ces.cerebro_singularity_asset_table\n' +
        '    where asset_id = $1',

  get_chain_details_from_id_query: `SELECT * from
    ces.cerebro_singularity_chain_details
    where id = $1 `,

  get_smart_contract_details: `SELECT a.*, b.* from
    ces.cerebro_singularity_smart_contract_details as a INNER JOIN ces.cerebro_singularity_chain_details as b on a.chain_details_id = b.id
    where a.contract_name = $1 and b.id= $2`,

  get_fiat_provider_data: 'SELECT * from ces.cerebro_singularity_fiat_provider_details where  chain_type = $1 and provider_name = $2',
  get_route_operation_details_by_id: 'SELECT * from ces.route_operation_details where route_operation_details_id = $1'
}
