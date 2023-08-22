import { Order, Transaction } from "../../generated/schema";
import { EventData } from "../utils/eventData";
import { BigInt } from "@graphprotocol/graph-ts";

export let orderTypes = new Map<string, BigInt>();

orderTypes.set("MarketSwap", BigInt.fromI32(0));
orderTypes.set("LimitSwap", BigInt.fromI32(1));
orderTypes.set("MarketIncrease", BigInt.fromI32(2));
orderTypes.set("LimitIncrease", BigInt.fromI32(3));
orderTypes.set("MarketDecrease", BigInt.fromI32(4));
orderTypes.set("LimitDecrease", BigInt.fromI32(5));
orderTypes.set("StopLossDecrease", BigInt.fromI32(6));
orderTypes.set("Liquidation", BigInt.fromI32(7));

export function saveOrder(
  eventData: EventData,
  transaction: Transaction
): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = new Order(key);

  order.account = eventData.getAddressItemString("account")!;
  order.receiver = eventData.getAddressItemString("receiver")!;
  order.callbackContract = eventData.getAddressItemString("callbackContract")!;
  order.marketAddress = eventData.getAddressItemString("market")!;
  order.swapPath = eventData.getAddressArrayItemString("swapPath")! || [];
  order.initialCollateralTokenAddress = eventData.getAddressItemString(
    "initialCollateralToken"
  )!;
  order.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  order.initialCollateralDeltaAmount = eventData.getUintItem(
    "initialCollateralDeltaAmount"
  )!;
  order.triggerPrice = eventData.getUintItem("triggerPrice")!;
  order.acceptablePrice = eventData.getUintItem("acceptablePrice")!;
  order.callbackGasLimit = eventData.getUintItem("callbakGasLimit")!;
  order.minOutputAmount = eventData.getUintItem("minOutputAmount")!;
  order.executionFee = eventData.getUintItem("executionFee")!;
  order.updatedAtBlock = eventData.getUintItem("updatedAtBlock")!;
  order.orderType = eventData.getUintItem("orderType")!;
  order.isLong = eventData.getBoolItem("isLong")!;
  order.shouldUnwrapNativeToken = eventData.getBoolItem(
    "shouldUnwrapNativeToken"
  )!;

  let isFrozen = eventData.getBoolItem("isFrozen")!;

  if (isFrozen) {
    order.status = "Frozen";
  } else {
    order.status = "Created";
  }

  order.createdTxn = transaction.id;
  order.save();

  return order;
}

export function saveOrderCancelledState(
  eventData: EventData,
  transaction: Transaction
): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Cancelled";
  order.cancelledReason = eventData.getStringItem("reason")!;
  order.cancelledReasonBytes = eventData.getBytesItem("reasonBytes")!;

  order.cancelledTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderExecutedState(
  eventData: EventData,
  transaction: Transaction
): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Executed";
  order.executedTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderFrozenState(eventData: EventData): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Frozen";
  order.frozenReason = eventData.getStringItem("reason")!;
  order.frozenReasonBytes = eventData.getBytesItem("reasonBytes")!;

  order.save();

  return order as Order;
}

export function saveOrderUpdate(eventData: EventData): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  order.triggerPrice = eventData.getUintItem("triggerPrice")!;
  order.acceptablePrice = eventData.getUintItem("acceptablePrice")!;
  order.minOutputAmount = eventData.getUintItem("minOutputAmount")!;

  order.save();

  return order as Order;
}

export function saveOrderSizeDeltaAutoUpdate(
  eventData: EventData
): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = eventData.getUintItem("nextSizeDeltaUsd")!;

  order.save();

  return order as Order;
}

export function saveOrderCollateralAutoUpdate(
  eventData: EventData
): Order | null {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.initialCollateralDeltaAmount = eventData.getUintItem(
    "nextCollateralDeltaAmount"
  )!;

  order.save();

  return order as Order;
}
