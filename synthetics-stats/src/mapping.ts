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
  handlePositionIncrease,
} from "./handlers/positions";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderExecutedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseTradeAction,
  savePositionIncreaseTradeAction,
  saveSwapExecutedTradeAction,
} from "./handlers/trades";
import { getIdFromEvent, getOrCreateTransaction } from "./handlers/common";
import { EventData } from "./utils/eventData";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { handleSwapInfo } from "./handlers/swaps";

export function handleEventLog(event: EventLog): void {
  return;
}

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
      order.orderType == BigInt.fromI32(0) ||
      order.orderType == BigInt.fromI32(1)
    ) {
      saveSwapExecutedTradeAction(eventId, order, transaction);
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

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let positionIncrease = handlePositionIncrease(
      eventId,
      eventData,
      transaction
    );
    savePositionIncreaseTradeAction(eventId, positionIncrease, transaction);

    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let positionDecrease = handlePositionDecrease(
      eventId,
      eventData,
      transaction
    );
    savePositionDecreaseTradeAction(eventId, positionDecrease, transaction);

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
