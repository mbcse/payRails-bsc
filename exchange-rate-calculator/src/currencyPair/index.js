const {getSecret} = require("../Connections/connections");
const constants = require("../constants/index.js");
const httpClient = require("../utils/HttpClient/HttpClient");
const redis = require("../DataLayer/redis/redis");
const currencyPairGenerator = async () => {
    const apiKey = await getSecret(constants.currencyApiKey);
    const queryParams = {
        params: {
            base_currency: 'USD',
            apikey: apiKey
        }
    }
    const url = constants.currencyPriceUrl;
    const response = await httpClient.get(url, queryParams);
    const data = response.data.data;
    const dollarPriceMap = {}
    const lst = Object.keys(data)
    for (let i = 0; i < lst.length; i++) {
        dollarPriceMap[`USD/${lst[i]}`] = data[lst[i]].value
    }
    await redis.pushMapToRedisWithKey('dollar-price', dollarPriceMap);

}
module.exports = {
    currencyPairGenerator
}
