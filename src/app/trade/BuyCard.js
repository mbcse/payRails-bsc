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

import { CardState, InputType } from "./types";
import Divider from "@/components/Divider";
import Button from "@/components/Button";
import assetAPI from "@/api/asset";
import chainAPI from "@/api/chain";
import Graphic2 from "@/components/Icons/Graphic2";

export default function BuyCard({
  loggedIn,
  setSelectedAsset,
  className = "",
  drawerOpen,
  activeTab,
  setActiveTab,
}) {
  const router = useRouter();
  const { fromchain: chainParam, fromtoken: tokenParam } = useParams();

  const [priceUpdating, setPriceUpdating] = useState(false);

  const [cardState, setCardState] = useState(CardState.Default);

  const [tokenValue, setTokenValue] = useState(0);
  const [currencyValue, setCurrencyValue] = useState(100);

  const [tokenSearch, setTokenSearch] = useState("");
  const [chainSearch, setChainSearch] = useState("");

  const [transactionInitiated, setTransactionInitiated] = useState(false);

  const { data: chainList } = useSWR("chain-list", chainAPI.getAllChains);
  const activeChain = chainList?.find(
    (c) =>
      c.name.replaceAll(" ", "_").toLowerCase() === chainParam?.toLowerCase()
  );

  const { data: tokenList } = useSWR(
    activeChain ? `token-list-${activeChain?.id}` : null,
    () => assetAPI.getAllAssetsByChain(activeChain?.id)
  );
  const activeToken = tokenList?.find(
    (t) =>
      t.name.replaceAll(" ", "_").toLowerCase() === tokenParam?.toLowerCase()
  );

  useEffect(() => {
    setSelectedAsset(activeToken);
  }, [activeToken]);

  useEffect(() => {
    if (!drawerOpen) {
      setTransactionInitiated(false);
    }
    if (drawerOpen && transactionInitiated) {
      initiateTransaction();
    }
  }, [tokenValue, drawerOpen]);

  useEffect(() => {
    (async () => {
      if (activeToken) {
        const tokenAmount = await getTokenAmount(currencyValue);
        setTokenValue(tokenAmount);
      }
    })();
  }, [activeToken]);

  useEffect(() => {
    (async () => {
      if (!chainList && !tokenList) return;

      if (!activeChain && chainList?.length)
        return router.replace(
          `/${chainList?.[0]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}/None/${tokenParam}/None`
        );

      if (!activeToken && tokenList?.length)
        return router.replace(
          `/${chainParam}/None/${tokenList?.[0]?.name
            .replaceAll(" ", "_")
            .toUpperCase()}/None`
        );
    })();
  }, [chainParam, tokenParam, chainList, tokenList]);

  const getCurrencyAmount = async (tokenAmount) => {
    setPriceUpdating(true);
    try {
      const data = await assetAPI.getPrice(
        activeToken?.name,
        "USDC",
        String(tokenAmount),
        activeToken?.chainDetailsId
      );

      setPriceUpdating(false);
      return parseFloat(data?.data?.rate || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error getting price. Try again later.");
      setPriceUpdating(false);
      return 0;
    }
  };

  const getTokenAmount = async (currencyAmount) => {
    setPriceUpdating(true);
    console.log("getTokenAmount tichnas", currencyAmount);
    try {
      const data = await assetAPI.getPrice(
        "USDC",
        activeToken?.name,
        String(currencyAmount),
        activeToken?.chainDetailsId
      );

      setPriceUpdating(false);
      return parseFloat(data?.data?.rate || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error getting price. Try again later.");
      setPriceUpdating(false);
      return 0;
    }
  };

  const updateTokenAmount = (amount) => {
    setTimeout(async () => {
      const tokenAmount = await getTokenAmount(amount || 0);
      setTokenValue(tokenAmount);
    }, 0);
  };

  const updateCurrencyAmount = (amount) => {
    setTimeout(async () => {
      const currencyAmount = await getCurrencyAmount(amount || 0);
      setCurrencyValue(currencyAmount);
    }, 0);
  };

  const debounceUpdateTokenAmount = useCallback(
    _debounce((value) => updateTokenAmount(value), 1000),
    [activeToken]
  );
  const debounceUpdateCurrencyAmount = useCallback(
    _debounce((value) => updateCurrencyAmount(value), 1000),
    [activeToken]
  );

  const handleChange = async (e) => {
    let { name, value } = e.target;

    if (name === InputType.Currency) {
      setCurrencyValue(value);
      debounceUpdateTokenAmount(value);
    } else if (name === InputType.Token) {
      setTokenValue(value);
      debounceUpdateCurrencyAmount(value);
    }
  };

  const onSelectToken = (name) => {
    router.replace(
      `/${chainParam}/None/${name.toUpperCase().replaceAll(" ", "_")}/None`
    );
    setCardState(CardState.Default);
  };

  const onSelectChain = (name) => {
    router.replace(
      `/${name.toUpperCase().replaceAll(" ", "_")}/None/${tokenParam}/None`
    );
    setCardState(CardState.Default);
  };

  const initiateTransaction = async () => {
    try {
      setTransactionInitiated(true);
      console.log("Initiating transaction token value", tokenValue);
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
          clientRequestedAssetId: activeToken?.id,
          clientRequestedAssetQuantity: String(tokenValue),
          address,
        },
      };

      const requestString = JSON.stringify(body);

      window.SingularityEvent.transactionFlow(requestString);
    } catch (err) {
      window.alert("Some error occured");
      console.error(err);
    }
  };

  if (cardState === CardState.Default)
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
        {/* <h3 className="text-xl font-semibold mb-11">Buy with Fiat or Crypto</h3> */}

        <div className="p-1 bg-[#222] rounded-2xl mb-5">
          <label className="pt-2 pl-3 pb-3.5 border-b border-b-[#3131313E] flex gap-4 items-center text-base">
            <span className="font-medium text-[#8F939C]">Network</span>

            <span
              className="flex items-center cursor-pointer"
              onClick={() => setCardState(CardState.ChainSelection)}
            >
              <img
                src={activeChain?.chainImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeChain?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </label>

          <div className="pl-4 pt-5 pb-7 relative text-3xl font-medium">
            <input
              className={
                "bg-transparent w-full focus:outline-none focus:border-[white] "
              }
              name={InputType.Token}
              type="number"
              value={tokenValue}
              onChange={handleChange}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 text-lg flex items-center cursor-pointer"
              onClick={() => setCardState(CardState.TokenSelection)}
            >
              <img
                src={activeToken?.assetImageUrl}
                className="w-6 h-6 mr-1.5 rounded-full"
              />
              {activeToken?.name}{" "}
              <CaretDownIcon className="text-primary ml-2" />
            </span>
          </div>
        </div>

        <Input
          className="pl-8 pb-3"
          name={InputType.Currency}
          label="You Pay"
          type="number"
          step="0.01"
          value={currencyValue}
          onChange={handleChange}
        >
          <span className="absolute left-2">$</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">
            USD
          </span>
        </Input>

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
              !tokenValue ||
              !currencyValue ||
              priceUpdating ||
              loggedIn === undefined
            }
            loading={priceUpdating || loggedIn === undefined}
            className="mt-20"
            title="Connect Wallet"
            onClick={initiateTransaction}
          />
        ) : (
          <div className="flex flex-col sm:flex-row m-10 space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              disabled={
                !tokenValue ||
                !currencyValue ||
                priceUpdating ||
                loggedIn === undefined
              }
              className="w-full sm:w-72 h-14 relative flex items-center justify-center"
              onClick={initiateTransaction}
            >
              <div className="w-full sm:w-72 h-14 absolute bg-[#212121] rounded-[100px] border border-[#caff33]"></div>
              <div className="relative text-[#caff33] text-base font-normal">
                Swap or Bridge with Crypto
              </div>
            </button>

            <button
              disabled={
                !tokenValue ||
                !currencyValue ||
                priceUpdating ||
                loggedIn === undefined
              }
              className="w-full sm:w-72 h-14 relative flex items-center justify-center"
              onClick={initiateTransaction}
            >
              <div className="w-full sm:w-72 h-14 absolute bg-[#caff33] rounded-[100px]"></div>
              <div className="relative text-black text-base font-normal">
                Buy with Fiat
              </div>
            </button>
          </div>
        )}
      </Card>
    );

  if (cardState === CardState.TokenSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(CardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Search Token</h3>
        </div>

        <SearchBar
          value={tokenSearch}
          setValue={setTokenSearch}
          placeholder="Search by token name or address"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
          <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" />
          <ListItem image={sampleIconImage} title="Ethereum" subtitle="ETH" /> */}
          {tokenList
            ?.filter(
              ({ name, contractAddress }) =>
                name.toLowerCase().includes(tokenSearch) ||
                contractAddress.toLowerCase().includes(tokenSearch)
            )
            .map(({ id, name, assetDescription, assetImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectToken(name);
                }}
                image={assetImageUrl}
                title={name}
                subtitle={assetDescription}
              />
            ))}
        </div>
      </Card>
    );

  if (cardState === CardState.ChainSelection)
    return (
      <Card className={"flex flex-col " + className}>
        <div className="flex items-center mb-6">
          <ArrowLeftIcon
            className="cursor-pointer"
            onClick={() => setCardState(CardState.Default)}
          />
          <h3 className="ml-3 text-xl font-semibold">Select Chain</h3>
        </div>

        <SearchBar
          value={chainSearch}
          setValue={setChainSearch}
          placeholder="Search by chain name"
          className="mb-5"
        />

        <Divider className="my-6" />

        <div className="flex flex-col gap-6 overflow-y-auto">
          {chainList
            ?.filter(({ name }) => name.toLowerCase().includes(chainSearch))
            ?.map(({ id, name, chainCategory, chainType, chainImageUrl }) => (
              <ListItem
                key={id}
                onClick={() => {
                  onSelectChain(name);
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

const sampleIconImage =
  "data:image/png;base64,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";
