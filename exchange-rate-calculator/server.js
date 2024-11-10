const Express = require("express")
const actuator = require('express-actuator');
const Log = require("./src/Logger/portLogger")
const morgan = require('morgan')
const logger = require('./src/utils/logger')
const exporter = require('./src/priceExporters')
const responseUtils = require("./src/utils/responseUtils")
const {UNKNOWN_TID} = require("./src/constants")
const {currencyPairGenerator} = require("./src/currencyPair")
const HTTP_STATUS_CODES = require("./src/utils/responseUtils/HTTP_STATUS_CODE")
const env = require('dotenv').config()
const app = Express()


const PORT = process.env.PORT || 9000

app.use(Express.json())
app.use(actuator());

app.use(morgan('combined', {
    stream: logger.stream,
    skip: (req, res) => { // Skip to log health endpoint
        return req.url === '/health'
    }
}))

app.get('/bulk-export', async function (req, res) {
    res.send("Prices Export For all Pairs all chains Started...")
    logger.info("Prices Export For all Pairs all chains Started..")
    await exporter.bulkPriceUpload().then(function (response) {
        logger.info("Prices For all Pairs all chains Exported..");
    }).catch(err => {
        logger.error(`Something Went Wrong while Exporting prices for all pairs on all chains with error ${err}`);
    });
});

app.get('/bulk-export-chain', async function (req, res) {
    const chainDetailsId = req.query.chainDetailsId
    res.send(`Prices Export For all Pairs on chain ${chainDetailsId} Started...`)
    logger.info(`Prices Export For all Pairs on chain ${chainDetailsId} Started...`)
    await exporter.bulkPriceUploadByChain(chainDetailsId).then(function (response) {
        logger.info(`Prices For all Pairs on chain ${chainDetailsId} Exported..`);
    }).catch(err => {
        logger.error(`Something Went Wrong while Exporting prices for all pairs on chain ${chainDetailsId} with error ${err}`);
    })

});

app.get('/usd-bulk-export', async function (req, res) {
    res.send("USD Prices Export For all Assets all chains Started...")
    logger.info("USD Prices Export For all Assets all chains Started..")
    await exporter.bulkUsdPriceUpload().then(function (response) {
        logger.info("Prices For all Assets all chains Exported..");
    }).catch(err => {
        logger.error(`Something Went Wrong while Exporting USD prices for all Assets on all chains with error ${err}`);
    });
});

app.get('/usd-bulk-export-chain', async function (req, res) {
    const chainDetailsId = req.query.chainDetailsId
    res.send(`USD Prices Export For all Assets on chain ${chainDetailsId} Started...`)
    logger.info(`USD Prices Export For all Assets on chain ${chainDetailsId} Started...`)
    await exporter.bulkUsdPriceUploadByChain(chainDetailsId).then(function (response) {
        logger.info(`Prices For all Assets on chain ${chainDetailsId} Exported..`);
    }).catch(err => {
        logger.error(`Something Went Wrong while Exporting USD prices for all pairs on chain ${chainDetailsId} with error ${err}`);
    })

});

app.post('/usd-bulk-export-chains', async function (req, res) {
    const chainDetailsIds = req.body.chainDetailsIds
    res.send(`USD Prices Export For all Assets on chain ${chainDetailsIds} Started...`)
    logger.info(`USD Prices Export For all Assets on chain ${chainDetailsIds} Started...`)
    await exporter.bulkUsdPriceUploadByChains(chainDetailsIds).then(function (response) {
        logger.info(`Prices For all Assets on chains ${chainDetailsIds} Exported..`);
    }).catch(err => {
        logger.error(`Something Went Wrong while Exporting USD prices for all pairs on chain ${chainDetailsIds} with error ${err}`);
    })

});

app.get('/pair-export', async function (req, res) {

    const priceRequest = {
        fromTokenName: req.query.fromTokenName,
        toTokenName: req.query.toTokenName,
        chainDetailsId: req.query.chainDetailsId
    }

    res.send(`Prices Export For Pair ${priceRequest.fromTokenName} -> ${priceRequest.toTokenName}
    on chain ${priceRequest.chainDetailsId} Started...`)

    logger.info(`Prices Export For Pair ${priceRequest.fromTokenName} -> ${priceRequest.toTokenName}
    on chain ${priceRequest.chainDetailsId} Started...`);

    await exporter.singlePriceUpload(priceRequest).then(function (response) {
        logger.info(`Prices For Pair ${priceRequest.fromTokenName} -> ${priceRequest.toTokenName} on chain ${priceRequest.chainDetailsId} Exported Successfully...`);
    }).catch((err) => {
        logger.error(`Something went wrong while exporting Prices For Pair ${priceRequest.fromTokenName} -> ${priceRequest.toTokenName} on chain ${priceRequest.chainDetailsId} with error ${err}`);
    })


});


app.get('/asset-usd-export', async function (req, res) {

    const priceRequest = {
        tokenName: req.query.tokenName,
        chainDetailsId: req.query.chainDetailsId
    }

    
    logger.info(`USD Prices Export For Asset ${priceRequest.tokenName} 
    on chain ${priceRequest.chainDetailsId} Started...`);

    await exporter.usdPriceUploadByAsset(priceRequest).then(function (response) {
        logger.info(`USD Prices For Asset ${priceRequest.tokenName}  on chain ${priceRequest.chainDetailsId} Exported Successfully...`);
        res.json(response)
    }).catch((err) => {
        logger.error(`Something went wrong while exporting USD Price For Asset ${priceRequest.tokenName} on chain ${priceRequest.chainDetailsId} with error ${err}`);
        res.json(err);
    })


});

app.get('/fetch-price', async function (req, res) {
    const tid = req.headers.tid ?? UNKNOWN_TID
    logger.info(`fetch-price.inside`, ({
        tid: tid,
        headers: req.headers,
        query: req.query
    }))
    const priceRequest = {
        fromTokenName: req.query.fromTokenName,
        toTokenName: req.query.toTokenName,
        chainDetailsId: req.query.chainDetailsId,
        amount: req.query.amount,
        swapType: req.query.swapType
    }

    res.send(await exporter.fetchPrice(priceRequest, tid).then(function (response) {
        responseUtils
        responseUtils.successResponse(res, `Price for Pair ${priceRequest.fromTokenName} -> ${priceRequest.toTokenName} on chain ${priceRequest.chainDetailsId}`, response)
    }).catch(err => {
        logger.error(`Something Went Wrong while Fetching ${err}`, ({
            tid: tid
        }));
        responseUtils.serverErrorResponse(res, "Something Went Wrong while Fetching Price", err);
    }));
});

app.get('/currency-pair', async function (req, res) {
    try {
        await currencyPairGenerator();
        return res.status(HTTP_STATUS_CODES.OK).send();
    } catch (err) {
        logger.error('Something Went Wrong while Exporting Pair');
        return responseUtils.serverErrorResponse(res, "Something Went Wrong while Exporting Pair", err);
    }
});


app.listen(PORT, () => Log.log(PORT))
