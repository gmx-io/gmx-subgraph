import { ClaimRef, Order } from "../../generated/schema";
import {
  isFundingFeeSettleOrder,
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderExecuted
} from "../entities/claims";
import { orderTypes, saveOrder, saveOrderExecutedState } from "../entities/orders";
import {
  saveOrderCreatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction
} from "../entities/trades";
import { Ctx } from "../utils/eventData";
import { OrderCreatedEventData } from "../utils/eventData/OrderCreatedEventData";

export function handleOrderExecuted(ctx: Ctx): void {
  let order = saveOrderExecutedState(ctx);

  if (order == null) {
    return;
  }

  if (order.orderType == orderTypes.get("MarketSwap") || order.orderType == orderTypes.get("LimitSwap")) {
    saveSwapExecutedTradeAction(ctx, order as Order);
  } else if (
    order.orderType == orderTypes.get("MarketIncrease") ||
    order.orderType == orderTypes.get("LimitIncrease")
  ) {
    savePositionIncreaseExecutedTradeAction(ctx, order as Order);
  } else if (
    order.orderType == orderTypes.get("MarketDecrease") ||
    order.orderType == orderTypes.get("LimitDecrease") ||
    order.orderType == orderTypes.get("StopLossDecrease") ||
    order.orderType == orderTypes.get("Liquidation")
  ) {
    if (ClaimRef.load(order.id)) {
      saveClaimActionOnOrderExecuted(ctx);
    } else {
      savePositionDecreaseExecutedTradeAction(ctx, order as Order);
    }
  }
}

export function handleOrderCreated(ctx: Ctx): void {
  let data = new OrderCreatedEventData(ctx);
  let order = saveOrder(data, ctx.transaction);

  if (isFundingFeeSettleOrder(order)) {
    saveClaimActionOnOrderCreated(ctx);
  } else {
    saveOrderCreatedTradeAction(ctx, order);
  }
}
