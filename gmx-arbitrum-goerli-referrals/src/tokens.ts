let ETH_PRICE_FEED = "0xc975defb12c5e83f2c7e347831126cf136196447";
let AVAX_PRICE_FEED = "0xcf17b68a40f10d3DcEedd9a092F1Df331cE3D9da";
let USDC_PRICE_FEED = "0xA966F9276d9eD5F31503D03BA62Ec48b3EF11a30";
let USDT_PRICE_FEED = "0xA966F9276d9eD5F31503D03BA62Ec48b3EF11a30"; // same as USDC

let WETH = "0xEe01c0CD76354C383B8c7B4e65EA88D00B06f36f";
let AVAX = "0x565609fAF65B92F7be02468acF86f8979423e514";
let USDC = "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5";
let USDT = "0xBFcBcdCbcc1b765843dCe4DF044B92FE68182a62";

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
