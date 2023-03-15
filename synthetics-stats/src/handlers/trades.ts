import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Order,
  PositionDecrease,
  PositionFeesInfo,
  PositionIncrease,
  SwapInfo,
  TradeAction,
  Transaction,
} from "../../generated/schema";
import { getSwapInfoId } from "./swaps";

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

export function saveSwapExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);

  let swapPath = order.swapPath!;

  let lastSwapAddress: string = swapPath[swapPath.length - 1];

  let swapInfoId = getSwapInfoId(order.id, lastSwapAddress);

  let swapInfo = SwapInfo.load(swapInfoId);

  if (swapInfo == null) {
    throw new Error("Swap info not found " + swapInfoId);
  }

  tradeAction.eventName = "OrderExecuted";

  tradeAction.executionAmountOut = swapInfo.amountOut;
  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function savePositionIncreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = getTradeActionFromOrder(eventId, order);
  let positionIncrease = PositionIncrease.load(order.id);

  if (positionIncrease == null) {
    throw new Error("PositionIncrease not found " + order.id);
  }

  tradeAction.eventName = "OrderExecuted";

  tradeAction.executionPrice = positionIncrease.executionPrice;

  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function savePositionDecreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction
): TradeAction {
  let tradeAction = new TradeAction(eventId);
  let positionDecrease = PositionDecrease.load(order.id);
  let positionFeesInfo = PositionFeesInfo.load(order.id);

  if (positionDecrease == null) {
    throw new Error("PositionDecrease not found " + order.id);
  }

  // if (positionFeesInfo == null) {
  //   throw new Error("PositionFeesInfo not found " + order.id);
  // }

  tradeAction.eventName = "OrderExecuted";

  tradeAction.executionPrice = positionDecrease.executionPrice;

  // tradeAction.collateralTokenPriceMin =
  //   positionFeesInfo.collateralTokenPriceMin;
  // tradeAction.collateralTokenPriceMax =
  //   positionFeesInfo.collateralTokenPriceMax;

  tradeAction.priceImpactDiffUsd = positionDecrease.priceImpactDiffUsd;

  // tradeAction.positionFeeAmount = positionFeesInfo.positionFeeAmount;
  // tradeAction.borrowingFeeAmount = positionFeesInfo.borrowingFeeAmount;
  // tradeAction.fundingFeeAmount = positionFeesInfo.fundingFeeAmount;

  tradeAction.transaction = transaction.id;

  tradeAction.save();

  return tradeAction;
}

export function getTradeActionFromOrder(
  eventId: string,
  order: Order
): TradeAction {
  let tradeAction = new TradeAction(eventId);

  tradeAction.orderKey = order.id;

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
