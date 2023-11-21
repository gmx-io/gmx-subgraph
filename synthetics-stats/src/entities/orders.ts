import { Order, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { BigInt } from "@graphprotocol/graph-ts";
import { OrderCreatedEventData } from "../utils/eventData/OrderCreatedEventData";

export let orderTypes = new Map<string, BigInt>();

orderTypes.set("MarketSwap", BigInt.fromI32(0));
orderTypes.set("LimitSwap", BigInt.fromI32(1));
orderTypes.set("MarketIncrease", BigInt.fromI32(2));
orderTypes.set("LimitIncrease", BigInt.fromI32(3));
orderTypes.set("MarketDecrease", BigInt.fromI32(4));
orderTypes.set("LimitDecrease", BigInt.fromI32(5));
orderTypes.set("StopLossDecrease", BigInt.fromI32(6));
orderTypes.set("Liquidation", BigInt.fromI32(7));

export function saveOrder(eventData: OrderCreatedEventData, transaction: Transaction): Order {
  let key = eventData.key;

  let order = new Order(key);

  order.account = eventData.account;
  order.receiver = eventData.receiver;
  order.callbackContract = eventData.callbackContract;
  order.marketAddress = eventData.market;
  order.swapPath = eventData.swapPath || [];
  order.initialCollateralTokenAddress = eventData.initialCollateralToken;
  order.sizeDeltaUsd = eventData.sizeDeltaUsd;
  order.initialCollateralDeltaAmount = eventData.initialCollateralDeltaAmount;
  order.triggerPrice = eventData.triggerPrice;
  order.acceptablePrice = eventData.acceptablePrice;
  order.callbackGasLimit = eventData.callbackGasLimit;
  order.minOutputAmount = eventData.minOutputAmount;
  order.executionFee = eventData.executionFee;
  order.updatedAtBlock = eventData.updatedAtBlock;
  order.orderType = eventData.orderType;
  order.isLong = eventData.isLong;
  order.shouldUnwrapNativeToken = eventData.shouldUnwrapNativeToken;

  if (eventData.isFrozen) {
    order.status = "Frozen";
  } else {
    order.status = "Created";
  }

  order.createdTxn = transaction.id;
  order.save();

  return order;
}

export function saveOrderCancelledState(eventData: EventData, transaction: Transaction): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Cancelled";
  order.cancelledReason = eventData.getStringItemOrNull("reason")!;
  order.cancelledReasonBytes = eventData.getBytesItemOrNull("reasonBytes")!;

  order.cancelledTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderExecutedState(eventData: EventData): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Executed";
  order.executedTxn = eventData.transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderFrozenState(eventData: EventData): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Frozen";
  order.frozenReason = eventData.getStringItemOrNull("reason")!;
  order.frozenReasonBytes = eventData.getBytesItemOrNull("reasonBytes")!;

  order.save();

  return order as Order;
}

export function saveOrderUpdate(eventData: EventData): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = eventData.getUintItemOrNull("sizeDeltaUsd")!;
  order.triggerPrice = eventData.getUintItemOrNull("triggerPrice")!;
  order.acceptablePrice = eventData.getUintItemOrNull("acceptablePrice")!;
  order.minOutputAmount = eventData.getUintItemOrNull("minOutputAmount")!;

  order.save();

  return order as Order;
}

export function saveOrderSizeDeltaAutoUpdate(eventData: EventData): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = eventData.getUintItemOrNull("nextSizeDeltaUsd")!;

  order.save();

  return order as Order;
}

export function saveOrderCollateralAutoUpdate(eventData: EventData): Order | null {
  let key = eventData.getBytes32ItemOrNull("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.initialCollateralDeltaAmount = eventData.getUintItemOrNull("nextCollateralDeltaAmount")!;

  order.save();

  return order as Order;
}
