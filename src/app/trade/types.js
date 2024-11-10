export const InputType = Object.freeze({
  Token: "token",
  Currency: "currency",
});

export const SellInputType = Object.freeze({
  FromToken: "from-token",
  ToToken: "to-token",
});

export const CardState = Object.freeze({
  Default: "default",
  TokenSelection: "token-selection",
  ChainSelection: "chain-selection",
});

export const SellCardState = Object.freeze({
  Default: "default",
  FromTokenSelection: "from-token-selection",
  FromChainSelection: "from-chain-selection",
  ToTokenSelection: "to-token-selection",
  ToChainSelection: "to-chain-selection",
});
