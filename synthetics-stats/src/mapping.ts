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
import { Bytes, log } from "@graphprotocol/graph-ts";
import { handleSwapInfo as saveSwapInfo } from "./entities/swaps";
import { handleCollateralClaimAction as saveCollateralClaimedAction } from "./entities/claims";
import {
  getCollectedMarketFees,
  getMarketAPRParams,
  saveCollectedMarketPositionsFeesForPeriod,
  saveCollectedMarketPositionsFeesTotal,
  saveCollectedMarketSwapFeesForPeriod,
  saveCollectedMarketSwapFeesTotal,
  savePositionFeesInfo,
  saveSwapFeesInfo,
  updateCollectedMarketFeesAprParamsForAllPeriods,
} from "./entities/fees";
import { MarketInfo, Order } from "../generated/schema";
import {
  savePositionVolumeInfo,
  saveSwapVolumeInfo,
  saveVolumeInfo,
} from "./entities/volume";
import {
  saveMarketInfo,
  saveMarketPoolValueInfo,
} from "./entities/markets";
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
    log.info("orderKey xoxo: {}", [order.account]);
    saveSwapInfo(eventData, transaction);
    saveVolumeInfo("swap", transaction.timestamp, volumeUsd);
    saveSwapVolumeInfo(transaction.timestamp, tokenIn, tokenOut, volumeUsd);
    saveUserStat("swap", order.account, transaction.timestamp);
    return;
  }

  if (eventName == "MarketPoolValueInfo") {
    let marketPoolValueInfo = saveMarketPoolValueInfo(eventData);
    let marketInfo = MarketInfo.load(marketPoolValueInfo.marketAddress)!;

    let timestamp = event.block.timestamp.toI32();
    let totalFeesForLongToken = getCollectedMarketFees(
      marketInfo.marketToken,
      marketInfo.longToken,
      timestamp,
      "total"
    );
    if (totalFeesForLongToken != null && totalFeesForLongToken._lastFeeUsdForPool != null) {
      let marketAprParams = getMarketAPRParams(
        marketInfo.marketToken,
        totalFeesForLongToken._lastFeeUsdForPool!
      );
      updateCollectedMarketFeesAprParamsForAllPeriods(
        marketInfo.marketToken,
        marketInfo.longToken,
        marketAprParams,
        timestamp,
      );
      totalFeesForLongToken._lastFeeUsdForPool = null;
      totalFeesForLongToken.save();
    }

    let totalFeesForShortToken = getCollectedMarketFees(
      marketInfo.marketToken,
      marketInfo.shortToken,
      timestamp,
      "total"
    );
    if (totalFeesForShortToken != null && totalFeesForShortToken._lastFeeUsdForPool != null) {
      let marketAprParams = getMarketAPRParams(
        marketInfo.marketToken,
        totalFeesForShortToken._lastFeeUsdForPool!
      );
      updateCollectedMarketFeesAprParamsForAllPeriods(
        marketInfo.marketToken,
        marketInfo.shortToken,
        marketAprParams,
        timestamp,
      );
      totalFeesForShortToken._lastFeeUsdForPool = null;
      totalFeesForShortToken.save();
    }
    
    return;
  }

  if (eventName == "SwapFeesCollected") {
    let transaction = getOrCreateTransaction(event);
    let swapFeesInfo = saveSwapFeesInfo(eventData, eventId, transaction);
    let action = eventData.getStringItem("action")!;
    let shouldSetLastFeeUsdForPool = action == "deposit";
    let totalFees = saveCollectedMarketSwapFeesTotal(
      swapFeesInfo,
      transaction.timestamp,
      shouldSetLastFeeUsdForPool
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
    
    if (action != "deposit") {
      // only update APR params for withdrawals and swaps
      // for deposit it should be updated in MarketPoolValueInfo event
      let marketAprParams = getMarketAPRParams(
        swapFeesInfo.marketAddress,
        swapFeesInfo.feeUsdForPool
      );
      updateCollectedMarketFeesAprParamsForAllPeriods(
        swapFeesInfo.marketAddress,
        swapFeesInfo.tokenAddress,
        marketAprParams,
        transaction.timestamp,
      );
    }
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
    let totalFees = saveCollectedMarketPositionsFeesTotal(
      positionFeesInfo,
      transaction.timestamp,
      false
    );
    saveCollectedMarketPositionsFeesForPeriod(
      positionFeesInfo,
      totalFees,
      "1h",
      transaction.timestamp
    );
    saveCollectedMarketPositionsFeesForPeriod(
      positionFeesInfo,
      totalFees,
      "1d",
      transaction.timestamp
    );

    let marketAprParams = getMarketAPRParams(
      positionFeesInfo.marketAddress,
      positionFeesInfo.feeUsdForPool
    );
    updateCollectedMarketFeesAprParamsForAllPeriods(
      positionFeesInfo.marketAddress,
      positionFeesInfo.collateralTokenAddress,
      marketAprParams,
      transaction.timestamp,
    );

    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = getOrCreateTransaction(event);
    let collateralToken = eventData.getAddressItemString("collateralToken")!;
    let account = eventData.getAddressItemString("account")!;
    let marketToken = eventData.getAddressItemString("market")!;
    let sizeInUsd = eventData.getUintItem("sizeInUsd")!;

    savePositionIncrease(eventData, transaction);
    saveVolumeInfo("margin", transaction.timestamp, sizeInUsd);
    savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      sizeInUsd
    );
    saveUserStat("position", account, transaction.timestamp);
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
    saveUserStat("position", account, transaction.timestamp);
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
