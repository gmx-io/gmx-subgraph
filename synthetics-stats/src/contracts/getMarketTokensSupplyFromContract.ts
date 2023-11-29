import { Address, BigInt } from "@graphprotocol/graph-ts";
import { MarketToken } from "../../generated/templates/MarketTokenTemplate/MarketToken";

export function getMarketTokensSupplyFromContract(marketAddress: string): BigInt {
  return MarketToken.bind(Address.fromString(marketAddress)).totalSupply();
}
