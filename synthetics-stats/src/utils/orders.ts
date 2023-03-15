import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export let orderTypes = new Map<string, BigInt>();

orderTypes.set("MarketSwap", BigInt.fromI32(0));
orderTypes.set("LimitSwap", BigInt.fromI32(1));
orderTypes.set("MarketIncrease", BigInt.fromI32(2));
orderTypes.set("LimitIncrease", BigInt.fromI32(3));
orderTypes.set("MarketDecrease", BigInt.fromI32(4));
orderTypes.set("LimitDecrease", BigInt.fromI32(5));
orderTypes.set("StopLossDecrease", BigInt.fromI32(6));
orderTypes.set("Liquidation", BigInt.fromI32(7));
