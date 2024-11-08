const connections = require('../../Connections/connections.js');

module.exports = {
    pushMapToRedisWithKey: async function (key, object) {
        const redis = await connections.getRedisClient();
        try {await redis.del(key);} catch(err){}
        await redis.hset(key, object)
        console.log(`Pushed Map To Redis => ${key} -> ${JSON.stringify(object)}`)
        // redis.disconnect();
    },
    pushStringToRedisWithKey: async function (key, value, ttl) {
        console.log(`Pushed String To Redis => ${key} -> ${value} with TTL ${ttl}`)
        if( typeof value != 'string') value = JSON.stringify(value)
        const redis = await connections.getRedisClient();
        try {await redis.del(key);} catch(err){}
        if(!ttl){
            console.log("Without ttl")
            await redis.set(key, value, Number.MAX_SAFE_INTEGER)
        }
        else {
            console.log("With ttl")
            await redis.set(key, value, ttl)
        }
        console.log(`Pushed String To Redis => ${key} -> ${value}`)
        // redis.disconnect();
    },

    getStringKey : async function (key) {
        const redis = await connections.getRedisClient();
        const value = await redis.get(key)
        // redis.disconnect();
        return value;
    },

    getKeyTtl : async function (key) {
        const redis = await connections.getRedisClient();
        const value = await redis.ttl(key)
        // redis.disconnect();
        return value;
    }
}
