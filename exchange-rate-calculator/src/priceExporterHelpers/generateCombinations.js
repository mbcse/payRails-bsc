module.exports = {
    getUniqueCombinations: async (rows) => {

        const map = new Map();
        let count = 1;
        for (let i = 0; i < rows.length; i++) {
            // console.log("rows:",rows[i].network_id,rows[i].chain_category,rows[i].chain_details_id)
            var key = rows[i].chain_details_id;
            if (!map.has(key)) {
                let array = [];
                array.push(rows[i]);
                map.set(key, array);
                count++;
            } else {
                map.get(key).push(rows[i]);
            }
        }
        return map;
    },

}
