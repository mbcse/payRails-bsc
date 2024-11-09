const Sentry = require("@sentry/node");
const secretManagerClient = require('../secretManager/getSecretManagerClientGenerator')
const Constant = require("../constants");
const args = process.argv;
module.exports = {
    startSentry: () => {
        const env = args[2].toUpperCase()
        if (env != Constant.DEV_ENVIRONMENT) {
            const secret_name = (Constant[env])['SENTRY_CONFIG_SECRET_FILE_NAME'];
            secretManagerClient.getSecretManagerClient(secret_name).then(function (response) {
                // console.log(response[Constant.sentryUrl])
                // console.log(response[Constant.sentryEnvironment])
                Sentry.init({
                    dsn: response[Constant.sentryUrl],
                    tracesSampleRate: response[Constant.sentryTraceRate],
                    environment: response[Constant.sentryEnvironment]
                })
            }, function (err) {
                console.log("cannot connect to sentry due to " + err);
            });
        }
    }

}
