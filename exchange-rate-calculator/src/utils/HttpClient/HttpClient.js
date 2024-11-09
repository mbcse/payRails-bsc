const axios = require('axios')
module.exports = {
    post: async (url, requestBody, requestHeaders) => {
        return await axios.post(url, requestBody, requestHeaders)
    }, get: async (url, requestHeaders) => {
        return await axios.get(url, requestHeaders);
    }
}


