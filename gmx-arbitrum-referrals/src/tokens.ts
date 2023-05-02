let ETH_PRICE_FEED = "0xf829c9aa5569ae7fc047b2344631778069f3fe39"
let AVAX_PRICE_FEED = "0x6c2441920404835155f33d88faf0545b895871b1"
let USDC_PRICE_FEED = "0xa47f3fac2273d138295aef7b4326630f301a3ab2"
let USDT_PRICE_FEED = "0xa47f3fac2273d138295aef7b4326630f301a3ab2" // same as USDC

let WETH = "0x82f0b3695ed2324e55bbd9a9554cb4192ec3a514"
let AVAX = "0x1d308089a2d1ced3f1ce36b1fcaf815b07217be3"
let USDC = "0x3ebdeaa0db3ffde96e7a0dbbafec961fc50f725f"
let USDT = "0x6931ec3e364245e6d093afa1f2e96cce3f17538b"

export function getTokenByPriceFeed(priceFeed: string): string[] {
    if (priceFeed == ETH_PRICE_FEED) {
        return [WETH]
    } else if (priceFeed == AVAX_PRICE_FEED) {
        return [AVAX]
    } else if (priceFeed == USDC_PRICE_FEED || priceFeed == USDT_PRICE_FEED) {
        return [USDC, USDT]
    }
    
    return []
}

export function getTokenDecimals(tokenAddress: string): number {
    if (tokenAddress == WETH) {
        return 18
    } else if (tokenAddress == AVAX) {
        return 18
    } else if (tokenAddress == USDC) {
        return 6
    } else if (tokenAddress == USDT) {
        return 6
    }
    
    return 0
}