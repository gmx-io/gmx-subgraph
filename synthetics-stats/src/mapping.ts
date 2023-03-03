import {
  EventLog,
  EventLog1,
  EventLog2,
  EventLogEventDataAddressItemsItemsStruct,
  EventLogEventDataStruct,
} from "../generated/EventEmitter/EventEmitter";
import {
  saveOrderCancellation,
  saveOrder,
  saveOrderExecution,
  saveOrderUpdate,
  saveOrderFrozen,
  saveOrderAutoUpdate,
} from "./handlers/orders";
import {
  savePositionDecrease,
  savePositionIncrease,
} from "./handlers/positions";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderExecutedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseTradeAction,
  savePositionIncreaseTradeAction,
} from "./handlers/trades";
import { getIdFromEvent, getOrCreateTransaction } from "./handlers/common";
import { EventData } from "./utils/eventData";

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
    let order = saveOrderExecution(eventData, transaction);
    saveOrderExecutedTradeAction(eventId, order.id, transaction);

    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderCancellation(eventData, transaction);
    saveOrderCancelledTradeAction(
      eventId,
      order.id,
      order.cancelledReason as string,
      transaction
    );
    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderUpdate(eventData);
    saveOrderUpdatedTradeAction(eventId, order.id, transaction);
    return;
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    saveOrderAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    saveOrderAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = saveOrderFrozen(eventData);
    saveOrderFrozenTradeAction(eventId, order.id, transaction);
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let positionIncrease = savePositionIncrease(
      eventId,
      eventData,
      transaction
    );
    savePositionIncreaseTradeAction(eventId, positionIncrease.id, transaction);

    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let positionDecrease = savePositionDecrease(
      eventId,
      eventData,
      transaction
    );
    savePositionDecreaseTradeAction(eventId, positionDecrease.id, transaction);

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
    saveOrderCreatedTradeAction(eventId, order.id, tranaction);

    return;
  }
}
