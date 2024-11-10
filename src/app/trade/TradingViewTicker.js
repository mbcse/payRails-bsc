import React, { useEffect, useRef, memo } from "react";

function TradingViewTicker() {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;

    const tokenSymbols = [
      "COINBASE:BTCUSD",
      "COINBASE:ETHUSD",
      "COINBASE:SOLUSD",
      "COINBASE:AVAXUSD",
      "BINANCE:BNBUSD",
      "COINBASE:OPUSD",
      "COINBASE:ARBUSD",
      "CRYPTO:OASUSD",
      "COINBASE:MATICUSD",
      "PYTH:CANTOUSD",
    ];

    const tokenSymbolsJSON = JSON.stringify(
      tokenSymbols.map((symbol) => ({ proName: symbol, description: "" }))
    );

    script.innerHTML = `
    {
      "symbols": ${tokenSymbolsJSON},
      "showSymbolLogo": true,
      "isTransparent": false,
      "displayMode": "adaptive",
      "colorTheme": "light",
      "locale": "en"
    }`;

    container.current.innerHTML =
      '<div className="tradingview-widget-container__widget"></div>';
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
      {/* <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div> */}
    </div>
  );
}

// export default memo(TradingViewWidget);
export default TradingViewTicker;
