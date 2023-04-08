import {
  EventLog,
  EventLog1,
  EventLog2,
  EventLogEventDataAddressItemsItemsStruct,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import {
  saveOrderCancelledState,
  saveOrder,
  saveOrderExecutedState,
  saveOrderUpdate,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderCollateralAutoUpdate,
  orderTypes,
} from "./entities/orders";
import {
  savePositionDecrease,
  savePositionIncrease,
} from "./entities/positions";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction,
} from "./entities/trades";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import { EventData } from "./utils/eventData";
import { Bytes } from "@graphprotocol/graph-ts";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import { handleCollateralClaimAction as saveCollateralClaimedAction } from "./entities/claims";
import {
  saveCollectedPositionFeesForPeriod,
  savePositionFeesInfo,
} from "./entities/fees";
import { PoolAmountUpdate } from "../generated/schema";

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderExecuted") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderExecutedState(eventData, transaction);

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      saveSwapExecutedTradeAction(eventId, order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      savePositionIncreaseExecutedTradeAction(eventId, order, transaction);
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      savePositionDecreaseExecutedTradeAction(eventId, order, transaction);
    }
    return;
  }

  if (eventName == "PoolAmountUpdated") {
    let transaction = getOrCreateTransaction(event);
    let entity = new PoolAmountUpdate(eventId);
    entity.transaction = transaction.id;
    entity.marketAddress = eventData.getAddressItemString("market")!;
    entity.tokenAddress = eventData.getAddressItemString("token")!;
    entity.delta = eventData.getIntItem("delta")!;
    entity.nextValue = eventData.getUintItem("nextValue")!;

    entity.save();
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancelledState(eventData, transaction);
    saveOrderCancelledTradeAction(
      eventId,
      order,
      order.cancelledReason as string,
      order.cancelledReasonBytes as Bytes,
      transaction
    );
    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderUpdate(eventData);
    saveOrderUpdatedTradeAction(eventId, order, transaction);
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
    saveOrderFrozenTradeAction(
      eventId,
      order,
      order.frozenReason as string,
      order.frozenReasonBytes as Bytes,
      transaction
    );
    return;
  }

  if (eventName == "SwapInfo") {
    let transaction = getOrCreateTransaction(event);
    saveSwapInfo(eventData, transaction);
    return;
  }

  if (eventName == "PositionFeesInfo") {
    let transaction = getOrCreateTransaction(event);
    let positionFeesInfo = savePositionFeesInfo(
      eventData,
      "PositionFeesInfo",
      transaction
    );
    saveCollectedPositionFeesForPeriod(
      positionFeesInfo,
      "1d",
      transaction.timestamp
    );
    saveCollectedPositionFeesForPeriod(
      positionFeesInfo,
      "1h",
      transaction.timestamp
    );
    return;
  }

  if (eventName == "PositionFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let positionFeesInfo = savePositionFeesInfo(
      eventData,
      "PositionFeesCollected",
      transaction
    );
    saveCollectedPositionFeesForPeriod(
      positionFeesInfo,
      "1d",
      transaction.timestamp
    );
    saveCollectedPositionFeesForPeriod(
      positionFeesInfo,
      "1h",
      transaction.timestamp
    );
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    savePositionIncrease(eventData, transaction);
    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    savePositionDecrease(eventData, transaction);
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
