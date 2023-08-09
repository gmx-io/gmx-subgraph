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
  saveCollectedMarketFeesForPeriod,
  savePositionFeesInfo,
  saveSwapFeesInfo,
} from "./entities/fees";
import { MarketInfo, Order } from "../generated/schema";
import { saveHourlyVolumeByToken, saveVolumeInfo } from "./entities/volume";
import { saveMarketInfo } from "./entities/market";

export function handleEventLog1(event: EventLog1): void {
  let eventName = event.params.eventName;
  let eventData = new EventData(
    event.params.eventData as EventLogEventDataStruct
  );
  let eventId = getIdFromEvent(event);

  if(eventName == "MarketCreated") {
    saveMarketInfo(eventData)
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
    let amountIn = eventData.getUintItem("amountIn")!;
    let tokenInPrice = eventData.getUintItem("tokenInPrice")!;
    let tokenIn = eventData.getAddressItemString("tokenIn")!;
    let tokenOut = eventData.getAddressItemString("tokenOut")!;
    let volumeUsd = amountIn!.times(tokenInPrice!);

    saveSwapInfo(eventData, transaction);
    saveVolumeInfo("swap", transaction.timestamp, volumeUsd);
    saveHourlyVolumeByToken("swap", transaction.timestamp, volumeUsd, tokenIn, tokenOut);
    return;
  }

  if (eventName == "SwapFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let swapFeesInfo = saveSwapFeesInfo(eventData, eventId, transaction);
    saveCollectedMarketFeesForPeriod(
      swapFeesInfo.marketAddress,
      swapFeesInfo.tokenAddress,
      swapFeesInfo.feeAmountForPool,
      swapFeesInfo.feeUsdForPool,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      swapFeesInfo.marketAddress,
      swapFeesInfo.tokenAddress,
      swapFeesInfo.feeAmountForPool,
      swapFeesInfo.feeUsdForPool,
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
    saveCollectedMarketFeesForPeriod(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      positionFeesInfo.feeAmountForPool,
      positionFeesInfo.feeUsdForPool,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketFeesForPeriod(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      positionFeesInfo.feeAmountForPool,
      positionFeesInfo.feeUsdForPool,
      "1d",
      transaction.timestamp
    );
    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralTokenAddress = eventData.getAddressItemString("collateralToken")!;
    let marketAddress = eventData.getAddressItemString("market")!;
    let marketInfo = MarketInfo.load(marketAddress)!;

    savePositionIncrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, eventData.getUintItem("sizeInUsd")!);
    saveHourlyVolumeByToken("margin", transaction.timestamp, eventData.getUintItem("sizeInUsd")!, collateralTokenAddress, marketInfo.indexToken);
    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralTokenAddress = eventData.getAddressItemString("collateralToken")!;
    let marketAddress = eventData.getAddressItemString("market")!;
    let marketInfo = MarketInfo.load(marketAddress)!;
 
    savePositionDecrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, eventData.getUintItem("sizeInUsd")!);
    saveHourlyVolumeByToken("margin", transaction.timestamp, eventData.getUintItem("sizeInUsd")!, collateralTokenAddress, marketInfo.indexToken)
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
