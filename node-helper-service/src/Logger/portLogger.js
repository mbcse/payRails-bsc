function log(PORT) {
    console.log("Listening to port", PORT)
}

function logMessage(message) {
    console.log(message)
}

module.exports = {
    log: function (PORT) {
        log(PORT);
    },
    logMessage: function (message) {
        logMessage(message);
    }
};