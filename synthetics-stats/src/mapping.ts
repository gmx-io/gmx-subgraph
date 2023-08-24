import { Bytes } from "@graphprotocol/graph-ts";
import {
  EventLog1,
  EventLog2,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import { Order } from "../generated/schema";
import { handleCollateralClaimAction as saveCollateralClaimedAction } from "./entities/claims";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import {
  saveCollectedMarketPositionFeesForPeriod,
  saveCollectedMarketPositionFeesTotal,
  saveCollectedMarketSwapFeesForPeriod,
  saveCollectedMarketSwapFeesTotal,
  savePositionFeesInfo,
  saveSwapFeesInfo,
} from "./entities/fees";
import { saveMarketInfo } from "./entities/markets";
import {
  orderTypes,
  saveOrder,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate,
} from "./entities/orders";
import {
  savePositionDecrease,
  savePositionIncrease,
} from "./entities/positions";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction,
} from "./entities/trades";
import {
  savePositionVolumeInfo,
  saveSwapVolumeInfo,
  saveVolumeInfo,
} from "./entities/volume";
import { EventData } from "./utils/eventData";
import { saveUserStat } from "./entities/users";

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
  let eventId = getIdFromEvent(event);

  if (eventName == "MarketCreated") {
    saveMarketInfo(eventData);
    return;
  }

  if (eventName == "OrderExecuted") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderExecutedState(eventData, transaction);

    if (order == null) {
      return;
    }

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      saveSwapExecutedTradeAction(eventId, order as Order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction
      );
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction
      );
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(eventData, transaction);
    if (order !== null) {
      saveOrderCancelledTradeAction(
        eventId,
        order as Order,
        order.cancelledReason as string,
        order.cancelledReasonBytes as Bytes,
        transaction
      );
    }

    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderUpdate(eventData);
    if (order !== null) {
      saveOrderUpdatedTradeAction(eventId, order as Order, transaction);
    }

    return;
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    saveOrderSizeDeltaAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    saveOrderCollateralAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozenState(eventData);

    if (order == null) {
      return;
    }

    saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    );
    return;
  }

  if (eventName == "SwapInfo") {
    let transaction = getOrCreateTransaction(event);
    let tokenIn = eventData.getAddressItemString("tokenIn")!;
    let tokenOut = eventData.getAddressItemString("tokenOut")!;
    let amountIn = eventData.getUintItem("amountIn")!;
    let tokenInPrice = eventData.getUintItem("tokenInPrice")!;
    let volumeUsd = amountIn!.times(tokenInPrice!);
    let orderKey = eventData.getBytes32Item("orderKey")!.toHexString();
    let order = Order.load(orderKey)!;

    saveSwapInfo(eventData, transaction);
    saveVolumeInfo("swap", transaction.timestamp, volumeUsd);
    saveSwapVolumeInfo(transaction.timestamp, tokenIn, tokenOut, volumeUsd);
    saveUserStat("swap", order.account, transaction.timestamp);
    return;
  }

  if (eventName == "SwapFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let swapFeesInfo = saveSwapFeesInfo(eventData, eventId, transaction);

    let totalFees = saveCollectedMarketSwapFeesTotal(
      swapFeesInfo,
      transaction.timestamp
    );
    saveCollectedMarketSwapFeesForPeriod(
      swapFeesInfo,
      totalFees,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketSwapFeesForPeriod(
      swapFeesInfo,
      totalFees,
      "1d",
      transaction.timestamp
    );
    return;
  }

  // Only for liquidations if remaining collateral is not sufficient to pay the fees
  if (eventName == "PositionFeesInfo") {
    let transaction = getOrCreateTransaction(event);
    savePositionFeesInfo(eventData, "PositionFeesInfo", transaction);

    return;
  }

  if (eventName == "PositionFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let positionFeesInfo = savePositionFeesInfo(
      eventData,
      "PositionFeesCollected",
      transaction
    );
    let totalFees = saveCollectedMarketPositionFeesTotal(
      positionFeesInfo,
      transaction.timestamp
    );
    saveCollectedMarketPositionFeesForPeriod(
      positionFeesInfo,
      totalFees,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketPositionFeesForPeriod(
      positionFeesInfo,
      totalFees,
      "1d",
      transaction.timestamp
    );
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = eventData.getAddressItemString("collateralToken")!;
    let marketToken = eventData.getAddressItemString("market")!;
    let sizeInUsd = eventData.getUintItem("sizeInUsd")!;
    let account = eventData.getAddressItemString("account")!;

    savePositionIncrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeInUsd);
    savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      sizeInUsd
    );
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = eventData.getAddressItemString("collateralToken")!;
    let marketToken = eventData.getAddressItemString("market")!;
    let sizeInUsd = eventData.getUintItem("sizeInUsd")!;
    let account = eventData.getAddressItemString("account")!;

    savePositionDecrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeInUsd);
    savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      sizeInUsd
    );
    saveUserStat("margin", account, transaction.timestamp);
    return;
  }

  if (eventName == "FundingFeesClaimed") {
    let transaction = getOrCreateTransaction(event);
    saveCollateralClaimedAction(eventData, transaction, "ClaimFunding");
    return;
  }

  if (eventName === "CollateralClaimed") {
    let transaction = getOrCreateTransaction(event);
    saveCollateralClaimedAction(eventData, transaction, "ClaimPriceImpact");
    return;
  }
}

export function handleEventLog2(event: EventLog2): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderCreated") {
    let tranaction = getOrCreateTransaction(event);
    let order = saveOrder(eventData, tranaction);
    saveOrderCreatedTradeAction(eventId, order, tranaction);
    return;
  }
}
