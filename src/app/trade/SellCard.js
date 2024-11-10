"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import useSWR from "swr";
import toast from "react-hot-toast";
import _debounce from "lodash/debounce";

import Card from "@/components/Card";
import Input from "@/components/Input";
import { ArrowLeftIcon, CaretDownIcon } from "@/components/Icons";
import ListItem from "@/components/ListItem";
import SearchBar from "@/components/SearchBar";

import { SellCardState, SellInputType } from "./types";
import Divider from "@/components/Divider";
import Button from "@/components/Button";
import assetAPI from "@/api/asset";
import chainAPI from "@/api/chain";
import Graphic2 from "@/components/Icons/Graphic2";

const fetchPrice = async (
  fromAssetId,
  toAssetId,
  fromAssetQuantity,
  toAssetQuantity
) => {
  const myHeaders = new Headers();
  myHeaders.append("content-type", "application/json");
  myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_CLIENT_API_KEY);
  myHeaders.append("x-api-userid", "af513711-293b-4c25-a336-b80f27b45aa6");

  const raw = JSON.stringify({
    paymentOptions: "crypto",
    userSelectedAssetId: fromAssetId,
    userSelectedAssetQuantity: fromAssetQuantity,
    singularityUserAccountId: "c7341f4a-cedf-4e3c-ba09-4e9018e80941",
    transactionId: uuidv4(),
    singularityTransactionRequest: {
      clientReferenceId: "c40d9896-ddcd-4a00-a362-2f61e1202e50",
      singularityTransactionType: "RECEIVE",
      clientReceiveObject: {
        clientRequestedAssetId: toAssetId,
        clientRequestedAssetQuantity: toAssetQuantity,
        address: "0x17f547ae02a94a0339c4cfe034102423907c4592",
      },
    },
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    const response = await fetch(
      "https://cerebro.s9y.gg/v1/singularity-transactions-protected/fetchLivePrice",
      requestOptions
    );
    const result = await response.json();
    return result.updatedUserSelectedQuantity;
  } catch (error) {
    console.error("Error fetching price:", error);
    return null;
  }
};

export default function SellCard({
  loggedIn,
  setSelectedAsset,
  className = "",
  drawerOpen,
  activeTab,
  setActiveTab,
}) {
  const router = useRouter();
  const {
    fromchain: fromChainParam,
    tochain: toChainParam,
    fromtoken: fromTokenParam,
    totoken: toTokenParam,
  } = useParams();

  const [priceUpdating, setPriceUpdating] = useState(false);

  const [cardState, setCardState] = useState(SellCardState.Default);

  const [fromTokenSearch, setFromTokenSearch] = useState("");
  const [fromChainSearch, setFromChainSearch] = useState("");

  const [toTokenSearch, setToTokenSearch] = useState("");
  const [toChainSearch, setToChainSearch] = useState("");

  const [selectedFromAssetId, setSelectedFromAssetId] = useState();
  const [selectedToAssetId, setSelectedToAssetId] = useState();

  const onSelectFromToken = (name) => {
    router.replace(
      `/${fromChainParam}/${toChainParam}/${name
        .toUpperCase()
        .replaceAll(" ", "_")}/${toTokenParam}`
    );
    setCardState(SellCardState.Default);
  };

  const onSelectFromChain = (name) => {
    router.replace(
      `/${name
        .toUpperCase()
        .replaceAll(
          " ",
          "_"
        )}/${toChainParam}/${fromTokenParam}/${toTokenParam}`
    );
    setCardState(SellCardState.Default);
  };

  const onSelectToToken = (name) => {
    router.replace(
      `/${fromChainParam}/${toChainParam}/${fromTokenParam}/${name
        .toUpperCase()
        .replaceAll(" ", "_")}`
    );
    setCardState(SellCardState.Default);
  };

  const onSelectToChain = (name) => {
    router.replace(
      `/${fromChainParam}/${name
        .toUpperCase()
        .replaceAll(" ", "_")}/${fromTokenParam}/${toTokenParam}`
    );
    setCardState(SellCardState.Default);
  };

  const [fromTokenValue, setFromTokenValue] = useState(0);
  const [toTokenValue, setToTokenValue] = useState(0);

  const { data: chainList } = useSWR("chain-list", chainAPI.getAllChains);

  const activeFromChain = chainList?.find(
    (c) =>
      c.name.replaceAll(" ", "_").toLowerCase() ===
      fromChainParam?.toLowerCase()
  );

  const activeToChain = chainList?.find(
    (c) =>
      c.name.replaceAll(" ", "_").toLowerCase() === toChainParam?.toLowerCase()
  );

  const { data: fromTokenList } = useSWR(
    activeFromChain ? `token-list-${activeFromChain?.id}` : null,
    () => assetAPI.getAllAssetsByChain(activeFromChain?.id)
  );

  const { data: toTokenList } = useSWR(
    activeToChain ? `token-list-${activeToChain?.id}` : null,
    () => assetAPI.getAllAssetsByChain(activeToChain?.id)
  );

  console.log(toTokenList);
  console.log(fromTokenList);

  const activeFromToken = fromTokenList?.find(
    (t) =>
      t.name.replaceAll(" ", "_").toLowerCase() ===
      fromTokenParam?.toLowerCase()
  );

  const activeToToken = toTokenList?.find(
    (t) =>
      t.name.replaceAll(" ", "_").toLowerCase() === toTokenParam?.toLowerCase()
  );
  console.log(activeFromToken);

  console.log(activeToToken);

  //old

  const [transactionInitiated, setTransactionInitiated] = useState(false);

  useEffect(() => {
    if (!activeFromToken) return;
    // setSelectedAsset(activeToken);
    console.log("activeFromToken", activeFromToken);
    setSelectedFromAssetId(activeFromToken.id);
    console.log("selectedFromAssetId", selectedFromAssetId);
  }, [activeFromToken]);

  useEffect(() => {
    if (!activeToToken) return;
    console.log("activeToToken", activeToToken);
    setSelectedToAssetId(activeToToken.id);
    console.log("selectedToAssetId", selectedToAssetId);
  }, [activeToToken]);

  useEffect(() => {
    if (!drawerOpen) {
      setTransactionInitiated(false);
    }
    if (drawerOpen && transactionInitiated) {
      initiateTransaction();
    }
  }, [fromTokenValue, toTokenValue, drawerOpen]);

  // useEffect(() => {
  //   (async () => {
  //     if (activeToken) {
  //       const tokenAmount = await getTokenAmount(currencyValue);
  //       setTokenValue(tokenAmount);
  //     }
  //   })();
  // }, [activeToken]);

  useEffect(() => {
    (async () => {
      if (!chainList && !fromTokenList && !toTokenList) return;

      if (!activeFromChain && chainList?.length)
        return router.replace(
          `/${chainList?.[0]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}/${toChainParam}/${fromTokenParam}/${toTokenParam}`
        );

      if (!activeFromToken && fromTokenList?.length)
        return router.replace(
          `/${fromChainParam}/${toChainParam}/${fromTokenList?.[0]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}/${toTokenParam}`
        );

      if (!activeToChain && chainList?.length)
        return router.replace(
          `/${fromChainParam}/${chainList?.[0]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}/${fromTokenParam}/${toTokenParam}`
        );

      if (!activeToToken && toTokenList?.length)
        return router.replace(
          `/${fromChainParam}/${toChainParam}/${fromTokenParam}/${toTokenList?.[1]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}`
        );
    })();
  }, [
    fromChainParam,
    fromTokenParam,
    toChainParam,
    toTokenParam,
    chainList,
    fromTokenList,
    toTokenList,
    router,
  ]);

  const getFromTokenAmount = async (toTokenValue) => {
    setPriceUpdating(true);
    console.log("getFromTokenAmount", toTokenValue);
    try {
      const price = await fetchPrice(
        activeFromToken?.id,
        activeToToken?.id,
        "1",
        toTokenValue
      );

      setPriceUpdating(false);
      return parseFloat(price || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error getting price. Try again later.");
      setPriceUpdating(false);
      return 0;
    }
  };

  const getToTokenAmount = async (fromTokenValue) => {
    setPriceUpdating(true);
    console.log("getToTokenAmount", fromTokenValue);
    try {
      const price = await fetchPrice(
        activeToToken?.id,
        activeFromToken?.id,
        "1",
        fromTokenValue
      );

      setPriceUpdating(false);
      return parseFloat(price || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error getting price. Try again later.");
      setPriceUpdating(false);
      return 0;
    }
  };

  const updateFromTokenAmount = (amount) => {
    setTimeout(async () => {
      const tokenAmount = await getFromTokenAmount(amount || 0);
      setFromTokenValue(tokenAmount);
    }, 0);
  };

  const updateToTokenAmount = (amount) => {
    setTimeout(async () => {
      const tokenAmount = await getToTokenAmount(amount || 0);
      setToTokenValue(tokenAmount);
    }, 0);
  };

  const debounceUpdateFromTokenAmount = useCallback(
    _debounce((value) => updateFromTokenAmount(value), 1000),
    [activeFromToken, activeToToken]
  );
  const debounceUpdateToTokenAmount = useCallback(
    _debounce((value) => updateToTokenAmount(value), 1000),
    [activeFromToken, activeToToken]
  );

  const handleChange = async (e) => {
    let { name, value } = e.target;

    if (name === SellInputType.FromToken) {
      setFromTokenValue(value);
      debounceUpdateToTokenAmount(value);
    } else if (name === SellInputType.ToToken) {
      setToTokenValue(value);
      debounceUpdateFromTokenAmount(value);
    }
  };

  const initiateTransaction = async () => {
    try {
      setTransactionInitiated(true);
      console.log("Initiating transaction token value", toTokenValue);
      const clientReferenceId = uuidv4();

      const userData = await window.SingularityEvent.getConnectUserInfo();

      if (!userData) {
        toast.error("Please connect your wallet first");
        window.SingularityEvent.open();
        return;
      }

      const address =
        userData?.metaData?.wallet?.accounts?.evmPublicAddress[0]
          ?.publicAddress;

      const body = {
        clientReferenceId,
        singularityTransactionType: "RECEIVE",
        transactionIconLink:
          "https://singularity-icon-assets.s3.ap-south-1.amazonaws.com/currency/usdc.svg",
        clientReceiveObject: {
          clientRequestedAssetId: activeToToken?.id,
          clientRequestedAssetQuantity: String(toTokenValue),
          address,
        },
      };

      const requestString = JSON.stringify(body);
      const signature = "";
      window.SingularityEvent.transactionFlow(requestString, signature, "", {
        byPassPaymentOptions: true,
        paymentAssetId: activeFromToken?.id,
      });
    } catch (err) {
      window.alert("Some error occured");
      console.error(err);
    }
  };

  if (cardState === SellCardState.Default)
    return (
      <Card className={className + " relative z-10"}>
        <div className="flex gap-6 mb-5">
          <button
            className={`text-xl font-semibold mb-11${
              activeTab === "buy"
                ? "text-green-400 border-b-2 border-green-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("buy")}
          >
            Buy
          </button>
          <button
            className={`text-xl font-semibold mb-11${
              activeTab === "sell"
                ? "text-green-400 border-b-2 border-green-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("sell")}
          >
            Sell
          </button>
        </div>
        {/* <h3 className="text-xl font-semibold mb-11">Sell</h3> */}

        <div className="p-1 bg-[#222] rounded-2xl mb-5">
          <label className="pt-2 pl-3 pb-3.5 border-b border-b-[#3131313E] flex gap-4 items-center text-base">
            <span className="font-medium text-[#8F939C]">Network</span>

            <span
              className="flex items-center cursor-pointer"
              onClick={() => setCardState(SellCardState.FromChainSelection)}
            >
              <img
                src={activeFromChain?.chainImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeFromChain?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </label>

          <div className="pl-4 pt-5 pb-7 relative text-3xl font-medium">
            <input
              className={
                "bg-transparent w-full focus:outline-none focus:border-[white] "
              }
              name={SellInputType.FromToken}
              type="number"
              value={fromTokenValue}
              onChange={handleChange}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-lg flex items-center cursor-pointer"
              onClick={() => setCardState(SellCardState.FromTokenSelection)}
            >
              <img
                src={activeFromToken?.assetImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeFromToken?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </div>
        </div>

        <div className="text-center mb-4">Convert to ↓</div>

        <div className="p-1 bg-[#222] rounded-2xl mb-5">
          <label className="pt-2 pl-3 pb-3.5 border-b border-b-[#3131313E] flex gap-4 items-center text-base">
            <span className="font-medium text-[#8F939C]">Network</span>

            <span
              className="flex items-center cursor-pointer"
              onClick={() => setCardState(SellCardState.ToChainSelection)}
            >
              <img
                src={activeToChain?.chainImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeToChain?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </label>

          <div className="pl-4 pt-5 pb-7 relative text-3xl font-medium">
            <input
              className={
                "bg-transparent w-full focus:outline-none focus:border-[white] "
              }
              name={SellInputType.ToToken}
              type="number"
              value={toTokenValue}
              onChange={handleChange}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-lg flex items-center cursor-pointer"
              onClick={() => setCardState(SellCardState.ToTokenSelection)}
            >
              <img
                src={activeToToken?.assetImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeToToken?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </div>
        </div>

        <Graphic2 className="absolute bottom-0 left-0 w-full h-1/3 -z-10" />

        {/* <Button
          disabled={
            !tokenValue ||
            !currencyValue ||
            priceUpdating ||
            loggedIn === undefined
          }
          loading={priceUpdating || loggedIn === undefined}
          className="mt-20"
          title={loggedIn ? "Buy Now" : "Connect Wallet"}
          onClick={initiateTransaction}
        /> */}

        {!loggedIn ? (
          <Button
            disabled={
              !fromTokenValue ||
              !toTokenValue ||
              priceUpdating ||
              loggedIn === undefined
            }
            loading={priceUpdating || loggedIn === undefined}
            className="mt-8"
            title="Connect Wallet"
            onClick={initiateTransaction}
          />
        ) : (
          <Button
            disabled={
              !fromTokenValue ||
              !toTokenValue ||
              priceUpdating ||
              loggedIn === undefined
            }
            loading={priceUpdating || loggedIn === undefined}
            className="mt-8"
            title="Swap And Bridge"
            onClick={initiateTransaction}
          />
        )}
      </Card>
    );

  if (cardState === SellCardState.FromTokenSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(SellCardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Search Token</h3>
        </div>

        <SearchBar
          value={fromTokenSearch}
          setValue={setFromTokenSearch}
          placeholder="Search by token name or address"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
          <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
          <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" /> */}
          {fromTokenList
            ?.filter(
              ({ name, contractAddress }) =>
                name.toLowerCase().includes(fromTokenSearch) ||
                contractAddress.toLowerCase().includes(fromTokenSearch)
            )
            .map(({ id, name, assetDescription, assetImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectFromToken(name);
                }}
                image={assetImageUrl}
                title={name}
                subtitle={assetDescription}
              />
            ))}
        </div>
      </Card>
    );

  if (cardState === SellCardState.FromChainSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(SellCardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Select Chain</h3>
        </div>

        <SearchBar
          value={fromChainSearch}
          setValue={setFromChainSearch}
          placeholder="Search by chain name"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {chainList
            ?.filter(({ name }) => name.toLowerCase().includes(fromChainSearch))
            ?.map(({ id, name, chainCategory, chainType, chainImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectFromChain(name);
                }}
                image={chainImageUrl}
                title={name}
                subtitle={`${chainCategory}-${chainType}`}
              />
            ))}
        </div>
      </Card>
    );

  //********** */

  if (cardState === SellCardState.ToTokenSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(SellCardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Search Token</h3>
        </div>

        <SearchBar
          value={toTokenSearch}
          setValue={setToTokenSearch}
          placeholder="Search by token name or address"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
            <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
            <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" /> */}
          {toTokenList
            ?.filter(
              ({ name, contractAddress }) =>
                name.toLowerCase().includes(toTokenSearch) ||
                contractAddress.toLowerCase().includes(toTokenSearch)
            )
            .map(({ id, name, assetDescription, assetImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectToToken(name);
                }}
                image={assetImageUrl}
                title={name}
                subtitle={assetDescription}
              />
            ))}
        </div>
      </Card>
    );

  if (cardState === SellCardState.ToChainSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(SellCardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Select Chain</h3>
        </div>

        <SearchBar
          value={toChainSearch}
          setValue={setToChainSearch}
          placeholder="Search by chain name"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {chainList
            ?.filter(({ name }) => name.toLowerCase().includes(toChainSearch))
            ?.map(({ id, name, chainCategory, chainType, chainImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectToChain(name);
                }}
                image={chainImageUrl}
                title={name}
                subtitle={`${chainCategory}-${chainType}`}
              />
            ))}
        </div>
      </Card>
    );
}
