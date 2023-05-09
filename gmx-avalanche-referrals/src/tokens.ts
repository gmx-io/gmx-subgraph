let ETH_PRICE_FEED = "0x976B3D034E162d8bD72D6b9C989d545b839003b0";
let AVAX_PRICE_FEED = "0x0A77230d17318075983913bC2145DB16C7366156";
let USDC_PRICE_FEED = "0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a";
let USDT_PRICE_FEED = "0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a"; // same as USDC

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
