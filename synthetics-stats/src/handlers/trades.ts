import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Order,
  PositionDecrease,
  PositionIncrease,
  TradeAction,
  Transaction,
} from "../../generated/schema";

export function saveOrderCreatedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  tradeAction.eventName = "OrderCreated";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderCancelledTradeAction(
  eventId: string,
  order: Order,
  reason: string,
  reasonBytes: Bytes,
  tranaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  tradeAction.eventName = "OrderCancelled";
  tradeAction.reason = reason;
  tradeAction.reasonBytes = reasonBytes;
  tradeAction.transaction = tranaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  tradeAction.eventName = "OrderExecuted";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderUpdatedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  tradeAction.eventName = "OrderUpdated";
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function saveOrderFrozenTradeAction(
  eventId: string,
  order: Order,
  reason: string,
  reasonBytes: Bytes,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  tradeAction.eventName = "OrderFrozen";
  tradeAction.reason = reason;
  tradeAction.reasonBytes = reasonBytes;
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function savePositionIncreaseTradeAction(
  eventId: string,
  positionIncrease: PositionIncrease,
  transaction: Transaction
): TradeAction {
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
  positionDecrease: PositionDecrease,
  transaction: Transaction
): TradeAction {
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
  order: Order
): TradeAction {
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
