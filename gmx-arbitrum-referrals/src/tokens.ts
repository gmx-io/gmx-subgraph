let ETH_PRICE_FEED = "0x3607e46698d218b3a5cae44bf381475c0a5e2ca7";
let AVAX_PRICE_FEED = "0xcf17b68a40f10d3dceedd9a092f1df331ce3d9da";
let USDC_PRICE_FEED = "0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4";
let USDT_PRICE_FEED = "0xcb35fe6e53e71b30301ec4a3948da4ad3c65ace4"; // same as USDC

let WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
let AVAX = "0x565609faf65b92f7be02468acf86f8979423e514";
let USDCe = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";
let USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
let USDT = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";

export function getTokenByPriceFeed(priceFeed: string): string[] {
  if (priceFeed == ETH_PRICE_FEED) {
    return [WETH];
  } else if (priceFeed == AVAX_PRICE_FEED) {
    return [AVAX];
  } else if (priceFeed == USDC_PRICE_FEED || priceFeed == USDT_PRICE_FEED) {
    return [USDC, USDCe, USDT];
  }

  return [];
}

export function getTokenDecimals(tokenAddress: string): number {
  if (tokenAddress == WETH) {
    return 18;
  } else if (tokenAddress == AVAX) {
    return 18;
  } else if (tokenAddress == USDCe) {
    return 6;
  } else if (tokenAddress == USDC) {
    return 6;
  } else if (tokenAddress == USDT) {
    return 6;
  }

  return 0;
}
