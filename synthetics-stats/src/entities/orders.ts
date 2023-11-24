import { Order, Transaction } from "../../generated/schema";
import { Ctx } from "../utils/eventData";
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

export function saveOrder(ctx: OrderCreatedEventData, transaction: Transaction): Order {
  let key = ctx.key;

  let order = new Order(key);

  order.account = ctx.account;
  order.receiver = ctx.receiver;
  order.callbackContract = ctx.callbackContract;
  order.marketAddress = ctx.market;
  order.swapPath = ctx.swapPath || [];
  order.initialCollateralTokenAddress = ctx.initialCollateralToken;
  order.sizeDeltaUsd = ctx.sizeDeltaUsd;
  order.initialCollateralDeltaAmount = ctx.initialCollateralDeltaAmount;
  order.triggerPrice = ctx.triggerPrice;
  order.acceptablePrice = ctx.acceptablePrice;
  order.callbackGasLimit = ctx.callbackGasLimit;
  order.minOutputAmount = ctx.minOutputAmount;
  order.executionFee = ctx.executionFee;
  order.updatedAtBlock = ctx.updatedAtBlock;
  order.orderType = ctx.orderType;
  order.isLong = ctx.isLong;
  order.shouldUnwrapNativeToken = ctx.shouldUnwrapNativeToken;

  if (ctx.isFrozen) {
    order.status = "Frozen";
  } else {
    order.status = "Created";
  }

  order.createdTxn = transaction.id;
  order.save();

  return order;
}

export function saveOrderCancelledState(ctx: Ctx, transaction: Transaction): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Cancelled";
  order.cancelledReason = ctx.getStringItem("reason");
  order.cancelledReasonBytes = ctx.getBytesItem("reasonBytes");

  order.cancelledTxn = transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderExecutedState(ctx: Ctx): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Executed";
  order.executedTxn = ctx.transaction.id;

  order.save();

  return order as Order;
}

export function saveOrderFrozenState(ctx: Ctx): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.status = "Frozen";
  order.frozenReason = ctx.getStringItem("reason");
  order.frozenReasonBytes = ctx.getBytesItem("reasonBytes");

  order.save();

  return order as Order;
}

export function saveOrderUpdate(ctx: Ctx): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = ctx.getUintItem("sizeDeltaUsd");
  order.triggerPrice = ctx.getUintItem("triggerPrice");
  order.acceptablePrice = ctx.getUintItem("acceptablePrice");
  order.minOutputAmount = ctx.getUintItem("minOutputAmount");

  order.save();

  return order as Order;
}

export function saveOrderSizeDeltaAutoUpdate(ctx: Ctx): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.sizeDeltaUsd = ctx.getUintItem("nextSizeDeltaUsd");

  order.save();

  return order as Order;
}

export function saveOrderCollateralAutoUpdate(ctx: Ctx): Order | null {
  let key = ctx.getBytes32Item("key").toHexString();

  let order = Order.load(key);

  if (order == null) {
    return null;
  }

  order.initialCollateralDeltaAmount = ctx.getUintItem("nextCollateralDeltaAmount");

  order.save();

  return order as Order;
}
