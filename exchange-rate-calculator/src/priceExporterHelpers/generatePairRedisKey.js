module.exports = (chainDetailsId, fromTokenName, toTokenName) => {
    const currencyKey = chainDetailsId + '/' + fromTokenName + '/' + toTokenName;
    return currencyKey;
}