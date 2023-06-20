let ETH_PRICE_FEED = "0xefaa69f461e0aaf0be1798b01371daf14ac55ea8";
let AVAX_PRICE_FEED = "0x9450a29ef091b625e976ce66f2a5818e20791999";
let USDC_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127";
let USDT_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127"; // same as USDC

let WETH = "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab";
let AVAX = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";
let USDC = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";
let USDT = "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7";

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
