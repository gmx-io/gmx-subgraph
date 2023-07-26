let ETH_PRICE_FEED = "0x3607e46698d218b3a5cae44bf381475c0a5e2ca7";
let AVAX_PRICE_FEED = "0xcf17b68a40f10d3dceedd9a092f1df331ce3d9da";
let USDC_PRICE_FEED = "0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4";
let USDT_PRICE_FEED = "0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4"; // same as USDC
let WBTC_PRICE_FEED = "0x3c8f2d5af2e0f5ef7c23a08df6ad168ece071d4b";
let ARB_PRICE_FEED = "0x46de66f10343b59bacc37df9b3f67cd0ccc121a3";
let SOL_PRICE_FEED = "0x8c4308f7cbd7fb829645853cd188500d7da8610a";
let LINK_PRICE_FEED = "0xa136978a2c8a92ec5eacc5179642aa2e1c1eae18 ";
let UNI_PRICE_FEED = "0xefc5061b7a8aef31f789f1ba5b3b8256674f2b71";
let DAI_PRICE_FEED = "0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4"; // same as USDC
let FRAX_PRICE_FEED = "0x5d041081725468aa43e72ff0445fde2ad1ade775";
let MIM_PRICE_FEED = "0x0ae17556f9698fc47c365a746ab9cddcb17f3809";

let WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
let AVAX = "0x565609faf65b92f7be02468acf86f8979423e514";
let USDCe = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
let USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
let USDT = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";
let WBTC = "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f";
let ARB = "0x912ce59144191c1204e64559fe8253a0e49e6548";
let SOL = "0x2bcc6d6cdbbdc0a4071e48bb3b969b06b3330c07";
let LINK = "0xf97f4df75117a78c1a5a0dbb814af92458539fb4";
let UNI = "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0";
let DAI = "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1";
let FRAX = "0x17fc002b466eec40dae837fc4be5c67993ddbd6f";
let MIM = "0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a";

export function getTokenByPriceFeed(priceFeed: string): string[] {
  if (priceFeed == ETH_PRICE_FEED) {
    return [WETH];
  } else if (priceFeed == AVAX_PRICE_FEED) {
    return [AVAX];
  } else if (
    priceFeed == USDC_PRICE_FEED ||
    priceFeed == USDT_PRICE_FEED ||
    priceFeed == DAI_PRICE_FEED
  ) {
    return [USDC, USDCe, USDT, DAI];
  } else if (priceFeed == WBTC_PRICE_FEED) {
    return [WBTC];
  } else if (priceFeed == ARB_PRICE_FEED) {
    return [ARB];
  } else if (priceFeed == SOL_PRICE_FEED) {
    return [SOL];
  } else if (priceFeed == LINK_PRICE_FEED) {
    return [LINK];
  } else if (priceFeed == UNI_PRICE_FEED) {
    return [UNI];
  } else if (priceFeed == FRAX_PRICE_FEED) {
    return [FRAX];
  } else if (priceFeed == MIM_PRICE_FEED) {
    return [MIM];
  }

  return [];
}

export function getTokenDecimals(tokenAddress: string): number {
  if (tokenAddress == WETH) {
    return 18;
  } else if (
    tokenAddress == AVAX ||
    tokenAddress == ARB ||
    tokenAddress == LINK ||
    tokenAddress == UNI ||
    tokenAddress == FRAX ||
    tokenAddress == MIM ||
    tokenAddress == DAI
  ) {
    return 18;
  } else if (tokenAddress == USDCe) {
    return 6;
  } else if (tokenAddress == USDC) {
    return 6;
  } else if (tokenAddress == USDT) {
    return 6;
  } else if (tokenAddress == WBTC) {
    return 8;
  } else if (tokenAddress === SOL) {
    return 9;
  }

  return 0;
}
