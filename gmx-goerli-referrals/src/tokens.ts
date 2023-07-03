let ETH_PRICE_FEED = "0xc975defb12c5e83f2c7e347831126cf136196447";
let AVAX_PRICE_FEED = "0xcf17b68a40f10d3dceedd9a092f1df331ce3d9da";
let USDC_PRICE_FEED = "0xa966f9276d9ed5f31503d03ba62ec48b3ef11a30";
let USDT_PRICE_FEED = "0xa966f9276d9ed5f31503d03ba62ec48b3ef11a30"; // same as USDC

let WETH = "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3";
let AVAX = "0x565609faf65b92f7be02468acf86f8979423e514";
let USDC = "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5";
let USDT = "0xbfcbcdcbcc1b765843dce4df044b92fe68182a62";

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
