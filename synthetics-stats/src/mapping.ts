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
  handleOrderAutoUpdate,
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
    let order = handleOrderExecuted(eventData, transaction);
    saveOrderExecutedTradeAction(eventId, order, transaction);

    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = getOrCreateTransaction(event);
    let order = handleOrderCancelled(eventData, transaction);
    saveOrderCancelledTradeAction(
      eventId,
      order,
      order.cancelledReason as string,
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
    handleOrderAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    handleOrderAutoUpdate(eventData);
    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = getOrCreateTransaction(event);
    let order = handleOrderFrozen(eventData);
    saveOrderFrozenTradeAction(
      eventId,
      order,
      order.frozenReason as string,
      transaction
    );
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
