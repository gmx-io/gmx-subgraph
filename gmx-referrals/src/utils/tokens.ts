import { Address } from "@graphprotocol/graph-ts";

export function getTokenByPriceFeed(priceFeed: string): Address | null {
  let priceFeedToToken = new Map<string, string>()
  
  // Avalanche Fuji AVAX
  priceFeedToToken.set("0x6c2441920404835155f33d88faf0545b895871b1", "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3");
  
  // Arbitrum Goerli ETH
  priceFeedToToken.set("0xc975defb12c5e83f2c7e347831126cf136196447", "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3");
  
  let address = priceFeedToToken.get(priceFeed);
  if (address) {
    return Address.fromHexString(address) as Address;
  }
  return null;
}