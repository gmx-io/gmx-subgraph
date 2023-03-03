import { ethereum } from "@graphprotocol/graph-ts";
import {
  Order,
  PositionDecrease,
  PositionIncrease,
  TradeAction,
  Transaction,
} from "../../generated/schema";

export function saveOrderCreatedTradeAction(
  eventId: string,
  orderId: string,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, orderId);

  tradeAction.eventName = "OrderCreated";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderCancelledTradeAction(
  eventId: string,
  orderId: string,
  reason: string,
  tranaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, orderId);

  tradeAction.eventName = "OrderCancelled";
  tradeAction.reason = reason;
  tradeAction.transaction = tranaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderExecutedTradeAction(
  eventId: string,
  orderId: string,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, orderId);

  tradeAction.eventName = "OrderExecuted";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderUpdatedTradeAction(
  eventId: string,
  orderId: string,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, orderId);

  tradeAction.eventName = "OrderUpdated";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderFrozenTradeAction(
  eventId: string,
  orderId: string,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, orderId);

  tradeAction.eventName = "OrderFrozen";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function savePositionIncreaseTradeAction(
  eventId: string,
  positionIncreaseId: string,
  transaction: Transaction
): TradeAction {
  let positionIncrease = PositionIncrease.load(positionIncreaseId);

  if (positionIncrease == null) {
    throw new Error("PositionIncrease not found " + positionIncreaseId);
  }

  let tradeAction = new TradeAction(eventId);

  tradeAction.eventName = "PositionIncrease";

  tradeAction.account = positionIncrease.account;
  tradeAction.marketAddress = positionIncrease.marketAddress;
  tradeAction.initialCollateralTokenAddress =
    positionIncrease.collateralTokenAddress;

  tradeAction.sizeDeltaUsd = positionIncrease.sizeDeltaUsd;
  tradeAction.initialCollateralDeltaAmount =
    positionIncrease.collateralDeltaAmount;

  tradeAction.executionPrice = positionIncrease.executionPrice;

  tradeAction.orderType = positionIncrease.orderType;

  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function savePositionDecreaseTradeAction(
  eventId: string,
  positionDecreaseId: string,
  transaction: Transaction
): TradeAction {
  let positionDecrease = PositionDecrease.load(positionDecreaseId);

  if (positionDecrease == null) {
    throw new Error("PositionDecrease not found " + positionDecreaseId);
  }

  let tradeAction = new TradeAction(eventId);

  tradeAction.eventName = "PositionDecrease";

  tradeAction.account = positionDecrease.account;
  tradeAction.marketAddress = positionDecrease.marketAddress;
  tradeAction.initialCollateralTokenAddress =
    positionDecrease.collateralTokenAddress;

  tradeAction.sizeDeltaUsd = positionDecrease.sizeDeltaUsd;
  tradeAction.initialCollateralDeltaAmount =
    positionDecrease.collateralDeltaAmount;

  tradeAction.executionPrice = positionDecrease.executionPrice;

  tradeAction.orderType = positionDecrease.orderType;

  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function getTradeActionFromOrder(
  eventId: string,
  orderId: string
): TradeAction {
  let order = Order.load(orderId);

  if (order == null) {
    throw new Error("Order not found " + orderId);
  }

  let tradeAction = new TradeAction(eventId);

  tradeAction.account = order.account;
  tradeAction.marketAddress = order.marketAddress;
  tradeAction.swapPath = order.swapPath;
  tradeAction.initialCollateralTokenAddress =
    order.initialCollateralTokenAddress;

  tradeAction.initialCollateralDeltaAmount = order.initialCollateralDeltaAmount;
  tradeAction.sizeDeltaUsd = order.sizeDeltaUsd;
  tradeAction.triggerPrice = order.triggerPrice;
  tradeAction.acceptablePrice = order.acceptablePrice;
  tradeAction.minOutputAmount = order.minOutputAmount;

  tradeAction.orderType = order.orderType;
  tradeAction.shouldUnwrapNativeToken = order.shouldUnwrapNativeToken;
  tradeAction.isLong = order.isLong;

  return tradeAction;
}
