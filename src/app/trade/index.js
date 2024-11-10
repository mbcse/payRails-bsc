"use client";

import { useState } from "react";
import { Toaster } from "react-hot-toast";

import BuyCard from "./BuyCard";
import TradingViewWidget from "./TradingViewWidget";
import Graphic1 from "@/components/Icons/Graphic1";
import SellCard from "./SellCard";

export default function Trade({ loggedIn, drawerOpen }) {
  const [selectedAsset, setSelectedAsset] = useState();
  const [activeTab, setActiveTab] = useState("sell");

  let tradingViewWidgetAssetSymbol;
  if (selectedAsset?.d2cData)
    tradingViewWidgetAssetSymbol = JSON.parse(
      selectedAsset.d2cData
    ).TRADINGVIEWNAME;

  return (
    <div className="flex-1 relative">
      <Toaster />
      <div className="max-w-7xl lg:h-[73vh] mx-auto px-6 pt-20 lg:flex gap-6">
        {/* <BuyCard
          className="basis-4 flex-grow bg-[#1A1A1A] mb-6 lg:mb-0"
          loggedIn={loggedIn}
          drawerOpen={drawerOpen}
          setSelectedAsset={setSelectedAsset}
        /> */}

        {/* <SellCard
          className="basis-4 flex-grow bg-[#1A1A1A] mb-6 lg:mb-0"
          loggedIn={loggedIn}
          drawerOpen={drawerOpen}
          setSelectedAsset={setSelectedAsset}
        /> */}

        {activeTab === "buy" ? (
          <BuyCard
            className="basis-4 flex-grow bg-[#1A1A1A] mb-6 lg:mb-0"
            loggedIn={loggedIn}
            setSelectedAsset={setSelectedAsset}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : (
          <SellCard
            className="basis-4 flex-grow bg-[#1A1A1A] mb-6 lg:mb-0"
            loggedIn={loggedIn}
            setSelectedAsset={setSelectedAsset}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}

        <div className="basis-5 h-[500px] lg:h-auto flex-grow border border-[#313131] rounded-2xl overflow-hidden relative">
          {tradingViewWidgetAssetSymbol ? (
            <TradingViewWidget symbol={tradingViewWidgetAssetSymbol} />
          ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
              Price graph is not available for this token at the moment
            </div>
          )}
        </div>
      </div>

      <Graphic1 className="absolute bottom-0 left-0 -z-10" />
      <Graphic1 className="absolute bottom-0 right-0 -scale-x-100 -z-10" />
    </div>
  );
}
