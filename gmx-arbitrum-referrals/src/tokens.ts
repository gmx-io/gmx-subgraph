let ETH_PRICE_FEED = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
let AVAX_PRICE_FEED = "0x8bf61728eeDCE2F32c456454d87B5d6eD6150208";
let USDC_PRICE_FEED = "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7";
let USDT_PRICE_FEED = "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"; // same as USDC

let WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
let AVAX = "0x565609fAF65B92F7be02468acF86f8979423e514";
let USDC = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
let USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

export function getTokenByPriceFeed(priceFeed: string): string[] {
  if (priceFeed == ETH_PRICE_FEED) {
    return [WETH];
  } else if (priceFeed == AVAX_PRICE_FEED) {
    return [AVAX];
  } else if (priceFeed == USDC_PRICE_FEED || priceFeed == USDT_PRICE_FEED) {
    return [USDC, USDT];
  }

  return [];
}

export function getTokenDecimals(tokenAddress: string): number {
  if (tokenAddress == WETH) {
    return 18;
  } else if (tokenAddress == AVAX) {
    return 18;
  } else if (tokenAddress == USDC) {
    return 6;
  } else if (tokenAddress == USDT) {
    return 6;
  }

  return 0;
}
