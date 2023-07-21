let ETH_PRICE_FEED = "0xefaa69f461e0aaf0be1798b01371daf14ac55ea8";
let AVAX_PRICE_FEED = "0x9450a29ef091b625e976ce66f2a5818e20791999";
let USDC_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127";
let USDCe_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127"; // same as USDC
let USDT_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127"; // same as USDC
let USDTe_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127"; // same as USDC
let DAIe_PRICE_FEED = "0xb8aeb9160385fa2d1b63b5e88351238593ba0127"; // same as USDC
let WBTC_PRICE_FEED = "0x154bab1fc1d87ff641eed0e9bc0f8a50d880d2b6";
let BTCb_PRICE_FEED = "0x154bab1fc1d87ff641eed0e9bc0f8a50d880d2b6"; // same as WBTC
let MIM_PRICE_FEED = "0x9d0aaba64b0ba4650419a37d14175da05471793c ";
let LINK_PRICE_FEED = "0xa2e5d3254f7d6e8c051afb7f2aeea0dabf21f750 ";

let WETH = "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab";
let AVAX = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";
let USDC = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";
let USDT = "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7";
let BTCb = "0x152b9d0fdc40c096757f570a51e494bd4b943e50";
let WBTC = "0x50b7545627a5162f82a992c33b87adc75187b218";
let USDCe = "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664";
let USDTe = "0xc7198437980c041c805a1edcba50c1ce5db95118";
let DAIe = "0xd586e7f844cea2f87f50152665bcbc2c279d8d70";
let MIM = "0x130966628846bfd36ff31a822705796e8cb8c18d";
let LINK = "0x5947bb275c521040051d82396192181b413227a3";

export function getTokenByPriceFeed(priceFeed: string): string[] {
  if (priceFeed == ETH_PRICE_FEED) {
    return [WETH];
  } else if (priceFeed == AVAX_PRICE_FEED) {
    return [AVAX];
  } else if (
    priceFeed == USDC_PRICE_FEED ||
    priceFeed == USDT_PRICE_FEED ||
    priceFeed == USDTe_PRICE_FEED ||
    priceFeed == USDCe_PRICE_FEED ||
    priceFeed == DAIe_PRICE_FEED
  ) {
    return [USDC, USDT, USDTe, USDCe, DAIe];
  } else if (priceFeed == WBTC_PRICE_FEED || priceFeed == BTCb_PRICE_FEED) {
    return [WBTC, BTCb];
  } else if (priceFeed == MIM_PRICE_FEED) {
    return [MIM];
  } else if (priceFeed == LINK_PRICE_FEED) {
    return [LINK];
  }

  return [];
}

export function getTokenDecimals(tokenAddress: string): number {
  if (tokenAddress == WETH || tokenAddress == MIM || tokenAddress == LINK) {
    return 18;
  } else if (tokenAddress == AVAX) {
    return 18;
  } else if (
    tokenAddress == USDC ||
    tokenAddress == USDT ||
    tokenAddress == USDTe ||
    tokenAddress == USDCe ||
    tokenAddress == DAIe
  ) {
    return 6;
  } else if (tokenAddress === BTCb || tokenAddress === WBTC) {
    return 8;
  }

  return 0;
}
