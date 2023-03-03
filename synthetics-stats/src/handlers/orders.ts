import { Order, Transaction } from "../../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import { EventData } from "../utils/eventData";

export function saveOrder(
  eventData: EventData,
  transaction: Transaction
): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = new Order(key);

  order.account = eventData.getAddressItemString("account")!;
  order.receiver = eventData.getAddressItemString("receiver")!;
  order.callbackContract = eventData.getAddressItemString("callbackContract")!;
  order.marketAddress = eventData.getAddressItemString("market");
  order.swapPath = eventData.getAddressArrayItemString("swapPath")! || [];
  order.initialCollateralTokenAddress = eventData.getAddressItemString(
    "initialCollateralToken"
  )!;
  order.sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd")!;
  order.initialCollateralDeltaAmount = eventData.getUintItem(
    "initialCollateralDeltaAmount"
  )!;
  order.triggerPrice = eventData.getUintItem("triggerPrice");
  order.acceptablePrice = eventData.getUintItem("acceptablePrice")!;
  order.callbackGasLimit = eventData.getUintItem("callbakGasLimit");
  order.minOutputAmount = eventData.getUintItem("minOutputAmount");
  order.executionFee = eventData.getUintItem("executionFee")!;
  order.updatedAtBlock = eventData.getUintItem("updatedAtBlock");
  order.orderType = eventData.getUintItem("orderType")!;
  order.isLong = eventData.getBoolItem("isLong");
  order.shouldUnwrapNativeToken = eventData.getBoolItem(
    "shouldUnwrapNativeToken"
  )!;

  let isFrozen = eventData.getBoolItem("isFrozen");

  if (isFrozen) {
    order.status = "Frozen";
  } else {
    order.status = "Created";
  }

  order.createdTxn = transaction.id;
  order.save();

  return order;
}

export function saveOrderCancellation(
  eventData: EventData,
  transaction: Transaction
): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    throw new Error("Order not found " + key);
  }

  order.status = "Cancelled";
  order.cancelledReason = eventData.getStringItem("reason");

  order.cancelledTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderExecution(
  eventData: EventData,
  transaction: Transaction
): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    throw new Error("Order not found " + key);
  }

  order.status = "Executed";
  order.executedTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderFrozen(eventData: EventData): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    throw new Error("Order not found " + key);
  }

  order.status = "Frozen";
  order.frozenReason = eventData.getStringItem("reason");

  order.save();

  return order as Order;
}

export function saveOrderUpdate(eventData: EventData): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    throw new Error("Order not found " + key);
  }

  let sizeDeltaUsd = eventData.getUintItem("sizeDeltaUsd");
  let triggerPrice = eventData.getUintItem("triggerPrice");
  let acceptablePrice = eventData.getUintItem("acceptablePrice");
  let minOutputAmount = eventData.getUintItem("minOutputAmount");

  if (sizeDeltaUsd != null) {
    order.sizeDeltaUsd = sizeDeltaUsd as BigInt;
  }

  if (triggerPrice != null) {
    order.triggerPrice = triggerPrice as BigInt;
  }

  if (acceptablePrice != null) {
    order.acceptablePrice = acceptablePrice as BigInt;
  }

  if (minOutputAmount != null) {
    order.minOutputAmount = minOutputAmount as BigInt;
  }

  order.save();

  return order as Order;
}

export function saveOrderAutoUpdate(eventData: EventData): Order {
  let key = eventData.getBytes32Item("key")!.toHexString();

  let order = Order.load(key);

  if (order == null) {
    throw new Error("Order not found " + key);
  }

  let sizeDeltaUsd = eventData.getUintItem("nextSizeDeltaUsd");
  let collateralDeltaAmount = eventData.getUintItem(
    "nextCollateralDeltaAmount"
  );

  if (sizeDeltaUsd != null) {
    order.sizeDeltaUsd = sizeDeltaUsd as BigInt;
  }

  if (collateralDeltaAmount != null) {
    order.initialCollateralDeltaAmount = collateralDeltaAmount as BigInt;
  }

  order.save();

  return order as Order;
}
