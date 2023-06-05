let ETH_PRICE_FEED = "0xEfaa69f461E0aaf0be1798b01371Daf14AC55eA8";
let AVAX_PRICE_FEED = "0x9450A29eF091B625e976cE66f2A5818e20791999";
let USDC_PRICE_FEED = "0xb8AEB9160385fa2D1B63B5E88351238593ba0127";
let USDT_PRICE_FEED = "0xb8AEB9160385fa2D1B63B5E88351238593ba0127"; // same as USDC

let WETH = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
let AVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
let USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
let USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";

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
