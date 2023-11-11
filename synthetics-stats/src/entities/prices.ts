import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../utils/eventData";
import { OraclePriceUpdateEventData } from "../utils/eventData/OraclePriceUpdateEventData";
import { TokenPrice } from "../../generated/schema";

export function handleOraclePriceUpdate(eventData: EventData): void {
  let event = new OraclePriceUpdateEventData(eventData);
  let tokenPrice = getOrCreateTokenPrice(event.token);

  tokenPrice.minPrice = event.minPrice;
  tokenPrice.maxPrice = event.maxPrice;

  tokenPrice.save();
}

function getOrCreateTokenPrice(tokenAddress: string): TokenPrice {
  let tokenPrice = TokenPrice.load(tokenAddress);
  return tokenPrice ? tokenPrice! : new TokenPrice(tokenAddress);
}

export function getTokenPrice(tokenAddress: string, useMax: boolean = false): BigInt {
  let priceRef = TokenPrice.load(tokenAddress);
  if (!priceRef) {
    return BigInt.fromI32(0);
  }
  return useMax ? priceRef.maxPrice : priceRef.minPrice;
}
