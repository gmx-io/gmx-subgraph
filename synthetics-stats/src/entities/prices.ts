import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../utils/eventData";
import { OraclePriceUpdateEventData } from "../utils/eventData/OraclePriceUpdateEventData";
import { TokenPrice } from "../../generated/schema";

export function handleOraclePriceUpdate(eventData: EventData): void {
  let event = new OraclePriceUpdateEventData(eventData);
  let pricesRef = getOrCreatePricesRef(event.token);

  pricesRef.minPrice = event.minPrice;
  pricesRef.maxPrice = event.maxPrice;

  pricesRef.save();
}

function getOrCreatePricesRef(tokenAddress: string): TokenPrice {
  let pricesRef = TokenPrice.load(tokenAddress);
  return pricesRef ? pricesRef! : new TokenPrice(tokenAddress);
}

export function getTokenPrice(tokenAddress: string): BigInt {
  let pricesRef = TokenPrice.load(tokenAddress);
  return pricesRef ? pricesRef.minPrice : BigInt.fromI32(0);
}
