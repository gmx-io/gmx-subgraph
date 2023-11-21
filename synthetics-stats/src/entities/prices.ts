import { BigInt } from "@graphprotocol/graph-ts";
import { Ctx } from "../utils/eventData";
import { OraclePriceUpdateEventData } from "../utils/eventData/OraclePriceUpdateEventData";
import { TokenPrice } from "../../generated/schema";
import { ZERO } from "../utils/number";

export function handleOraclePriceUpdate(ctx: Ctx): void {
  let event = new OraclePriceUpdateEventData(ctx);
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

export function convertUsdToAmount(tokenAddress: string, usd: BigInt, useMax: boolean = true): BigInt {
  let price = getTokenPrice(tokenAddress, useMax);
  if (price.equals(ZERO)) {
    return ZERO;
  }
  return usd.div(price);
}

export function convertAmountToUsd(tokenAddress: string, amount: BigInt, useMax: boolean = false): BigInt {
  let price = getTokenPrice(tokenAddress, useMax);
  return amount.times(price);
}
