import {
  EventLog,
  EventLog1,
  EventLog2,
  EventLogEventDataAddressItemsItemsStruct,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import {
  handleOrderCancelled,
  handleOrderCreated,
  handleOrderExecuted,
  handleOrderUpdate,
  handleOrderFrozen,
  handleOrderSizeDeltaAutoUpdate,
  handleOrderCollateralAutoUpdate,
} from "./handlers/orders";
import {
  handlePositionDecrease,
  handlePositionFeesInfo,
  handlePositionIncrease,
} from "./handlers/positions";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderExecutedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction,
} from "./handlers/trades";
import { getIdFromEvent, getOrCreateTransaction } from "./handlers/common";
import { EventData } from "./utils/eventData";
import { Bytes } from "@graphprotocol/graph-ts";
import { handleSwapInfo } from "./handlers/swaps";
import { orderTypes } from "./utils/orders";

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
  let eventId = getIdFromEvent(event);

  if (eventName == "OrderExecuted") {
    let transaction = getOrCreateTransaction(event);
    let order = handleOrderExecuted(eventData, transaction);

    saveOrderExecutedTradeAction(eventId, order, transaction);

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

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = handleOrderCancelled(eventData, transaction);
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
    let order = handleOrderUpdate(eventData);
    saveOrderUpdatedTradeAction(eventId, order, transaction);
    return;
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    handleOrderSizeDeltaAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    handleOrderCollateralAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = handleOrderFrozen(eventData);
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
    handleSwapInfo(eventData, transaction);

    return;
  }

  if (eventName == "PositionFeesCollected" || eventName == "PositionFeesInfo") {
    let transaction = getOrCreateTransaction(event);
    handlePositionFeesInfo(eventData, transaction);

    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    handlePositionIncrease(eventData, transaction);

    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    handlePositionDecrease(eventData, transaction);

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
    let order = handleOrderCreated(eventData, tranaction);
    saveOrderCreatedTradeAction(eventId, order, tranaction);

    return;
  }
}
