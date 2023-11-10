import { ClaimRef, Order } from "../../generated/schema";
import { saveClaimActionOnOrderExecuted } from "../entities/claims";
import { orderTypes, saveOrderExecutedState } from "../entities/orders";
import {
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction
} from "../entities/trades";
import { EventData } from "../utils/eventData";

export function handleOrderExecuted(eventData: EventData): void {
  let order = saveOrderExecutedState(eventData);

  if (order == null) {
    return;
  }

  if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
    saveSwapExecutedTradeAction(eventData, order as Order);
  } else if (
    order.orderType == orderTypes.get("MarketIncrease") ||
    order.orderType == orderTypes.get("LimitIncrease")
  ) {
    savePositionIncreaseExecutedTradeAction(eventData, order as Order);
  } else if (
    order.orderType == orderTypes.get("MarketDecrease") ||
    order.orderType == orderTypes.get("LimitDecrease") ||
    order.orderType == orderTypes.get("StopLossDecrease") ||
    order.orderType == orderTypes.get("Liquidation")
  ) {
    if (ClaimRef.load(order.id)) {
      saveClaimActionOnOrderExecuted(eventData);
    } else {
      savePositionDecreaseExecutedTradeAction(eventData, order as Order);
    }
  }
}
